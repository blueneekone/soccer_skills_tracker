'use strict';

const crypto = require('crypto');
const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineString, defineSecret} = require('firebase-functions/params');
const stripe = require('stripe');

const {normEmail} = require('../utils/formatters');
const {
  assertDirectorOrSuper,
  assertCanSecureAddPlayer,
} = require('../middleware/authBouncers');
const REGION = 'us-east1';

/** Lazy Firestore accessor — defers init until first call. */
const db = () => admin.firestore();

// ── Affinity secrets ──────────────────────────────────────────────────────────
const AFFINITY_WEBHOOK_HMAC_SECRET = defineSecret('AFFINITY_WEBHOOK_HMAC_SECRET');

// ── Stripe secrets / params ───────────────────────────────────────────────────
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const STRIPE_PRICE_TUTOR = defineString('STRIPE_PRICE_TUTOR', {default: ''});
const STRIPE_PRICE_TEAM = defineString('STRIPE_PRICE_TEAM', {default: ''});
const STRIPE_PRICE_CLUB = defineString('STRIPE_PRICE_CLUB', {default: ''});
const STRIPE_PRICE_RECRUITER = defineString('STRIPE_PRICE_RECRUITER', {default: ''});

// ── Private helpers: scheduled seat cleanup ───────────────────────────────────

async function reconcileReservedSeatsWithoutPendingInvites() {
  const snap = await db().collection('license_entitlements')
      .where('reserved_seats', '>', 0)
      .limit(200)
      .get();

  let fixed = 0;
  for (const entDoc of snap.docs) {
    const clubId = entDoc.id;
    const pending = await db().collection('coach_invites')
        .where('clubId', '==', clubId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();
    if (pending.empty) {
      await db().collection('license_entitlements').doc(clubId).set(
          {
            reserved_seats: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'system:reconcileReservedSeats',
          },
          {merge: true},
      );
      fixed++;
    }
  }
  if (fixed > 0) {
    logger.info(
        `reconcileReservedSeatsWithoutPendingInvites: reset ${fixed} club(s).`,
    );
  }
}

// ── Private helpers: Affinity eligibility ─────────────────────────────────────

/**
 * @param {number} status
 * @param {string} msg
 */
function throwAffinityHttp(status, msg) {
  const err = new Error(msg);
  err.status = status;
  throw err;
}

/**
 * @param {string} eventId
 * @return {string}
 */
function sanitizeAffinityEventDocId(eventId) {
  const s = String(eventId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const out = s.slice(0, 400);
  return out || 'invalid_event';
}

/**
 * @param {string} teamId
 * @param {string|null} extId
 * @param {string|null} emailKey
 * @param {string} displayName
 * @return {string}
 */
function makeEligibilityDocId(teamId, extId, emailKey, displayName) {
  let part = '';
  if (extId) part = 'ext_' + extId;
  else if (emailKey) part = 'em_' + emailKey;
  else {
    const h = crypto.createHash('sha256')
        .update(String(displayName || '') + '|' + teamId)
        .digest('hex')
        .slice(0, 16);
    part = 'nm_' + h;
  }
  const safe = part.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 220);
  return ('elig_' + teamId + '_' + safe).slice(0, 750);
}

/**
 * @param {string} teamId
 * @param {string|null} extId
 * @param {string|null} emailKey
 * @param {string} displayName
 * @return {string}
 */
function makeRosterLinkDocId(teamId, extId, emailKey, displayName) {
  let part = '';
  if (extId) part = 'ext_' + extId;
  else if (emailKey) part = 'em_' + emailKey;
  else {
    const h = crypto.createHash('sha256')
        .update(String(displayName || '') + '|' + teamId)
        .digest('hex')
        .slice(0, 16);
    part = 'nm_' + h;
  }
  const safe = part.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 220);
  return ('rlink_' + teamId + '_' + safe).slice(0, 750);
}

/**
 * @param {string} sidCode
 * @param {string} [seasonExternalId]
 * @return {!Promise<!Object>}
 */
async function resolveTeamBySidCode(sidCode, seasonExternalId) {
  const code = typeof sidCode === 'string' ? sidCode.trim() : '';
  if (!code) {
    throwAffinityHttp(400, 'sidCode is required in payload');
  }
  const snap = await db().collection('teams')
      .where('externalSidCode', '==', code)
      .limit(25)
      .get();
  if (snap.empty) {
    throwAffinityHttp(
        404,
        'No team found with externalSidCode; set teams.externalSidCode first.',
    );
  }
  if (snap.size === 1) {
    const d = snap.docs[0];
    const t = d.data();
    return {teamId: d.id, clubId: t.clubId || null};
  }
  const season = typeof seasonExternalId === 'string' ?
    seasonExternalId.trim() :
    '';
  if (!season) {
    throwAffinityHttp(
        409,
        'Multiple teams match sidCode; include seasonExternalId in payload.',
    );
  }
  for (const d of snap.docs) {
    const t = d.data();
    if (t.externalSeasonId === season) {
      return {teamId: d.id, clubId: t.clubId || null};
    }
  }
  throwAffinityHttp(
      409,
      'Multiple teams match sidCode; no team has matching externalSeasonId.',
  );
}

/**
 * Fail-closed eligibility row for one player payload object.
 * @param {Record<string, unknown>} p
 * @param {string} teamId
 * @param {string|null} clubId
 * @param {string} seasonExternalId
 * @param {string} sidCode
 * @param {string} sourceTag
 * @param {string} eventId
 * @return {!Promise<!Object>}
 */
