'use strict';
/**
 * transitionRecorder.js
 * ──────────────────────
 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S6)
 *
 * Two Firestore triggers:
 *
 * 1. onWorkoutLogCreated (`workout_logs/{logId}`)
 *    Looks up the matching rl_inference_log by (uid, timestamp within 24h prior).
 *    Computes the composite reward and writes `rl_transitions/{tid}` with
 *    { state, action, reward, nextState: null, terminal: false }.
 *
 * 2. onPhysioReportCreated (`physio_self_reports/{uid}/daily/{date}`)
 *    Finds the most recent rl_transitions row with nextState: null for this uid,
 *    builds the nextState vector, and patches it in.
 *
 * Reward formula (composite, normalised to ≈ [-1, +1]):
 *   +0.40 * tanh(earnedXP / expectedXP)      engagement
 *   +0.25 * adherence_flag                   coach-intent attribute serviced
 *   +0.15 * tanh(skill_delta_30d)            learning proxy
 *   -0.20 * overtraining_penalty             ACWR > 1.5 OR soreness > 4 next-morning
 *   -0.10 * recovery_skip_penalty            recovery mode forced but pushed high-RPE
 *   +0.10 * grit_bonus                       grit_award row earned this session
 */

const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {calculateTrainingSessionEarnedXp} = require('../../gamificationWorkoutXp');
const {buildStateVector} = require('./featureBuilder');

const REGION = 'us-central1';

/** @returns {import('firebase-admin').firestore.Firestore} */
const db = () => admin.firestore();

const DAY_MS = 86400_000;

/**
 * Convert Firestore Timestamp / Date / string to ms since epoch.
 * @param {unknown} ts
 */
