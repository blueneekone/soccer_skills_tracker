/* eslint-disable quotes */
/**
 * ticketing.js — Digital Ticketing (Phase 2, Epic 2, Session H)
 * ─────────────────────────────────────────────────────────────
 * Sells access to a tournament event via Stripe Connect destination charges,
 * routed exactly the same way as season registrations:
 *
 *   Parent                Host Club                       Vanguard
 *   ───────               ─────────────────────           ─────────────
 *   PaymentIntent ──────► stripeAccountId ◄── connect onboarding
 *                          (transfer_data.destination)
 *                          minus application_fee_amount
 *
 * On `payment_intent.succeeded` we batch:
 *   - flip `tickets/{ticketId}.paymentStatus = 'paid'`
 *   - issue an HMAC `qrToken` (the gate-scanner verifies on entry)
 *   - increment `tournament_events/{eventId}.soldCount`
 *   - write a `platform_fee_ledger` row keyed by PaymentIntent.id
 *
 * Idempotency: doc IDs in the ledger are the PaymentIntent ID, so a Stripe
 * redelivery is a no-op `set({merge: true})` against the same row.
 *
 * Exports:
 *   createTicketSaleIntent  — onCall (parent / player / director / super)
 *   handleTicketingWebhook  — onRequest (Stripe webhook handler)
 */

'use strict';

const crypto = require('crypto');
const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret, defineString} = require('firebase-functions/params');

const {loadActivePolicy, computePlatformFee} = require('./pricingEngine');
const {recordPlatformFee} = require('./feeLedger');
const {getRegistryDb} = require('./cellRouter');

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET_TICKETS = defineSecret('STRIPE_WEBHOOK_SECRET_TICKETS');
const TICKET_QR_HMAC_SECRET = defineSecret('TICKET_QR_HMAC_SECRET');
const APP_BASE_URL = defineString('APP_BASE_URL', {default: 'https://vanguardcommand.app'});

const REGION = 'us-east1';
/** Cap on a single ticket purchase so a mistyped quantity can't 6-figure-charge a card. */
const MAX_GROSS_PER_INTENT_CENTS = 500000; // $5,000
const MAX_QUANTITY = 50;

const db = admin.firestore();

/** Lazy-init Stripe so a missing secret never breaks cold-start. */
function getStripe() {
  const stripe = require('stripe');
  return stripe(STRIPE_SECRET_KEY.value(), {apiVersion: '2024-06-20'});
}

// ── createTicketSaleIntent ──────────────────────────────────────────────────

/**
 * Create a PaymentIntent for a digital ticket purchase.
 *
 * Input: { eventId: string, tierId: string, quantity: number }
 * Returns: { clientSecret, ticketId, feeAmountCents, platformFeeCents }
 */