async function buildEligibilityRow(
    p, teamId, clubId, seasonExternalId, sidCode, sourceTag, eventId,
) {
  const emailKey = normEmail(
      typeof p.email === 'string' ? p.email : null,
  );
  const extId =
      typeof p.externalMemberId === 'string' && p.externalMemberId.trim() ?
        p.externalMemberId.trim() :
        null;
  const displayName =
      typeof p.displayName === 'string' ? p.displayName.trim() : '';

  const identityVerified = !!(emailKey || extId);
  const identityStatus = identityVerified ? 'verified' : 'unverified';

  const safeSportVerified =
      p.safeSport === true || p.safeSportVerified === true;
  const concussionClearanceVerified =
      p.concussionClearance === true ||
      p.concussionClearanceVerified === true;

  const rawGb =
      typeof p.governingBodyStatus === 'string' ?
        p.governingBodyStatus.trim().toLowerCase() :
        '';
  let governingBodyStatus = 'unknown';
  if (rawGb === 'clear') governingBodyStatus = 'clear';
  else if (rawGb === 'red_card' || rawGb === 'red card') {
    governingBodyStatus = 'red_card';
  } else if (rawGb === 'suspended') governingBodyStatus = 'suspended';
  const governingBodyClear = governingBodyStatus === 'clear';

  let vpcSatisfied = false;
  if (!identityVerified) {
    vpcSatisfied = false;
  } else if (emailKey) {
    const uSnap = await db().collection('users').doc(emailKey).get();
    if (!uSnap.exists) {
      vpcSatisfied = false;
    } else {
      const ud = uSnap.data();
      if (ud.isMinor === true) {
        vpcSatisfied = ud.vpcStatus === 'verified';
      } else {
        vpcSatisfied = true;
      }
    }
  } else {
    vpcSatisfied = false;
  }

  const eligible =
      safeSportVerified &&
      concussionClearanceVerified &&
      governingBodyClear &&
      vpcSatisfied &&
      identityVerified;

  const reasons = [];
  if (!identityVerified) reasons.push('identity_unverified');
  if (!safeSportVerified) reasons.push('safesport_not_verified');
  if (!concussionClearanceVerified) {
    reasons.push('concussion_not_verified');
  }
  if (!governingBodyClear) reasons.push('governing_body_not_clear');
  if (!vpcSatisfied) reasons.push('vpc_not_satisfied');

  const eligibilityDocId = makeEligibilityDocId(
      teamId, extId, emailKey, displayName,
  );
  const now = admin.firestore.FieldValue.serverTimestamp();
  const eligibilityData = {
    teamId,
    clubId: clubId || null,
    seasonExternalId: seasonExternalId || null,
    sidCode,
    externalMemberId: extId,
    emailKey: emailKey || null,
    displayName: displayName || null,
    safeSportVerified,
    concussionClearanceVerified,
    governingBodyClear,
    governingBodyStatus,
    vpcSatisfied,
    identityVerified,
    identityStatus,
    eligible,
    ineligibilityReasons: reasons,
    source: sourceTag,
    lastEventId: eventId,
    updatedAt: now,
  };

  const linkId = makeRosterLinkDocId(teamId, extId, emailKey, displayName);
  const rosterLinkData = {
    id: linkId,
    data: {
      teamId,
      clubId: clubId || null,
      seasonExternalId: seasonExternalId || null,
      sidCode,
      externalMemberId: extId,
      emailKey: emailKey || null,
      displayName: displayName || null,
      updatedAt: now,
      lastEventId: eventId,
    },
  };

  return {eligibilityDocId, eligibilityData, rosterLinkData};
}

/**
 * Recompute vpc + aggregate eligibility from stored doc fields (post-override).
 * @param {Record<string, unknown>} d
 * @return {!Promise<{vpcSatisfied: boolean, eligible: boolean,
 *     ineligibilityReasons: string[]}>}
 */
async function recomputeEligibilityDerived(d) {
  const identityVerified = d.identityVerified === true;
  const safeSportVerified = d.safeSportVerified === true;
  const concussionClearanceVerified = d.concussionClearanceVerified === true;
  const governingBodyClear = d.governingBodyClear === true;
  const emailKey = typeof d.emailKey === 'string' ? d.emailKey : null;

  let vpcSatisfied = false;
  if (!identityVerified) {
    vpcSatisfied = false;
  } else if (emailKey) {
    const uSnap = await db().collection('users').doc(emailKey).get();
    if (!uSnap.exists) {
      vpcSatisfied = false;
    } else {
      const ud = uSnap.data();
      if (ud.isMinor === true) {
        vpcSatisfied = ud.vpcStatus === 'verified';
      } else {
        vpcSatisfied = true;
      }
    }
  } else {
    vpcSatisfied = false;
  }

  const eligible =
      safeSportVerified &&
      concussionClearanceVerified &&
      governingBodyClear &&
      vpcSatisfied &&
      identityVerified;

  const reasons = [];
  if (!identityVerified) reasons.push('identity_unverified');
  if (!safeSportVerified) reasons.push('safesport_not_verified');
  if (!concussionClearanceVerified) {
    reasons.push('concussion_not_verified');
  }
  if (!governingBodyClear) reasons.push('governing_body_not_clear');
  if (!vpcSatisfied) reasons.push('vpc_not_satisfied');

  return {vpcSatisfied, eligible, ineligibilityReasons: reasons};
}

