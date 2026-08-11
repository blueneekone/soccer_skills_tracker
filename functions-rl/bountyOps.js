/* eslint-disable max-len */
/**
 * bountyOps.js
 * ─────────────
 * Phase 3, Epic 5.4 — Parent Co-Op & Automated Escrow Bounties.
 *
 * Cloud Function callables:
 *   • linkTremendousFundingSource  — parent links a bank/card funding source.
 *   • createBountyEscrow           — parent creates an objective bounty.
 *   • voidBounty                   — parent cancels an active/verified bounty.
 *   • issueBountyReward            — INTERNAL; called by bountyVerification only.
 *
 * Security model:
 *   - Every callable re-validates household guardianship via Firestore
 *     (same `households` collection the COPPA layer uses).
 *   - No client call ever touches Tremendous directly.
 *   - All Firestore writes use Admin SDK (bypasses rules) but enforce
 *     guardianship / status guards in application code.
 */

const logger  = require('firebase-functions/logger');
const admin   = require('firebase-admin');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const {
  listFundingSources,
  getFundingSource,
  upsertRecipient,
  createBountyOrder,
} = require('./tremendous');

const db = admin.firestore;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise email to lowercase key convention. */
function normEmail(e) {
  return String(e == null ? '' : e).trim().toLowerCase();
}

/**
 * Verify the caller is a `parent` and that their household includes `playerEmail`.
 * Returns the household document data if valid.
 * Throws HttpsError if not authorised.
 *
 * @param {string} callerEmail
 * @param {string} callerHouseholdId  — from JWT custom claims
 * @param {string} playerEmail
 * @param {FirebaseFirestore.Firestore} firestore
 * @return {Promise<FirebaseFirestore.DocumentData>}
 */
async function assertGuardianship(callerEmail, callerHouseholdId, playerEmail, firestore) {
  if (!callerHouseholdId) {
    throw new HttpsError('permission-denied', 'No household claim on token.');
  }

  const hhSnap = await firestore
      .collection('households')
      .doc(callerHouseholdId)
      .get();

  if (!hhSnap.exists) {
    throw new HttpsError('not-found', 'Household not found.');
  }

  const hhData = hhSnap.data();
  const parentEmails = Array.isArray(hhData.parentEmails) ? hhData.parentEmails : [];
  const playerEmails = Array.isArray(hhData.playerEmails) ? hhData.playerEmails : [];

  if (!parentEmails.includes(callerEmail)) {
    throw new HttpsError('permission-denied', 'Caller is not a guardian of this household.');
  }

  if (!playerEmails.includes(playerEmail)) {
    throw new HttpsError('permission-denied', 'Player is not a member of this household.');
  }

  return hhData;
}

/**
 * Write a bounty audit event.
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {string} bountyId
 * @param {string} householdId
 * @param {string} tenantId
 * @param {string|null} fromStatus
 * @param {string} toStatus
 * @param {string} actor
 * @param {string} [reason]
 */
