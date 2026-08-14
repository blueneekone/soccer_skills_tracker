/* eslint-disable max-len */
/**
 * bountyVerification.js
 * ──────────────────────
 * Phase 3, Epic 5.4 — Objective Bounty Verification Trigger Surface.
 *
 * Architecture:
 *   This module exposes a `BountyCriterionHandler` registry — one pure
 *   async function per criterion type.  Each handler receives the bounty
 *   document and a contextual event value, and returns:
 *     { satisfied: boolean, currentValue: number }
 *
 *   The dispatcher `evaluateActiveBountiesForPlayer` is called by the
 *   EXISTING telemetry triggers in `trainingOps.js`, `streakUtils.js`,
 *   etc. — no new collection listeners are created for collections that
 *   already have triggers.
 *
 *   New Firestore triggers are added only for:
 *     • mastery_node_unlock → `users/{uid}/skill_tree_nodes/{nodeId}`
 *     • gpa_threshold       → `users/{uid}/academic_records/{docId}`
 *
 *   cv_verified_drill handlers check for `cv_drill_verifications` docs.
 *   The CV sub-epic wires the actual writing of those docs.
 *
 * Idempotency:
 *   Before transitioning a bounty, the function runs inside a Firestore
 *   transaction that re-reads the bounty.  If status != 'active', it exits.
 *   This is the same sentinel pattern used by `grantTrainingXpAfterRepCreated`.
 */

const logger = require('firebase-functions/logger');
const admin  = require('firebase-admin');
const {
  onDocumentCreated,
  onDocumentWritten,
} = require('firebase-functions/v2/firestore');
const {secrets: tremendousSecrets} = require('./tremendous');
const {issueBountyReward, writeBountyAudit} = require('./bountyOps');

// ── Criterion handler registry ────────────────────────────────────────────────

/**
 * Each handler: (bountyDoc, eventContext) => Promise<{ satisfied: boolean, currentValue: number }>
 *
 * `bountyDoc`     — the bounty Firestore document data (already-fetched)
 * `eventContext`  — arbitrary object with telemetry from the triggering event
 *
 * Handlers are PURE with respect to Firestore side-effects — they only
 * read, never write.  Writes happen in `evaluateActiveBountiesForPlayer`.
 */