/**
 * @param {Record<string, unknown>} payload
 * @param {{sourceTag: string, rawString: string}} opts
 * @return {!Promise<!Object>}
 */
async function runAffinityIngestCore(payload, opts) {
  const eventId =
      typeof payload.eventId === 'string' ? payload.eventId.trim() : '';
  if (!eventId) {
    throwAffinityHttp(400, 'eventId is required');
  }
  const sidCode =
      typeof payload.sidCode === 'string' ? payload.sidCode.trim() : '';
  const seasonExternalId =
      typeof payload.seasonExternalId === 'string' ?
        payload.seasonExternalId.trim() :
        '';
  const players = Array.isArray(payload.players) ? payload.players : [];
  if (players.length > 120) {
    throwAffinityHttp(400, 'At most 120 players per payload');
  }

  const eventDocId = sanitizeAffinityEventDocId(eventId);
  const eventRef = db().collection('affinity_webhook_events').doc(eventDocId);

  const duplicate = await db().runTransaction(async (t) => {
    const es = await t.get(eventRef);
    if (es.exists) return true;
    t.set(eventRef, {
      eventId,
      status: 'processing',
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: opts.sourceTag,
    });
    return false;
  });

  if (duplicate) {
    return {ok: true, duplicate: true, eventId};
  }

  const rawRef = db().collection('affinity_ingest_raw').doc();
  await rawRef.set({
    eventId,
    bodyPreview: (opts.rawString || '').slice(0, 80000),
    byteLength: Buffer.byteLength(opts.rawString || '', 'utf8'),
    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: opts.sourceTag,
  });

  let teamId;
  let clubId;
  try {
    const resolved = await resolveTeamBySidCode(sidCode, seasonExternalId);
    teamId = resolved.teamId;
    clubId = resolved.clubId;
  } catch (err) {
    await eventRef.set({
      status: 'failed',
      error: err.message || String(err),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    throw err;
  }

  const built = [];
  for (const p of players) {
    if (!p || typeof p !== 'object') continue;
    built.push(
        await buildEligibilityRow(
            /** @type {Record<string, unknown>} */ (p),
            teamId,
            clubId,
            seasonExternalId,
            sidCode,
            opts.sourceTag,
            eventId,
        ),
    );
  }

  let batch = db().batch();
  let ops = 0;
  for (const row of built) {
    batch.set(
        db().collection('player_eligibility').doc(row.eligibilityDocId),
        row.eligibilityData,
        {merge: true},
    );
    ops++;
    batch.set(
        db().collection('roster_links').doc(row.rosterLinkData.id),
        row.rosterLinkData.data,
        {merge: true},
    );
    ops++;
    if (ops >= 450) {
      await batch.commit();
      batch = db().batch();
      ops = 0;
    }
  }
  if (ops > 0) {
    await batch.commit();
  }

  await eventRef.set({
    status: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    teamId,
    playerCount: built.length,
    ingestRawId: rawRef.id,
  }, {merge: true});

  return {
    ok: true,
    eventId,
    teamId,
    playerCount: built.length,
  };
}

// ── Private helpers: Stripe ───────────────────────────────────────────────────

/**
 * @param {string} tierType
 * @param {number} purchasedQty
 * @return {number}
 */
function seatsLimitForTier(tierType, purchasedQty) {
  if (tierType === 'tutor') return 15;
  if (tierType === 'free_trial') return 15;
  if (tierType === 'team') return 25;
  if (tierType === 'club') {
    return purchasedQty > 0 && purchasedQty <= 100000 ? purchasedQty : 100;
  }
  if (tierType === 'recruiter') return 0;
  return 0;
}

/**
 * @param {string} stripeStatus
 * @return {'active'|'past_due'|'canceled'}
 */
function mapStripeSubscriptionStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') {
    return 'active';
  }
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') {
    return 'past_due';
  }
  if (
    stripeStatus === 'canceled' ||
    stripeStatus === 'incomplete_expired' ||
    stripeStatus === 'paused'
  ) {
    return 'canceled';
  }
  return 'past_due';
}

/**
 * @param {Object} stripeClient Stripe client
 * @param {string} tierType
 * @return {string}
 */
function priceIdForTierType(stripeClient, tierType) {
  void stripeClient;
  if (tierType === 'tutor') return STRIPE_PRICE_TUTOR.value();
  if (tierType === 'team') return STRIPE_PRICE_TEAM.value();
  if (tierType === 'club') return STRIPE_PRICE_CLUB.value();
  if (tierType === 'recruiter') return STRIPE_PRICE_RECRUITER.value();
  return '';
}

/**
 * @param {any} request
 * @return {string} clubId
 */
function resolveClubIdForStripeCheckout(request) {
  const actor = assertDirectorOrSuper(request);
  const data = request.data || {};
  if (actor.role === 'super_admin') {
    const raw = typeof data.clubId === 'string' ? data.clubId.trim() : '';
    if (!raw) {
      throw new HttpsError(
          'invalid-argument',
          'clubId is required for super admin.',
      );
    }
    return raw;
  }
  const cid = request.auth.token.clubId || '';
  if (!cid) {
    throw new HttpsError(
        'failed-precondition',
        'Club scope missing; sign out and back in.',
    );
  }
  return cid;
}

/**
 * @param {string} url
 * @return {boolean}
 */
function isAllowedStripeRedirectUrl(url) {
  if (typeof url !== 'string' || url.length < 12 || url.length > 2048) {
    return false;
  }
  if (url.startsWith('https://')) return true;
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return true;
  }
  return false;
}