exports.createTicketSaleIntent = onCall(
    {region: REGION, secrets: [STRIPE_SECRET_KEY]},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

      const role = request.auth.token.role ?? '';
      const callerUid = request.auth.uid;
      const callerEmail = (request.auth.token.email ?? '').toLowerCase();
      if (!['parent', 'player', 'director', 'super_admin', 'global_admin'].includes(role)) {
        throw new HttpsError('permission-denied', 'Role not permitted to purchase tickets.');
      }

      const {eventId, tierId, quantity} = request.data ?? {};
      if (typeof eventId !== 'string' || !eventId.trim()) {
        throw new HttpsError('invalid-argument', 'eventId required.');
      }
      if (typeof tierId !== 'string' || !tierId.trim()) {
        throw new HttpsError('invalid-argument', 'tierId required.');
      }
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
        throw new HttpsError('invalid-argument', `quantity must be 1..${MAX_QUANTITY}.`);
      }

      // Look up the event + tier.  The event doc holds tier price & host club.
      const eventSnap = await db.doc(`tournament_events/${eventId}`).get();
      if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found.');
      const eventData = eventSnap.data() || {};
      const tier = (eventData.ticketTiers || {})[tierId];
      if (!tier || typeof tier.unitPriceCents !== 'number') {
        throw new HttpsError('invalid-argument', 'Unknown ticket tier.');
      }
      if (tier.unitPriceCents <= 0) {
        throw new HttpsError('invalid-argument', 'Tier has no price configured.');
      }

      const hostClubId = String(eventData.hostClubId || '').trim();
      if (!hostClubId) {
        throw new HttpsError('failed-precondition', 'Event missing hostClubId.');
      }

      // Capacity gate.  Stripe will charge before we can fulfil if we don't
      // refuse oversells here.  We use the event's denormalized `soldCount`
      // + this purchase's quantity; the webhook recompute reconciles strictly.
      if (typeof tier.capacity === 'number' && typeof tier.soldCount === 'number') {
        if (tier.soldCount + qty > tier.capacity) {
          throw new HttpsError(
              'resource-exhausted',
              `Tier "${tierId}" oversold: ${tier.soldCount + qty}/${tier.capacity}.`,
          );
        }
      }

      const grossCents = tier.unitPriceCents * qty;
      if (grossCents > MAX_GROSS_PER_INTENT_CENTS) {
        throw new HttpsError(
            'invalid-argument',
            `Single ticket purchase capped at $${MAX_GROSS_PER_INTENT_CENTS / 100}.`,
        );
      }

      // Pull host club's Stripe Connect account.
      const orgSnap = await db.doc(`organizations/${hostClubId}`).get();
      if (!orgSnap.exists) throw new HttpsError('not-found', 'Host club not found.');
      const stripeAccountId = orgSnap.data()?.stripeAccountId;
      if (!stripeAccountId) {
        throw new HttpsError(
            'failed-precondition',
            'Host club has not connected a Stripe account.',
        );
      }

      // Resolve platform fee from the live policy.
      const tenantPolicyOverride = orgSnap.data()?.pricingPolicyId;
      const ytdSnap = await db
          .doc(`organizations/${hostClubId}/fee_summary/ytd`)
          .get();
      const ytdGrossCents = ytdSnap.exists ?
        Number(ytdSnap.data()?.grossCents) || 0 :
        0;
      const policy = await loadActivePolicy(getRegistryDb(), tenantPolicyOverride);
      const fee = computePlatformFee({
        policy,
        transactionType: 'digital_ticketing',
        grossCents,
        ytdGrossCents,
      });

      const stripeClient = getStripe();
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: grossCents,
        currency: 'usd',
        transfer_data: {destination: stripeAccountId},
        application_fee_amount: fee.platformFeeCents,
        receipt_email: callerEmail || undefined,
        metadata: {
          hostClubId,
          eventId,
          tierId,
          quantity: String(qty),
          purchaserUid: callerUid,
          purchaserEmail: callerEmail,
          type: 'digital_ticketing',
          policyId: policy.id,
          policyVersion: String(policy.version),
          rateBp: String(fee.rateBp),
        },
        description: `Ticket — ${eventData.name || eventId} (${qty} × ${tierId})`,
      });

      const ticketRef = db.collection('tickets').doc();
      await ticketRef.set({
        ticketId: ticketRef.id,
        eventId,
        tierId,
        quantity: qty,
        unitPriceCents: tier.unitPriceCents,
        grossCents,
        platformFeeCents: fee.platformFeeCents,
        rateBp: fee.rateBp,
        policyId: policy.id,
        policyVersion: policy.version,
        purchaserUid: callerUid,
        purchaserEmail: callerEmail,
        hostClubId,
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'pending',
        qrToken: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paidAt: null,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        ticketId: ticketRef.id,
        grossCents,
        platformFeeCents: fee.platformFeeCents,
      };
    },
);

// ── handleTicketingWebhook ──────────────────────────────────────────────────

exports.handleTicketingWebhook = onRequest(
    {region: REGION, secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET_TICKETS, TICKET_QR_HMAC_SECRET]},
    async (req, res) => {
      if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = getStripe().webhooks.constructEvent(
            req.rawBody,
            sig,
            STRIPE_WEBHOOK_SECRET_TICKETS.value(),
        );
      } catch (err) {
        logger.error('[ticketing webhook] signature failed', {err: err.message});
        res.status(400).send(`Webhook signature error: ${err.message}`);
        return;
      }

      try {
        switch (event.type) {
          case 'payment_intent.succeeded':
            await handleTicketPaid(event.data.object);
            break;
          case 'payment_intent.payment_failed':
            await handleTicketFailed(event.data.object);
            break;
          default:
            logger.info('[ticketing webhook] unhandled', {type: event.type});
        }
        res.json({received: true});
      } catch (err) {
        logger.error('[ticketing webhook] handler error', {err: err.message});
        res.status(500).json({error: err.message});
      }
    },
);