async function writeBountyAudit(
    firestore, bountyId, householdId, tenantId,
    fromStatus, toStatus, actor, reason) {
  try {
    await firestore.collection('bounty_audit').add({
      bountyId,
      householdId,
      tenantId,
      fromStatus: fromStatus || null,
      toStatus,
      actor,
      reason: reason || null,
      occurredAt: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    logger.error('writeBountyAudit failed', {bountyId, err});
  }
}

// ── Callable: linkTremendousFundingSource ─────────────────────────────────────

/**
 * Returns available Tremendous funding sources for the parent to choose from.
 * Persists the chosen `fundingSourceId` onto `households/{id}.coOp.tremendous`.
 *
 * In v1 we use the platform's own Tremendous funding sources (shared account
 * model). The parent picks from the list and the selection is stored for use
 * in future bounty orders. A future sub-epic can migrate to per-household
 * connected accounts.
 *
 * Input:  { fundingSourceId: string }  (parent selects from the list)
 * Output: { fundingSourceId, label, method }
 */
exports.linkTremendousFundingSource = onCall(
    {secrets: [require('./tremendous').TREMENDOUS_API_KEY]},
    async (req) => {
      if (!req.auth) throw new HttpsError('unauthenticated', 'Login required.');

      const callerEmail     = normEmail(req.auth.token.email);
      const householdId     = req.auth.token.householdId || '';
      const {fundingSourceId} = req.data || {};

      if (!fundingSourceId) {
        throw new HttpsError('invalid-argument', 'fundingSourceId is required.');
      }

      const firestore = admin.firestore();
      const hhSnap = await firestore.collection('households').doc(householdId).get();
      if (!hhSnap.exists) throw new HttpsError('not-found', 'Household not found.');

      const hhData = hhSnap.data();
      const parentEmails = Array.isArray(hhData.parentEmails) ? hhData.parentEmails : [];
      if (!parentEmails.includes(callerEmail)) {
        throw new HttpsError('permission-denied', 'Not a guardian of this household.');
      }

      let fsData;
      try {
        fsData = await getFundingSource(fundingSourceId);
      } catch (err) {
        logger.error('linkTremendousFundingSource: getFundingSource failed', {err});
        throw new HttpsError('internal', 'Could not verify funding source with Tremendous.');
      }

      const coOpMap = {
        'coOp.tremendous': {
          fundingSourceId,
          label: fsData.label || fsData.method || 'Linked Account',
          method: fsData.method || 'UNKNOWN',
          linkedAt: new Date().toISOString(),
          linkedByEmail: callerEmail,
        },
      };

      await firestore
          .collection('households')
          .doc(householdId)
          .update(coOpMap);

      logger.info('linkTremendousFundingSource: linked', {householdId, fundingSourceId});
      return {
        fundingSourceId,
        label: coOpMap['coOp.tremendous'].label,
        method: coOpMap['coOp.tremendous'].method,
      };
    },
);

/**
 * List available Tremendous funding sources (so the parent can pick one).
 * Separate from `linkTremendousFundingSource` to follow SRP.
 */
exports.listTremendousFundingSources = onCall(
    {secrets: [require('./tremendous').TREMENDOUS_API_KEY]},
    async (req) => {
      if (!req.auth) throw new HttpsError('unauthenticated', 'Login required.');
      const callerEmail = normEmail(req.auth.token.email);
      const householdId = req.auth.token.householdId || '';

      const firestore = admin.firestore();
      const hhSnap = await firestore.collection('households').doc(householdId).get();
      if (!hhSnap.exists) throw new HttpsError('not-found', 'Household not found.');
      const parentEmails = Array.isArray(hhSnap.data().parentEmails) ?
        hhSnap.data().parentEmails : [];
      if (!parentEmails.includes(callerEmail)) {
        throw new HttpsError('permission-denied', 'Not a guardian of this household.');
      }

      const sources = await listFundingSources();
      return {fundingSources: sources.map((s) => ({
        id: s.id,
        label: s.label || s.method || s.id,
        method: s.method,
      }))};
    },
);

// ── Callable: createBountyEscrow ──────────────────────────────────────────────

/**
 * Parent creates an objective escrow bounty for a child player.
 * No money moves at this point — Tremendous order is created only on completion.
 *
 * Input:
 *   {
 *     playerEmail: string,
 *     title: string,
 *     description?: string,
 *     criterion: BountyCriterion,   (see src/lib/types/bounty.ts)
 *     rewardCents: number,
 *     currency?: string,
 *     expiresAt: string,            (ISO-8601)
 *   }
 *
 * Output: { bountyId: string }
 */
exports.createBountyEscrow = onCall(
    {secrets: [require('./tremendous').TREMENDOUS_API_KEY]},
    async (req) => {
      if (!req.auth) throw new HttpsError('unauthenticated', 'Login required.');

      const callerEmail   = normEmail(req.auth.token.email);
      const householdId   = req.auth.token.householdId || '';
      const clubId        = req.auth.token.clubId || req.auth.token.tenantId || '';

      const {
        playerEmail: rawPlayer,
        title,
        description,
        criterion,
        rewardCents,
        currency = 'USD',
        expiresAt,
      } = req.data || {};

      // ── Validation ───────────────────────────────────────────────────────
      if (!rawPlayer || !title || !criterion || !rewardCents || !expiresAt) {
        throw new HttpsError(
            'invalid-argument',
            'playerEmail, title, criterion, rewardCents, and expiresAt are required.',
        );
      }

      const playerEmail = normEmail(rawPlayer);

      if (!Number.isFinite(rewardCents) || rewardCents < 100) {
        throw new HttpsError('invalid-argument', 'rewardCents must be at least 100 (= $1.00).');
      }

      const VALID_CRITERION_TYPES = [
        'reps_count', 'workout_volume_kj', 'mastery_node_unlock',
        'streak_length', 'gpa_threshold', 'cv_verified_drill',
      ];
      if (!criterion.type || !VALID_CRITERION_TYPES.includes(criterion.type)) {
        throw new HttpsError('invalid-argument', `Unknown criterion type: ${criterion.type}`);
      }

      const expiresDate = new Date(expiresAt);
      if (isNaN(expiresDate.getTime()) || expiresDate <= new Date()) {
        throw new HttpsError('invalid-argument', 'expiresAt must be a future ISO-8601 date.');
      }

      // ── Guardianship assertion ──────────────────────────────────────────
      const firestore = admin.firestore();
      const hhData = await assertGuardianship(
          callerEmail, householdId, playerEmail, firestore);

      // ── Funding source check ────────────────────────────────────────────
      const tremendous = (hhData.coOp || {}).tremendous || null;
      if (!tremendous || !tremendous.fundingSourceId) {
        throw new HttpsError(
            'failed-precondition',
            'No funding source linked. Call linkTremendousFundingSource first.',
        );
      }

      // ── Compute progress tracking fields ──────────────────────────────
      let progressTarget = 0;
      let progressUnit   = '';
      switch (criterion.type) {
        case 'reps_count':
          progressTarget = criterion.targetReps;
          progressUnit   = 'reps';
          break;
        case 'workout_volume_kj':
          progressTarget = criterion.targetKj;
          progressUnit   = 'KJ';
          break;
        case 'streak_length':
          progressTarget = criterion.targetDays;
          progressUnit   = 'days';
          break;
        case 'gpa_threshold':
          progressTarget = criterion.minimumGpa;
          progressUnit   = 'GPA';
          break;
        case 'mastery_node_unlock':
        case 'cv_verified_drill':
          progressTarget = 1;
          progressUnit   = 'completion';
          break;
      }

      // ── Write bounty doc ─────────────────────────────────────────────
      const now = new Date().toISOString();
      const bountyData = {
        tenantId: clubId,
        clubId,
        householdId,
        parentEmail: callerEmail,
        playerEmail,
        title: String(title).trim().slice(0, 200),
        description: description ? String(description).trim().slice(0, 1000) : null,
        criterion,
        rewardCents: Math.floor(rewardCents),
        currency: String(currency).toUpperCase(),
        status: 'active',
        expiresAt,
        fundingSourceId: tremendous.fundingSourceId,
        tremendousOrderId: null,
        tremendousRecipientId: null,
        progressCurrent: 0,
        progressTarget,
        progressUnit,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        startsAt: now,
        verifiedAt: null,
        paidAt: null,
        voidedAt: null,
        voidedBy: null,
        lastProgressUpdateAt: null,
      };

      const bountyRef = await firestore.collection('bounties').add(bountyData);
      const bountyId  = bountyRef.id;

      await writeBountyAudit(
          firestore, bountyId, householdId, clubId,
          null, 'active', 'createBountyEscrow', 'Parent created bounty');

      // Notify child player (non-fatal).
      try {
        const {dispatchBountyCreated} = require('./src/domains/notificationOps');
        await dispatchBountyCreated(firestore, bountyData, bountyId);
      } catch (notifyErr) {
        logger.warn('createBountyEscrow: notification failed', {bountyId, err: notifyErr});
      }

      logger.info('createBountyEscrow: created', {bountyId, playerEmail, callerEmail});
      return {bountyId};
    },
);

// ── Callable: voidBounty ──────────────────────────────────────────────────────

/**
 * Guardian cancels an active or verified bounty.
 * Only the creating parent can void; status must be 'active' or 'verified'.
 *
 * Input:  { bountyId: string }
 * Output: { success: true }
 */
exports.voidBounty = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required.');

  const callerEmail = normEmail(req.auth.token.email);
  const householdId = req.auth.token.householdId || '';
  const {bountyId}  = req.data || {};

  if (!bountyId) throw new HttpsError('invalid-argument', 'bountyId is required.');

  const firestore = admin.firestore();
  const bountyRef = firestore.collection('bounties').doc(bountyId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(bountyRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Bounty not found.');

    const d = snap.data();
    if (d.parentEmail !== callerEmail) {
      throw new HttpsError('permission-denied', 'Only the creating parent can void this bounty.');
    }
    if (d.householdId !== householdId) {
      throw new HttpsError('permission-denied', 'Household mismatch.');
    }
    if (!['active', 'verified'].includes(d.status)) {
      throw new HttpsError('failed-precondition', `Cannot void a bounty in status: ${d.status}`);
    }

    tx.update(bountyRef, {
      status: 'voided',
      voidedAt: new Date().toISOString(),
      voidedBy: callerEmail,
    });
  });

  const snap = await bountyRef.get();
  const d    = snap.data();
  await writeBountyAudit(
      firestore, bountyId, householdId, d.tenantId,
      'active', 'voided', 'voidBounty', `Voided by ${callerEmail}`);

  logger.info('voidBounty: voided', {bountyId, callerEmail});
  return {success: true};
});