/**
 * @param {Object} stripeClient Stripe client
 * @param {Object} event Stripe event payload
 */
async function handleStripeWebhookEvent(stripeClient, event) {
  const type = event.type;

  if (type === 'checkout.session.completed') {
    const session = /** @type {import('stripe').Stripe.Checkout.Session} */ (
      event.data.object
    );
    let clubId =
        session.metadata && session.metadata.clubId ?
          String(session.metadata.clubId).trim() :
          '';
    if (!clubId && session.client_reference_id) {
      clubId = String(session.client_reference_id).trim();
    }
    const tierType =
        session.metadata && session.metadata.tierType ?
          String(session.metadata.tierType).toLowerCase() :
          '';

    // EPIC 14: B2C STRIPE PAYWALL (PREMIUM SPECTATOR ACCESS)
    if (tierType === 'premium_spectator') {
      const parentUid = session.client_reference_id;
      if (parentUid) {
        await admin.auth().setCustomUserClaims(parentUid, { premium_spectator: true });
        logger.info(`B2C Premium Spectator unlocked for ${parentUid}`);
      } else {
        logger.warn('checkout.session.completed: premium_spectator missing client_reference_id');
      }
      return;
    }

    // Phase 2, Epic 2 — Session M: route recruiter subs to recruiter_accounts.
    const recruiterEmail =
        session.metadata && session.metadata.recruiterEmail ?
          String(session.metadata.recruiterEmail).toLowerCase().trim() :
          '';
    if (!clubId || !tierType) {
      logger.warn(
          'checkout.session.completed: missing clubId/tier in metadata',
      );
      return;
    }
    const subId = session.subscription;
    const customerId = session.customer;
    let quantity = 1;
    if (typeof subId === 'string') {
      const sub = await stripeClient.subscriptions.retrieve(subId);
      const first = sub.items && sub.items.data[0] ? sub.items.data[0] : null;
      if (first && typeof first.quantity === 'number' && first.quantity > 0) {
        quantity = first.quantity;
      }
    }

    // Recruiter hybrid path: write `recruiter_accounts/{email}` (the canonical
    // source of truth for recruiter access).  Also retain the legacy
    // `license_entitlements/{clubId}` row for backwards compat during the
    // cutover — the rules helper `recruiterSubscriptionActive()` reads from
    // recruiter_accounts first and falls back to license_entitlements.
    if (tierType === 'recruiter' && recruiterEmail) {
      const recRef = db().collection('recruiter_accounts').doc(recruiterEmail);
      await recRef.set(
          {
            email: recruiterEmail,
            stripe_customer_id: typeof customerId === 'string' ?
              customerId :
              String(customerId || ''),
            stripe_subscription_id: typeof subId === 'string' ? subId : '',
            subscription_status: 'active',
            billingModel: 'recruiter_hybrid',
            activatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'stripe:checkout.session.completed',
          },
          {merge: true},
      );
    }

    const seats = seatsLimitForTier(tierType, quantity);
    const entRef = db().collection('license_entitlements').doc(clubId);
    await entRef.set(
        {
          tier: tierType,
          stripe_customer_id: typeof customerId === 'string' ?
            customerId :
            String(customerId || ''),
          stripe_subscription_id: typeof subId === 'string' ? subId : '',
          subscription_status: 'active',
          seats_limit: seats,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'stripe:checkout.session.completed',
        },
        {merge: true},
    );
    return;
  }

  if (type === 'customer.subscription.deleted') {
    const sub = /** @type {import('stripe').Stripe.Subscription} */ (
      event.data.object
    );
    await syncSubscriptionStatusFromStripeObject(stripeClient, sub, 'canceled');
    // Phase 2, Epic 2 — Session E.  When a legacy club sub (tutor/team/club)
    // is cancelled, flip the org-side `billingModel` so the read-only paywall
    // (Session F) stops tripping.  Recruiter subs are intentionally skipped
    // — they migrate via Session M, not by free-falling off the gate.
    try {
      const tier = sub.metadata && sub.metadata.tierType ?
        String(sub.metadata.tierType).toLowerCase() :
        '';
      const clubId = sub.metadata && sub.metadata.clubId ?
        String(sub.metadata.clubId).trim() :
        '';
      if (clubId && tier && tier !== 'recruiter') {
        await db().collection('organizations').doc(clubId).set(
            {
              billingModel: 'transaction_billing',
              billingModelMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true},
        );
        logger.info('subscription.deleted: org flipped to transaction_billing', {clubId, tier});
      }
    } catch (err) {
      logger.error('subscription.deleted: org-side flip failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }

  if (type === 'customer.subscription.updated') {
    const sub = /** @type {import('stripe').Stripe.Subscription} */ (
      event.data.object
    );
    const mapped = mapStripeSubscriptionStatus(sub.status);
    await syncSubscriptionStatusFromStripeObject(stripeClient, sub, mapped);
    return;
  }

  if (type === 'invoice.payment_failed') {
    const invoice = /** @type {import('stripe').Stripe.Invoice} */ (
      event.data.object
    );
    const subId = invoice.subscription;
    if (typeof subId === 'string') {
      const sub = await stripeClient.subscriptions.retrieve(subId);
      await syncSubscriptionStatusFromStripeObject(stripeClient, sub, 'past_due');
    }
    return;
  }
}

/**
 * @param {Object} stripeClient Stripe client
 * @param {Object} sub Stripe subscription
 * @param {'active'|'past_due'|'canceled'} status
 */
async function syncSubscriptionStatusFromStripeObject(stripeClient, sub, status) {
  void stripeClient;
  let clubId =
      sub.metadata && sub.metadata.clubId ?
        String(sub.metadata.clubId).trim() :
        '';
  if (!clubId && typeof sub.id === 'string') {
    try {
      const snap = await db()
          .collection('license_entitlements')
          .where('stripe_subscription_id', '==', sub.id)
          .limit(2)
          .get();
      if (!snap.empty) {
        if (snap.size > 1) {
          logger.warn(
              'subscription event: multiple license_entitlements for sub id',
              {subId: sub.id},
          );
        }
        clubId = snap.docs[0].id;
      }
    } catch (e) {
      logger.error('subscription event: club lookup by subscription id failed', {
        subId: sub.id,
        err: e instanceof Error ? e.message : String(e),
      });
      return;
    }
  }
  if (!clubId) {
    logger.warn('subscription event: missing clubId in subscription metadata');
    return;
  }
  const tierType =
      sub.metadata && sub.metadata.tierType ?
        String(sub.metadata.tierType).toLowerCase() :
        '';
  const first = sub.items && sub.items.data[0] ? sub.items.data[0] : null;
  const quantity =
      first && typeof first.quantity === 'number' && first.quantity > 0 ?
        first.quantity :
        1;
  const seats = tierType ? seatsLimitForTier(tierType, quantity) : undefined;

  const patch = {
    stripe_subscription_id: sub.id,
    stripe_customer_id:
      typeof sub.customer === 'string' ?
        sub.customer :
        String(sub.customer || ''),
    subscription_status: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'stripe:subscription',
  };
  if (tierType && seats !== undefined) {
    patch.seats_limit = seats;
    patch.tier = tierType;
  }

  await db()
      .collection('license_entitlements')
      .doc(clubId)
      .set(patch, {merge: true});
}

// ── Exported functions ────────────────────────────────────────────────────────

/**
 * Scheduled: release reserved seats for coach invites older than 168 hours.
 */
exports.expireCoachInvites = onSchedule('every 60 minutes', async () => {
  const cutoffMs = Date.now() - 168 * 60 * 60 * 1000;
  const cutoff = admin.firestore.Timestamp.fromMillis(cutoffMs);
  const snap = await db().collection('coach_invites')
      .where('status', '==', 'pending')
      .where('createdAt', '<=', cutoff)
      .limit(400)
      .get();

  let released = 0;
  for (const doc of snap.docs) {
    try {
      await db().runTransaction(async (transaction) => {
        const invSnap = await transaction.get(doc.ref);
        if (!invSnap.exists || invSnap.data().status !== 'pending') {
          return;
        }
        const clubId = invSnap.data().clubId;
        if (typeof clubId !== 'string' || !clubId) {
          transaction.delete(doc.ref);
          return;
        }
        const entRef = db().collection('license_entitlements').doc(clubId);
        const entSnap = await transaction.get(entRef);
        const reserved =
                entSnap.exists &&
                typeof entSnap.data().reserved_seats === 'number' &&
                !Number.isNaN(entSnap.data().reserved_seats) ?
                  entSnap.data().reserved_seats :
                  0;
        if (reserved >= 1) {
          transaction.update(entRef, {
            reserved_seats: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'system:expireCoachInvites',
          });
        }
        transaction.delete(doc.ref);
      });
      released++;
    } catch (e) {
      logger.error('expireCoachInvites doc failed', doc.id, e);
    }
  }
  if (released > 0) {
    logger.info(`expireCoachInvites released ${released} pending invite(s).`);
  }

  await reconcileReservedSeatsWithoutPendingInvites();
});

/** Epic 14: video trial Firestore row after Storage upload (validated). */
exports.submitVideoTrial = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role || 'player';
  if (role !== 'player') {
    throw new HttpsError(
        'permission-denied',
        'Only player accounts may submit video trials.',
    );
  }
  const data = request.data || {};
  const scoreId =
      typeof data.scoreId === 'string' ? data.scoreId.trim() : '';
  const videoUrl =
      typeof data.videoUrl === 'string' ? data.videoUrl.trim() : '';
  const skill =
      typeof data.skill === 'string' ? data.skill.trim().slice(0, 120) : '';
  if (!scoreId || scoreId.length < 8 || scoreId.length > 128) {
    throw new HttpsError('invalid-argument', 'scoreId is required.');
  }
  if (!videoUrl || !videoUrl.startsWith('http')) {
    throw new HttpsError('invalid-argument', 'videoUrl is required.');
  }
  const uid = request.auth.uid;
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError('failed-precondition', 'Missing email on account.');
  }
  const uSnap = await db().collection('users').doc(email).get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'Profile not found.');
  }
  const u = uSnap.data() || {};
  const teamId =
      typeof u.teamId === 'string' && u.teamId.trim() && u.teamId !== 'admin' ?
        u.teamId.trim() :
        '';
  const clubId =
      typeof u.clubId === 'string' && u.clubId.trim() ? u.clubId.trim() : '';
  const playerName =
      typeof u.playerName === 'string' && u.playerName.trim() ?
        u.playerName.trim() :
        '';
  if (!teamId || !clubId || !playerName) {
    throw new HttpsError(
        'failed-precondition',
        'Athlete profile must have team and club.',
    );
  }

  const expectedPath = `clubs/${clubId}/trials/${uid}/${scoreId}_video.mp4`;
  let bucket;
  try {
    bucket = admin.storage().bucket();
  } catch (e) {
    logger.error('submitVideoTrial bucket', e);
    throw new HttpsError(
        'failed-precondition',
        'Storage is not available.',
    );
  }
  const [exists] = await bucket.file(expectedPath).exists();
  if (!exists) {
    throw new HttpsError(
        'failed-precondition',
        'Upload the video to the expected path before submitting.',
    );
  }

  const ref = db().collection('trial_scores').doc(scoreId);
  const prev = await ref.get();
  if (prev.exists) {
    throw new HttpsError(
        'already-exists',
        'This trial id was already submitted.',
    );
  }

  await ref.set({
    clubId,
    teamId,
    playerId: uid,
    playerName,
    videoUrl,
    skill: skill || '',
    status: 'pending_verification',
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {ok: true, scoreId};
});