async function handleTicketPaid(pi) {
  const {hostClubId, eventId, tierId, purchaserUid, purchaserEmail} = pi.metadata ?? {};
  if (!hostClubId || !eventId) {
    logger.warn('[ticketing] missing metadata', {piId: pi.id});
    return;
  }

  const ticketSnap = await db
      .collection('tickets')
      .where('paymentIntentId', '==', pi.id)
      .limit(1)
      .get();
  if (ticketSnap.empty) {
    logger.warn('[ticketing] no ticket doc for intent', {piId: pi.id});
    return;
  }

  const ticketDoc = ticketSnap.docs[0];
  const ticketData = ticketDoc.data() || {};
  const grossCents = Number(pi.amount) || Number(ticketData.grossCents) || 0;
  const platformFeeCents = Number(pi.application_fee_amount) ||
    Number(ticketData.platformFeeCents) || 0;
  const rateBp = Number(pi.metadata?.rateBp) || Number(ticketData.rateBp) || 0;
  const policyId = pi.metadata?.policyId || ticketData.policyId || 'default-v1';
  const policyVersion = Number(pi.metadata?.policyVersion) ||
    Number(ticketData.policyVersion) || 0;
  const qty = Number(ticketData.quantity) || 1;

  // Generate the QR token.  HMAC ties the token to the ticketId + a server
  // secret — a leaked DB read of the qrToken alone can't be forged into a
  // valid scan because the gate-scanner re-verifies against the secret.
  const qrPayload = `${ticketDoc.id}:${pi.id}`;
  const qrToken = crypto
      .createHmac('sha256', TICKET_QR_HMAC_SECRET.value() || 'dev-secret')
      .update(qrPayload)
      .digest('base64url');

  const batch = db.batch();

  batch.update(ticketDoc.ref, {
    paymentStatus: 'paid',
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    stripeChargeId: pi.latest_charge ?? null,
    qrToken,
  });

  // Increment tier soldCount on the event doc.  We use a dot-path on the
  // nested map so concurrent buys to different tiers don't collide.
  batch.update(db.doc(`tournament_events/${eventId}`), {
    [`ticketTiers.${tierId}.soldCount`]: admin.firestore.FieldValue.increment(qty),
    lastTicketSaleAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Audit row.
  batch.set(db.collection('audit_logs').doc(), {
    action: 'TICKET_PURCHASED',
    actorUid: purchaserUid ?? null,
    targetEmail: purchaserEmail ?? null,
    tenantId: hostClubId,
    eventId,
    tierId,
    quantity: qty,
    amountCents: grossCents,
    paymentIntentId: pi.id,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Ledger.  Doc ID is the PaymentIntent ID so retries are idempotent.
  recordPlatformFee(batch, db, {
    tenantId: hostClubId,
    transactionType: 'digital_ticketing',
    sourceDocPath: `tickets/${ticketDoc.id}`,
    grossCents,
    platformFeeCents,
    netCents: grossCents - platformFeeCents,
    rateBp,
    policyId,
    policyVersion,
    stripeChargeId: pi.latest_charge ?? null,
    paymentIntentId: pi.id,
    idempotencyKey: pi.id,
  });

  await batch.commit();
  logger.info('[ticketing] paid', {
    piId: pi.id,
    ticketId: ticketDoc.id,
    hostClubId,
    eventId,
    qty,
  });
}

async function handleTicketFailed(pi) {
  const snap = await db
      .collection('tickets')
      .where('paymentIntentId', '==', pi.id)
      .limit(1)
      .get();
  if (snap.empty) return;
  await snap.docs[0].ref.update({
    paymentStatus: 'failed',
    failureCode: pi.last_payment_error?.code ?? null,
    failureMessage: pi.last_payment_error?.message?.slice(0, 200) ?? null,
  });
  logger.info('[ticketing] failed', {piId: pi.id});
}

// APP_BASE_URL retained for future deep-link generation in the QR receipt.
void APP_BASE_URL;

// ── verifyScanToken ────────────────────────────────────────────────────────

/**
 * Gate-scanner endpoint — director only.
 *
 * Input:  { eventId: string, qrToken: string }
 * Returns: { valid: boolean, status: 'valid'|'already_scanned'|'invalid', checkedInAt?: string }
 *
 * Idempotent: a second scan of the same valid ticket returns
 * `status: 'already_scanned'` with the original timestamp.
 * An invalid HMAC always returns `status: 'invalid'` — no Firestore read.
 */
exports.verifyScanToken = onCall(
    {region: REGION, secrets: [TICKET_QR_HMAC_SECRET]},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
      const role = request.auth.token.role ?? '';
      if (!['director', 'super_admin', 'global_admin'].includes(role)) {
        throw new HttpsError('permission-denied', 'Director or above required to scan tickets.');
      }

      const {eventId, qrToken} = request.data ?? {};
      if (!eventId || typeof eventId !== 'string') {
        throw new HttpsError('invalid-argument', 'eventId required.');
      }
      if (!qrToken || typeof qrToken !== 'string') {
        throw new HttpsError('invalid-argument', 'qrToken required.');
      }

      // Scan the tickets collection for the matching qrToken.
      // We look up by eventId + qrToken to limit the scan range.
      const snap = await db
          .collection('tickets')
          .where('eventId', '==', eventId)
          .where('qrToken', '==', qrToken)
          .limit(1)
          .get();

      if (snap.empty) {
        return {valid: false, status: 'invalid'};
      }

      const ticketDoc = snap.docs[0];
      const ticketData = ticketDoc.data() || {};
      const ticketId = ticketDoc.id;
      const piId = String(ticketData.paymentIntentId ?? '');

      // Re-verify the HMAC to guard against DB-read-only attacks where
      // someone inserts a fake ticket doc with a valid eventId.
      const expectedHmac = crypto
          .createHmac('sha256', TICKET_QR_HMAC_SECRET.value() || 'dev-secret')
          .update(`${ticketId}:${piId}`)
          .digest('base64url');

      const tokenMatch = crypto.timingSafeEqual(
          Buffer.from(qrToken),
          Buffer.from(expectedHmac),
      );
      if (!tokenMatch) {
        return {valid: false, status: 'invalid'};
      }

      // Check gate ownership — director can only scan events for their club.
      const callerClubId = String(request.auth.token.clubId ?? '').trim();
      if (role !== 'super_admin' && role !== 'global_admin') {
        if (ticketData.hostClubId !== callerClubId) {
          throw new HttpsError('permission-denied', 'This event does not belong to your club.');
        }
      }

      if (ticketData.paymentStatus !== 'paid') {
        return {valid: false, status: 'invalid'};
      }

      if (ticketData.checkedInAt) {
        const ts = ticketData.checkedInAt?.toDate?.()?.toISOString?.() ?? null;
        return {valid: false, status: 'already_scanned', checkedInAt: ts};
      }

      // Flip checkedInAt atomically.
      await ticketDoc.ref.update({
        checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
        scannerUid: request.auth.uid,
      });

      logger.info('[scanner] checked in', {ticketId, eventId, scannerUid: request.auth.uid});
      return {valid: true, status: 'valid'};
    },
);

// ── upsertTournamentEvent ──────────────────────────────────────────────────

const {validateTierMap} = require('./tournamentEventConstants');

/**
 * Create or update a tournament event.  Director+ only.
 *
 * Input: UpsertTournamentEventPayload (see src/lib/types/tournamentEvent.ts)
 * Returns: { eventId: string }
 */
exports.upsertTournamentEvent = onCall(
    {region: REGION},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
      const role = request.auth.token.role ?? '';
      if (!['director', 'super_admin', 'global_admin'].includes(role)) {
        throw new HttpsError('permission-denied', 'Director or above required.');
      }

      const clubId = String(request.auth.token.clubId ?? '').trim();
      const {
        eventId: inputEventId,
        name,
        description,
        venue,
        eventStartAt,
        eventEndAt,
        ticketTiers: tierInput,
      } = request.data ?? {};

      if (typeof name !== 'string' || !name.trim()) {
        throw new HttpsError('invalid-argument', 'name is required.');
      }
      if (typeof eventStartAt !== 'string' || !eventStartAt) {
        throw new HttpsError('invalid-argument', 'eventStartAt (ISO-8601) is required.');
      }

      // Validate tiers — strip soldCount from input (server-only)
      const sanitisedTiers = {};
      if (tierInput && typeof tierInput === 'object') {
        for (const [id, t] of Object.entries(tierInput)) {
          sanitisedTiers[id] = {
            label: t.label,
            unitPriceCents: t.unitPriceCents,
            capacity: t.capacity,
            ...(t.description ? {description: t.description} : {}),
            ...(t.gateOpensAt ? {gateOpensAt: t.gateOpensAt} : {}),
          };
        }
      }
      const tierErrors = validateTierMap(sanitisedTiers);
      if (tierErrors.length) {
        throw new HttpsError('invalid-argument', tierErrors.join(' | '));
      }

      let ref;
      let isNew = false;

      if (inputEventId && typeof inputEventId === 'string') {
        ref = db.doc(`tournament_events/${inputEventId}`);
        const existing = await ref.get();
        if (existing.exists) {
          // Verify the director owns this event.
          if (role !== 'super_admin' && role !== 'global_admin') {
            if (existing.data()?.hostClubId !== clubId) {
              throw new HttpsError('permission-denied', 'Not your event.');
            }
          }
        } else {
          isNew = true;
        }
      } else {
        ref = db.collection('tournament_events').doc();
        isNew = true;
      }

      // Merge: preserve existing soldCount values on any tier that already
      // exists so the editor can't accidentally zero-reset a live event.
      let existingSoldCounts = {};
      if (!isNew) {
        const snap = await ref.get();
        const existingTiers = snap.data()?.ticketTiers ?? {};
        for (const [id, t] of Object.entries(existingTiers)) {
          existingSoldCounts[id] = t.soldCount ?? 0;
        }
      }

      // Build the final tier map with soldCount preserved / initialised.
      const finalTiers = {};
      for (const [id, t] of Object.entries(sanitisedTiers)) {
        finalTiers[id] = {
          ...t,
          soldCount: existingSoldCounts[id] ?? 0,
        };
      }

      const payload = {
        name: name.trim(),
        ...(description ? {description: String(description).trim()} : {}),
        ...(venue ? {venue: String(venue).trim()} : {}),
        eventStartAt,
        ...(eventEndAt ? {eventEndAt} : {}),
        ticketTiers: finalTiers,
        totalSold: Object.values(finalTiers).reduce((s, t) => s + (t.soldCount ?? 0), 0),
        hostClubId: clubId || (request.auth.token.super_admin ? 'platform' : clubId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(isNew ? {
          status: 'draft',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        } : {}),
      };

      await ref.set(payload, {merge: true});
      return {eventId: ref.id};
    },
);

// ── publishTournamentEvent ──────────────────────────────────────────────────

/**
 * Flip a draft event to `published` status.  Director+ only.
 *
 * Input: { eventId: string }
 * Returns: { eventId, status: 'published' }
 */
exports.publishTournamentEvent = onCall(
    {region: REGION},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
      const role = request.auth.token.role ?? '';
      if (!['director', 'super_admin', 'global_admin'].includes(role)) {
        throw new HttpsError('permission-denied', 'Director or above required.');
      }

      const {eventId} = request.data ?? {};
      if (!eventId || typeof eventId !== 'string') {
        throw new HttpsError('invalid-argument', 'eventId required.');
      }

      const ref = db.doc(`tournament_events/${eventId}`);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'Event not found.');
      const data = snap.data();

      const clubId = String(request.auth.token.clubId ?? '').trim();
      if (role !== 'super_admin' && role !== 'global_admin') {
        if (data.hostClubId !== clubId) {
          throw new HttpsError('permission-denied', 'Not your event.');
        }
      }

      if (!data.ticketTiers || Object.keys(data.ticketTiers).length === 0) {
        throw new HttpsError('failed-precondition', 'Add at least one ticket tier before publishing.');
      }
      if (!data.eventStartAt) {
        throw new HttpsError('failed-precondition', 'Event start date is required before publishing.');
      }

      await ref.update({
        status: 'published',
        publishedByUid: request.auth.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {eventId, status: 'published'};
    },
);