function toMs(ts) {
  if (!ts) return 0;
  if (typeof ts === 'object' && 'toDate' in ts) return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

function expectedXpFromLogDoc(logDoc) {
  const duration = Math.max(0, Math.floor(Number(logDoc.duration) || 0));
  const reps = Math.max(0, Math.floor(Number(logDoc.reps) || 0));
  const intensity =
    logDoc.intensity === 'high' || logDoc.intensity === 'medium' || logDoc.intensity === 'low' ?
      logDoc.intensity :
      'medium';
  return Math.max(1, calculateTrainingSessionEarnedXp({duration, reps, intensity}));
}

/**
 * Compute the composite reward for a completed workout transition.
 *
 * @param {object} logDoc      workout_logs document data
 * @param {object} inferLog    matching rl_inference_log document data (or null)
 * @param {object} playerStats player_stats document data
 * @param {boolean} hasGritAward
 * @returns {{ total: number, engagementTerm: number, adherenceTerm: number,
 *             learningTerm: number, overtrainingPenalty: number,
 *             recoverySkipPenalty: number, gritBonus: number }}
 */
function computeReward(logDoc, inferLog, playerStats, hasGritAward) {
  // Engagement: tanh(earnedXP / expectedXP) — expectedXP from gamificationWorkoutXp (logTrainingSession parity).
  const earnedXP = Number(logDoc.earnedXP ?? 0);
  const expectedXP = expectedXpFromLogDoc(logDoc);
  const engagementTerm = 0.40 * Math.tanh(earnedXP / expectedXP);

  // Adherence: did the workout service the coach's intent attribute?
  let adherenceTerm = 0;
  if (inferLog) {
    const coachAttr = inferLog.state?.vector ?
      // Decode coach-intent onehot from state vector (indices 13-18)
      (() => {
        const vec = inferLog.state.vector;
        const names = inferLog.state.featureNames ?? [];
        for (let i = 13; i <= 18; i++) {
          if (vec[i] > 0.5) return names[i]?.replace('coachIntentAttrIdx', '') ?? null;
        }
        return null;
      })() :
      null;
    const chosenAttrId = inferLog.chosenAction?.drillId ? null : null; // drill attribute not stored directly
    // Approximate: if chosenAction matches any non-zero coach-intent slot → adherence
    const coachIntentActive = inferLog.state?.vector ?
      inferLog.state.vector.slice(13, 19).some((v) => v > 0.5) :
      false;
    adherenceTerm = coachIntentActive ? 0.25 : 0;
  }

  // Learning proxy: skill delta for the target attribute over last 30 days.
  // Approximated as earnedXP ratio above 1.0 → range [0, 1].
  const skillDelta = Math.max(-1, Math.min(1, (earnedXP / expectedXP) - 1));
  const learningTerm = 0.15 * Math.tanh(skillDelta);

  // Overtraining: penalise if ACWR proxy is high (state vector ACWR index 10,
  // un-normalised = stateVec[10] * 2.0) or soreness from logDoc > 4.
  const soreness = typeof logDoc.soreness === 'number' ? logDoc.soreness : 0;
  const stateAcwr = inferLog?.state?.vector ? inferLog.state.vector[10] * 2.0 : 0;
  const stateRpe7 = inferLog?.state?.vector ? inferLog.state.vector[0] * 10 : 0;
  const overtrained = stateAcwr > 1.5 || soreness > 4 || stateRpe7 > 8.5;
  const overtrainingPenalty = overtrained ? -0.20 : 0;

  // Recovery-skip penalty: policy chose recovery mode but player pushed high-intensity.
  const policyIntensity = inferLog?.chosenAction?.intensityBucket ?? '';
  const actualRpe = typeof logDoc.subjectiveRpe === 'number' ? logDoc.subjectiveRpe : 5;
  const recoverySkipPenalty =
    (policyIntensity === 'recovery' && actualRpe > 7) ? -0.10 : 0;

  // Grit bonus.
  const gritBonus = hasGritAward ? 0.10 : 0;

  const total = engagementTerm + adherenceTerm + learningTerm +
                overtrainingPenalty + recoverySkipPenalty + gritBonus;

  return {
    total: Math.max(-1, Math.min(1, total)),
    engagementTerm,
    adherenceTerm,
    learningTerm,
    overtrainingPenalty,
    recoverySkipPenalty,
    gritBonus,
  };
}

// ── Trigger 1: workout log created ────────────────────────────────────────────

exports.onWorkoutLogCreated = onDocumentCreated(
    {document: 'workout_logs/{logId}', region: REGION},
    async (event) => {
      const logDoc = event.data?.data();
      if (!logDoc) return;

      const uid = String(logDoc.playerId ?? '');
      if (!uid) return;

      const logTs = toMs(logDoc.timestamp);
      if (!logTs) return;

      // Find matching rl_inference_log within 24h prior to this workout log.
      const lookbackTs = admin.firestore.Timestamp.fromMillis(logTs - 24 * DAY_MS);
      const logTimestamp = admin.firestore.Timestamp.fromMillis(logTs);

      let inferLog = null;
      try {
        const inferSnap = await db()
            .collection('rl_inference_log')
            .where('uid', '==', uid)
            .where('createdAt', '>=', lookbackTs)
            .where('createdAt', '<=', logTimestamp)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (!inferSnap.empty) {
          inferLog = {id: inferSnap.docs[0].id, ...inferSnap.docs[0].data()};
        }
      } catch (err) {
        console.error('[transitionRecorder] inference log lookup error:', err);
      }

      // Only record a transition if we have a matching inference log.
      if (!inferLog) return;

      // Fetch player_stats for reward calculation.
      const psSnap = await db().collection('player_stats').doc(uid).get();
      const playerStats = psSnap.exists ? psSnap.data() : {};

      // Check for a grit award tied to this workout within the last hour.
      const gritSnap = await db()
          .collection('grit_awards')
          .where('uid', '==', uid)
          .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(logTs - 3600_000))
          .limit(1)
          .get();
      const hasGritAward = !gritSnap.empty;

      const reward = computeReward(logDoc, inferLog, playerStats, hasGritAward);

      const workoutDateUtc = new Date(logTs).toISOString().slice(0, 10);
      const policyVersion = Number(inferLog.policyVersion ?? 0);

      const tidRef = db().collection('rl_transitions').doc();
      await tidRef.set({
        tid: tidRef.id,
        uid,
        state: inferLog.state ?? null,
        action: inferLog.chosenAction ?? null,
        reward,
        nextState: null,
        terminal: false,
        inferenceLogId: inferLog.id,
        tdErrorAbs: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        patchedAt: null,
        workoutDateUtc,
        policyVersion,
      });
    },
);

// ── Trigger 2: physio report created ─────────────────────────────────────────

exports.onPhysioReportCreated = onDocumentCreated(
    {document: 'physio_self_reports/{uid}/daily/{dateDoc}', region: REGION},
    async (event) => {
      const uid = event.params?.uid;
      if (!uid) return;

      // Find the most recent rl_transitions row with nextState: null for this uid.
      let transSnap;
      try {
        transSnap = await db()
            .collection('rl_transitions')
            .where('uid', '==', uid)
            .where('nextState', '==', null)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
      } catch (err) {
        console.error('[transitionRecorder] transition lookup error:', err);
        return;
      }

      if (transSnap.empty) return;

      // Build nextState vector from current player state + this new physio report.
      let nextState = null;
      try {
        const stateResult = await buildStateVector(uid, new Date());
        nextState = {
          vector: stateResult.vector,
          featureNames: stateResult.featureNames,
          builtAt: stateResult.builtAt,
        };
      } catch (err) {
        console.error('[transitionRecorder] nextState build error:', err);
        return;
      }

      await transSnap.docs[0].ref.update({
        nextState,
        patchedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
);

module.exports.computeReward = computeReward;
module.exports.expectedXpFromLogDoc = expectedXpFromLogDoc;