/**
 * Epic 14: coach / director approves or rejects a pending video trial.
 */
exports.verifyVideoTrial = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const scoreId =
      typeof data.scoreId === 'string' ? data.scoreId.trim() : '';
  const decisionRaw =
      typeof data.decision === 'string' ? data.decision.trim().toLowerCase() :
        '';
  if (!scoreId) {
    throw new HttpsError('invalid-argument', 'scoreId is required.');
  }
  if (!['approve', 'reject'].includes(decisionRaw)) {
    throw new HttpsError(
        'invalid-argument',
        'decision must be approve or reject.',
    );
  }

  const ref = db().collection('trial_scores').doc(scoreId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Trial not found.');
  }
  const t = snap.data() || {};
  const teamId =
      typeof t.teamId === 'string' ? t.teamId.trim() : '';
  if (!teamId) {
    throw new HttpsError('failed-precondition', 'Trial has no team.');
  }
  await assertCanSecureAddPlayer(request, teamId);

  const st = t.status;
  if (st !== 'pending_verification') {
    throw new HttpsError(
        'failed-precondition',
        'This trial is not pending verification.',
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const actorUid = request.auth.uid;
  const patch =
      decisionRaw === 'approve' ?
        {
          status: 'verified',
          verifiedAt: now,
          verifiedByUid: actorUid,
        } :
        {
          status: 'rejected',
          verifiedAt: now,
          verifiedByUid: actorUid,
        };

  await db().runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    if (!cur.exists) {
      throw new HttpsError('not-found', 'Trial not found.');
    }
    const c = cur.data() || {};
    if (c.status !== 'pending_verification') {
      throw new HttpsError(
          'failed-precondition',
          'This trial is no longer pending.',
      );
    }
    tx.update(ref, patch);
  });

  return {ok: true, scoreId, status: patch.status};
});