// ── Internal: issueBountyReward ────────────────────────────────────────────────

/**
 * Internal function — NOT exported as a public Cloud Function callable.
 * Called by bountyVerification.js when criteria are confirmed satisfied.
 *
 * Places the Tremendous order, updates bounty status to 'verified',
 * and writes the completion record.
 *
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {string} bountyId
 * @param {object} bountyData  — already-fetched bounty document data
 * @param {string} triggerSource  — e.g. 'reps/repId'
 * @param {number} finalValue  — measured value that satisfied the criterion
 * @return {Promise<void>}
 */
async function issueBountyReward(firestore, bountyId, bountyData, triggerSource, finalValue) {
  const {
    tenantId, householdId, parentEmail, playerEmail,
    title, rewardCents, currency, fundingSourceId, criterion,
  } = bountyData;

  // Guard: only process 'active' bounties (idempotency).
  if (bountyData.status !== 'active') {
    logger.warn('issueBountyReward: skipping non-active bounty', {bountyId, status: bountyData.status});
    return;
  }

  const bountyRef       = firestore.collection('bounties').doc(bountyId);
  const completionRef   = firestore.collection('bounty_completions').doc(bountyId);

  // ── Get player display name ─────────────────────────────────────────────
  let playerName = playerEmail;
  try {
    const userSnap = await firestore.collection('users').doc(playerEmail).get();
    if (userSnap.exists) {
      playerName = userSnap.data().playerName || playerEmail;
    }
  } catch (_) {}

  // ── Create Tremendous order ─────────────────────────────────────────────
  let orderId      = '';
  let recipientId  = '';

  try {
    const result = await createBountyOrder({
      fundingSourceId,
      recipientName: playerName,
      recipientEmail: playerEmail,
      valueCents: rewardCents,
      currency: currency || 'USD',
      bountyId,
      bountyTitle: title,
    });
    orderId     = result.orderId;
    recipientId = result.recipientId;
  } catch (err) {
    logger.error('issueBountyReward: createBountyOrder failed', {bountyId, err});
    // Transition to 'failed' so the UI can show an error state.
    await bountyRef.update({
      status: 'failed',
      verifiedAt: new Date().toISOString(),
    });
    await writeBountyAudit(
        firestore, bountyId, householdId, tenantId,
        'active', 'failed', 'issueBountyReward', `Tremendous order failed: ${err.message}`);
    return;
  }

  const now = new Date().toISOString();

  // ── Atomic transition: active → verified ─────────────────────────────────
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(bountyRef);
    if (!snap.exists) return;
    const fresh = snap.data();
    if (fresh.status !== 'active') return; // Double-dispatch guard.

    tx.update(bountyRef, {
      status: 'verified',
      tremendousOrderId: orderId,
      tremendousRecipientId: recipientId,
      verifiedAt: now,
      progressCurrent: finalValue,
    });

    tx.set(completionRef, {
      bountyId,
      householdId,
      tenantId,
      parentEmail,
      playerEmail,
      criterionType: criterion.type,
      finalValue,
      verifiedAt: now,
      triggerSource,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await writeBountyAudit(
      firestore, bountyId, householdId, tenantId,
      'active', 'verified', 'issueBountyReward',
      `Order ${orderId} placed via Tremendous`);

  // Notify parent + child (non-fatal).
  try {
    const {dispatchBountyVerified} = require('./src/domains/notificationOps');
    await dispatchBountyVerified(firestore, bountyData, bountyId);
  } catch (notifyErr) {
    logger.warn('issueBountyReward: notification failed', {bountyId, err: notifyErr});
  }

  logger.info('issueBountyReward: verified', {bountyId, orderId, playerEmail});
}

module.exports = {
  issueBountyReward,
  writeBountyAudit,
};