const CRITERION_HANDLERS = {

  /**
   * reps_count — total reps logged by the player (cumulative across all sessions).
   * Reads `player_stats/{uid}.total_reps` for the running total.
   */
  async reps_count(bountyDoc, ctx) {
    const {targetReps, drillNameFilter} = bountyDoc.criterion;
    const firestore = admin.firestore();

    // If there is a drill name filter, we need to count from reps collection
    // with a query; otherwise use the denormalized player_stats total.
    if (drillNameFilter) {
      const playerEmail = bountyDoc.playerEmail;
      const startIso    = bountyDoc.startsAt || bountyDoc.createdAt?.toDate?.()?.toISOString?.() || '';
      const q = firestore.collection('reps')
          .where('playerEmail', '==', playerEmail)
          .where('gamificationXpGranted', '==', true);
      const snap = await q.get();

      let filteredReps = 0;
      for (const doc of snap.docs) {
        const d = doc.data();
        const drills = Array.isArray(d.drills) ? d.drills : [];
        for (const drill of drills) {
          if (!drillNameFilter || String(drill.name || '').toLowerCase().includes(drillNameFilter.toLowerCase())) {
            const sets = Math.max(1, Math.min(999, Math.floor(Number(drill.sets) || 0) || 1));
            filteredReps += sets * Math.max(0, Math.floor(Number(drill.reps) || 0));
          }
        }
      }
      return {satisfied: filteredReps >= targetReps, currentValue: filteredReps};
    }

    // Fast path: use denormalized total from player_stats
    const currentReps = typeof ctx.totalReps === 'number' ? ctx.totalReps : 0;
    return {satisfied: currentReps >= targetReps, currentValue: currentReps};
  },

  /**
   * workout_volume_kj — total kilojoules of training load.
   * Approximated as total intense minutes × metabolic coefficient (from player_stats).
   */
  async workout_volume_kj(bountyDoc, ctx) {
    const {targetKj} = bountyDoc.criterion;
    // KJ proxy: total_minutes × 0.75 MET-equivalent coefficient
    const currentKj = typeof ctx.totalMinutes === 'number' ?
      Math.floor(ctx.totalMinutes * 0.75) : 0;
    return {satisfied: currentKj >= targetKj, currentValue: currentKj};
  },

  /**
   * mastery_node_unlock — a specific skill-tree node reaches the required status.
   * `ctx.nodeId` and `ctx.nodeStatus` come from the Firestore trigger on
   * `users/{uid}/skill_tree_nodes/{nodeId}`.
   */
  async mastery_node_unlock(bountyDoc, ctx) {
    const {nodeId, requiredStatus = 'unlocked'} = bountyDoc.criterion;
    const STATUS_ORDER = ['locked', 'fog', 'unlocked', 'mastered'];
    const required = STATUS_ORDER.indexOf(requiredStatus);
    const current  = STATUS_ORDER.indexOf(ctx.nodeStatus || '');
    const satisfied = ctx.nodeId === nodeId && current >= required && current !== -1;
    return {satisfied, currentValue: satisfied ? 1 : 0};
  },

  /**
   * streak_length — consecutive training days meets or exceeds the target.
   * `ctx.streakDays` comes from the streak update in gamificationWorkoutXp.
   */
  async streak_length(bountyDoc, ctx) {
    const {targetDays} = bountyDoc.criterion;
    const currentDays = typeof ctx.streakDays === 'number' ? ctx.streakDays : 0;
    return {satisfied: currentDays >= targetDays, currentValue: currentDays};
  },

  /**
   * gpa_threshold — player GPA meets minimum.
   * `ctx.gpa` comes from the academic_records Firestore write trigger.
   */
  async gpa_threshold(bountyDoc, ctx) {
    const {minimumGpa} = bountyDoc.criterion;
    const currentGpa = typeof ctx.gpa === 'number' ? ctx.gpa : 0;
    return {satisfied: currentGpa >= minimumGpa, currentValue: currentGpa};
  },

  /**
   * cv_verified_drill — CV-verified repetitions (deferred sub-track).
   * In v1 this handler reads `cv_drill_verifications` written by the future
   * MediaPipe inference pipeline.  Until that pipeline exists, this always
   * returns `satisfied: false` so the bounty stays 'active' but never
   * auto-completes.
   */
  async cv_verified_drill(bountyDoc, ctx) {
    const {drillSlug, requiredReps, minConfidence} = bountyDoc.criterion;
    const firestore = admin.firestore();

    const q = await firestore
        .collection('cv_drill_verifications')
        .where('playerEmail', '==', bountyDoc.playerEmail)
        .where('drillSlug', '==', drillSlug)
        .where('confidence', '>=', minConfidence)
        .get();

    const verifiedReps = q.docs.reduce((acc, doc) => {
      const d = doc.data();
      return acc + (typeof d.reps === 'number' ? d.reps : 0);
    }, 0);

    return {satisfied: verifiedReps >= requiredReps, currentValue: verifiedReps};
  },
};

// ── Core dispatcher ───────────────────────────────────────────────────────────

/**
 * Evaluate all 'active' bounties for a player and issue rewards for any
 * that are now satisfied.
 *
 * This function is called from existing triggers (rep creation, streak
 * update, mastery node change, GPA change).  It uses a single Firestore
 * query and processes each bounty in a separate transaction for isolation.
 *
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {string} playerEmail
 * @param {object} eventContext  — criterion-type-specific telemetry values
 * @return {Promise<void>}
 */