/**
 * Director / super_admin: manual SafeSport / concussion / identity flags.
 */
exports.directorOverrideEligibility = onCall(
    {region: REGION},
    async (request) => {
      const actor = assertDirectorOrSuper(request);
      if (actor.role === 'director' && !actor.clubId) {
        throw new HttpsError(
            'failed-precondition',
            'Your account is missing club scope; sign out and back in.',
        );
      }
      const data = request.data || {};
      const eligibilityDocId =
          typeof data.eligibilityDocId === 'string' ?
            data.eligibilityDocId.trim() :
            '';
      if (!eligibilityDocId) {
        throw new HttpsError(
            'invalid-argument',
            'eligibilityDocId is required.',
        );
      }

      const ref = db().collection('player_eligibility').doc(eligibilityDocId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Eligibility record not found.');
      }
      const cur = snap.data();
      const docClubId = cur.clubId || null;
      if (actor.role === 'director') {
        if (!docClubId || actor.clubId !== docClubId) {
          throw new HttpsError(
              'permission-denied',
              'You can only override eligibility for your club.',
          );
        }
      }

      /** @type {Record<string, boolean>} */
      const changes = {};
      if (data.safeSportVerified !== undefined) {
        if (typeof data.safeSportVerified !== 'boolean') {
          throw new HttpsError(
              'invalid-argument',
              'safeSportVerified must be a boolean.',
          );
        }
        changes.safeSportVerified = data.safeSportVerified;
      }
      if (data.concussionClearanceVerified !== undefined) {
        if (typeof data.concussionClearanceVerified !== 'boolean') {
          throw new HttpsError(
              'invalid-argument',
              'concussionClearanceVerified must be a boolean.',
          );
        }
        changes.concussionClearanceVerified =
            data.concussionClearanceVerified;
      }
      if (data.identityVerified !== undefined) {
        if (typeof data.identityVerified !== 'boolean') {
          throw new HttpsError(
              'invalid-argument',
              'identityVerified must be a boolean.',
          );
        }
        changes.identityVerified = data.identityVerified;
      }
      if (Object.keys(changes).length === 0) {
        throw new HttpsError(
            'invalid-argument',
            'Provide at least one of safeSportVerified, ' +
            'concussionClearanceVerified, identityVerified.',
        );
      }

      /** @type {Record<string, unknown>} */
      const merged = {...cur, ...changes};
      merged.identityVerified = merged.identityVerified === true;
      merged.safeSportVerified = merged.safeSportVerified === true;
      merged.concussionClearanceVerified =
          merged.concussionClearanceVerified === true;
      merged.governingBodyClear = merged.governingBodyClear === true;
      if (changes.identityVerified !== undefined) {
        merged.identityStatus =
            merged.identityVerified === true ? 'verified' : 'unverified';
      }

      const derived = await recomputeEligibilityDerived(merged);
      const now = admin.firestore.FieldValue.serverTimestamp();

      /** @type {Record<string, unknown>} */
      const writePayload = {
        ...changes,
        vpcSatisfied: derived.vpcSatisfied,
        eligible: derived.eligible,
        ineligibilityReasons: derived.ineligibilityReasons,
        directorEligibilityOverrideAt: now,
        directorEligibilityOverrideBy:
            normEmail(actor.email) || actor.email || null,
        updatedAt: now,
      };
      if (changes.identityVerified !== undefined) {
        writePayload.identityStatus = merged.identityStatus;
      }

      await ref.set(writePayload, {merge: true});

      await db().collection('security_audit').add({
        action: 'directorOverrideEligibility',
        eligibilityDocId,
        teamId: cur.teamId || null,
        clubId: docClubId,
        actorEmail: actor.email || null,
        actorUid: request.auth.uid,
        changes,
        resultingEligible: derived.eligible,
        at: now,
      });

      return {
        ok: true,
        eligibilityDocId,
        eligible: derived.eligible,
        vpcSatisfied: derived.vpcSatisfied,
        ineligibilityReasons: derived.ineligibilityReasons,
      };
    },
);

/**
 * POST JSON body. Header: X-SSTRACKER-Signature: sha256=<hmac-sha256-hex>
 * over raw bytes. Requires teams.externalSidCode.
 */
exports.affinityWebhook = onRequest(
    {
      region: REGION,
      secrets: [AFFINITY_WEBHOOK_HMAC_SECRET],
      invoker: 'public',
    },
    async (req, res) => {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }
      const secret = AFFINITY_WEBHOOK_HMAC_SECRET.value();
      const raw = req.rawBody;
      if (!raw || !Buffer.isBuffer(raw)) {
        res.status(400).json({error: 'Missing raw body buffer'});
        return;
      }
      try {
        verifyAffinityHmac(raw, req.get('X-SSTRACKER-Signature'), secret);
      } catch (e) {
        logger.warn('affinityWebhook: bad signature', e);
        res.status(401).json({error: 'Unauthorized'});
        return;
      }
      let payload;
      try {
        payload = JSON.parse(raw.toString('utf8'));
      } catch (e) {
        res.status(400).json({error: 'Invalid JSON'});
        return;
      }
      try {
        const out = await runAffinityIngestCore(
            /** @type {Record<string, unknown>} */ (payload),
            {
              sourceTag: 'affinity_webhook',
              rawString: raw.toString('utf8'),
            },
        );
        res.status(200).json(out);
      } catch (err) {
        const status = err.status || 500;
        logger.error('affinityWebhook: ingest failed', err);
        res.status(status).json({error: err.message || String(err)});
      }
    },
);

/**
 * @param {Buffer} rawBuffer
 * @param {string|undefined} signatureHeader
 * @param {string} secret
 */
function verifyAffinityHmac(rawBuffer, signatureHeader, secret) {
  const expected = crypto.createHmac('sha256', secret)
      .update(rawBuffer)
      .digest();
  const sig = (signatureHeader || '').trim();
  const prefix = 'sha256=';
  if (!sig.startsWith(prefix)) {
    throw new Error('Invalid signature header (expected sha256=hex)');
  }
  let provided;
  try {
    provided = Buffer.from(sig.slice(prefix.length), 'hex');
  } catch (e) {
    throw new Error('Invalid signature hex');
  }
  if (provided.length !== expected.length ||
      !crypto.timingSafeEqual(provided, expected)) {
    throw new Error('HMAC verification failed');
  }
}

/**
 * Director / super_admin: run same ingest as webhook without HMAC (local QA).
 */
exports.mockAffinityPush = onCall({region: REGION}, async (request) => {
  const actor = assertDirectorOrSuper(request);
  const data = request.data || {};
  const eventIdRaw = data.eventId;
  const fallbackEv =
      `mock_${Date.now()}_` +
      (actor.email || 'unknown').replace(/[^a-z0-9]+/gi, '_');
  const eventId =
      typeof eventIdRaw === 'string' && eventIdRaw.trim() ?
        eventIdRaw.trim() :
        fallbackEv;
  const sidCode =
      typeof data.sidCode === 'string' ? data.sidCode.trim() : '';
  if (!sidCode) {
    throw new HttpsError('invalid-argument', 'sidCode is required.');
  }
  const seasonExternalId =
      typeof data.seasonExternalId === 'string' ?
        data.seasonExternalId.trim() :
        '';
  const players = Array.isArray(data.players) ? data.players : [];
  const payload = {
    eventId,
    sidCode,
    seasonExternalId,
    players,
  };
  const rawString = JSON.stringify(payload);
  try {
    return await runAffinityIngestCore(
        /** @type {Record<string, unknown>} */ (payload),
        {
          sourceTag: 'mock_affinity_push',
          rawString,
        },
    );
  } catch (err) {
    if (err.status) {
      throw new HttpsError(
          err.status === 400 ? 'invalid-argument' :
            err.status === 404 ? 'not-found' : 'failed-precondition',
          err.message || String(err),
      );
    }
    throw err;
  }
});

/**
 * Director / super_admin: Stripe Checkout Session for subscription tier.
 */