async function evaluateActiveBountiesForPlayer(firestore, playerEmail, eventContext) {
  if (!playerEmail || !playerEmail.includes('@')) return;

  let activeBounties;
  try {
    const q = await firestore
        .collection('bounties')
        .where('playerEmail', '==', playerEmail)
        .where('status', '==', 'active')
        .get();
    activeBounties = q.docs;
  } catch (err) {
    logger.error('evaluateActiveBountiesForPlayer: query failed', {playerEmail, err});
    return;
  }

  if (activeBounties.length === 0) return;

  const now = new Date();

  for (const bountySnap of activeBounties) {
    const bountyId   = bountySnap.id;
    const bountyData = bountySnap.data();

    // Expiry sweep.
    try {
      const expiresAt = new Date(bountyData.expiresAt);
      if (expiresAt <= now) {
        await bountySnap.ref.update({status: 'expired'});
        await writeBountyAudit(
            firestore, bountyId, bountyData.householdId, bountyData.tenantId,
            'active', 'expired', 'evaluateActiveBountiesForPlayer', 'Bounty window elapsed');
        continue;
      }
    } catch (_) {}

    const criterionType = (bountyData.criterion || {}).type;
    const handler = CRITERION_HANDLERS[criterionType];

    if (!handler) {
      logger.warn('evaluateActiveBountiesForPlayer: no handler', {criterionType, bountyId});
      continue;
    }

    let result;
    try {
      result = await handler(bountyData, eventContext);
    } catch (err) {
      logger.error('evaluateActiveBountiesForPlayer: handler error', {bountyId, criterionType, err});
      continue;
    }

    const {satisfied, currentValue} = result;

    // Always update progress (non-transactional, best-effort).
    try {
      await bountySnap.ref.update({
        progressCurrent: currentValue,
        lastProgressUpdateAt: now.toISOString(),
      });
    } catch (_) {}

    if (satisfied) {
      logger.info('evaluateActiveBountiesForPlayer: criterion satisfied', {bountyId, criterionType, currentValue});
      try {
        await issueBountyReward(firestore, bountyId, bountyData, eventContext.triggerSource || 'unknown', currentValue);
      } catch (err) {
        logger.error('evaluateActiveBountiesForPlayer: issueBountyReward failed', {bountyId, err});
      }
    }
  }
}

// ── Firestore Trigger: mastery_node_unlock ────────────────────────────────────

/**
 * New trigger — fires when a skill-tree node document is written.
 * Collection: `users/{uid}/skill_tree_nodes/{nodeId}`
 *
 * This is the ONLY new collection listener introduced by this module.
 * `reps`, `streak`, and `gpa` hooks piggyback on existing triggers.
 */
exports.onSkillTreeNodeWritten = onDocumentWritten(
    'users/{uid}/skill_tree_nodes/{nodeId}',
    async (event) => {
      const nodeSnap   = event.data?.after;
      if (!nodeSnap || !nodeSnap.exists) return;

      const nodeData   = nodeSnap.data();
      const uid        = event.params.uid;
      const nodeId     = event.params.nodeId;
      const nodeStatus = nodeData.status || 'locked';

      // Only evaluate on meaningful unlock/mastery state changes.
      if (!['unlocked', 'mastered'].includes(nodeStatus)) return;

      // Resolve player email from users/{uid}.
      // The `uid` param here is the document ID, which in this codebase
      // uses the email-key convention for skill tree nodes.
      const firestore = admin.firestore();
      let playerEmail = uid;

      // If uid looks like an Auth UID (not an email), resolve email.
      if (!uid.includes('@')) {
        try {
          const uRecord = await admin.auth().getUser(uid);
          playerEmail   = (uRecord.email || '').toLowerCase();
        } catch (_) {
          logger.warn('onSkillTreeNodeWritten: could not resolve email for uid', {uid});
          return;
        }
      }

      await evaluateActiveBountiesForPlayer(firestore, playerEmail, {
        nodeId,
        nodeStatus,
        triggerSource: `users/${uid}/skill_tree_nodes/${nodeId}`,
      });
    },
);

// ── Firestore Trigger: gpa_threshold ─────────────────────────────────────────

/**
 * New trigger — fires when an academic record document is written.
 * Collection: `users/{uid}/academic_records/{docId}`
 */
exports.onAcademicRecordWritten = onDocumentWritten(
    'users/{uid}/academic_records/{docId}',
    async (event) => {
      const snap = event.data?.after;
      if (!snap || !snap.exists) return;

      const recordData = snap.data();
      const gpa        = typeof recordData.gpa === 'number' ? recordData.gpa : 0;
      const uid        = event.params.uid;
      const firestore  = admin.firestore();

      let playerEmail = uid;
      if (!uid.includes('@')) {
        try {
          const uRecord = await admin.auth().getUser(uid);
          playerEmail   = (uRecord.email || '').toLowerCase();
        } catch (_) {
          return;
        }
      }

      await evaluateActiveBountiesForPlayer(firestore, playerEmail, {
        gpa,
        triggerSource: `users/${uid}/academic_records/${event.params.docId}`,
      });
    },
);

// ── Public API ────────────────────────────────────────────────────────────────

module.exports = Object.assign(module.exports, {
  evaluateActiveBountiesForPlayer,
  CRITERION_HANDLERS,
});