exports.createStripeCheckoutSession = onCall(
    {
      region: REGION,
      secrets: [STRIPE_SECRET_KEY],
    },
    async (request) => {
      if (!request.auth || !request.auth.uid) {
        throw new HttpsError('unauthenticated', 'Sign in required.');
      }
      const clubId = resolveClubIdForStripeCheckout(request);
      const data = request.data || {};
      const tierTypeRaw = typeof data.tierType === 'string' ?
        data.tierType.trim().toLowerCase() :
        '';
      const allowedTiers = ['tutor', 'team', 'club', 'recruiter'];
      if (!allowedTiers.includes(tierTypeRaw)) {
        throw new HttpsError(
            'invalid-argument',
            'tierType must be tutor, team, club, or recruiter.',
        );
      }

      // Phase 2, Epic 2 — Session N kill switch.
      // Club-side SaaS tiers (tutor/team/club) are CLOSED to new sign-ups.
      // Only super_admin can provision a new legacy subscription (used during
      // the cutover window for special carve-outs).  The recruiter tier
      // remains open — it powers the hybrid annual + per-export model in M.
      const callerRole = request.auth.token.role ?? '';
      const isSuperLike = callerRole === 'super_admin' || callerRole === 'global_admin';
      if (tierTypeRaw !== 'recruiter' && !isSuperLike) {
        throw new HttpsError(
            'failed-precondition',
            'Club SaaS tiers are closed to new sign-ups. ' +
            'Vanguard now operates on transaction-based pricing — see /pricing.',
        );
      }
      const successUrl =
          typeof data.successUrl === 'string' ? data.successUrl.trim() : '';
      const cancelUrl =
          typeof data.cancelUrl === 'string' ? data.cancelUrl.trim() : '';
      if (!isAllowedStripeRedirectUrl(successUrl) ||
          !isAllowedStripeRedirectUrl(cancelUrl)) {
        throw new HttpsError(
            'invalid-argument',
            'successUrl and cancelUrl must be valid https URLs ' +
            '(or localhost for dev).',
        );
      }

      const secret = STRIPE_SECRET_KEY.value();
      if (!secret || typeof secret !== 'string' || secret.length < 16) {
        throw new HttpsError(
            'failed-precondition',
            'Stripe is not configured. Set STRIPE_SECRET_KEY secret.',
        );
      }

      const stripeClient = stripe(secret);
      const priceId = priceIdForTierType(stripeClient, tierTypeRaw);
      if (!priceId || typeof priceId !== 'string') {
        throw new HttpsError(
            'failed-precondition',
            'Stripe Price ID not configured for this tier.',
        );
      }

      let quantity = 1;
      if (tierTypeRaw === 'club') {
        const q = parseInt(String(data.clubSeatQuantity), 10);
        if (Number.isFinite(q) && q >= 1 && q <= 100000) {
          quantity = q;
        } else {
          quantity = 100;
        }
      }

      const email =
          typeof request.auth.token.email === 'string' ?
            request.auth.token.email :
            undefined;

      // Phase 2, Epic 2 — Session M: stamp recruiter-tagged metadata so the
      // webhook handler can route the resulting customer.subscription.created
      // event into `recruiter_accounts/{email}` rather than the (now closed)
      // club entitlement collection.
      const recruiterEmail = tierTypeRaw === 'recruiter' && email ?
        String(email).toLowerCase() :
        '';

      const session = await stripeClient.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{price: priceId, quantity: quantity}],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id:
            clubId.length <= 255 ? clubId : clubId.slice(0, 255),
        customer_email: email || undefined,
        metadata: {
          clubId: clubId,
          tierType: tierTypeRaw,
          firebaseUid: request.auth.uid,
          ...(recruiterEmail ? {recruiterEmail} : {}),
        },
        subscription_data: {
          metadata: {
            clubId: clubId,
            tierType: tierTypeRaw,
            ...(recruiterEmail ? {recruiterEmail} : {}),
          },
        },
      });

      if (!session.url) {
        throw new HttpsError(
            'internal',
            'Stripe did not return a checkout URL.',
        );
      }

      return {ok: true, url: session.url, sessionId: session.id};
    },
);

/**
 * Stripe webhooks: verify signature, sync license_entitlements.
 */
exports.stripeWebhook = onRequest(
    {
      region: REGION,
      cors: false,
      invoker: 'public',
      secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
    },
    async (req, res) => {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }
      const sig = req.headers['stripe-signature'];
      if (!sig || typeof sig !== 'string') {
        res.status(400).send('Missing stripe-signature');
        return;
      }
      const rawBody = req.rawBody;
      if (!Buffer.isBuffer(rawBody)) {
        logger.error('stripeWebhook: missing rawBody buffer');
        res.status(400).send('Invalid body');
        return;
      }

      const secretKey = STRIPE_SECRET_KEY.value();
      const whSecret = STRIPE_WEBHOOK_SECRET.value();
      if (!secretKey || !whSecret) {
        logger.error('stripeWebhook: missing Stripe secrets');
        res.status(500).send('Server misconfiguration');
        return;
      }

      const stripeClient = stripe(secretKey);
      let event;
      try {
        event = stripeClient.webhooks.constructEvent(rawBody, sig, whSecret);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Webhook signature verification failed: ${msg}`);
        res.status(400).send('Webhook signature verification failed');
        return;
      }

      try {
        await handleStripeWebhookEvent(stripeClient, event);
      } catch (err) {
        logger.error('stripeWebhook handler error', err);
        res.status(500).send('Handler error');
        return;
      }

      res.status(200).json({received: true});
    },
);
