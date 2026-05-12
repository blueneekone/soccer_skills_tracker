'use strict';
/**
 * rlOps.js
 * ────────
 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine
 *
 * Cloud Function callables for:
 *   • submitPhysioSelfReport  — daily player physiological self-report (S2)
 *   • initRlPolicy            — cold-boot: mint v1 random-weight policy (S4)
 *   • getAdaptiveWorkoutPolicy — inference + epsilon-greedy rollout (S5)
 *   • setPolicyAbPercent      — adjust A/B rollout percentage (S10)
 *   • freezeRlPolicy          — emergency kill-switch (S10)
 *   • rollbackRlPolicy        — revert to a prior GCS model version (S10)
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const REGION = 'us-central1';

/** @returns {import('firebase-admin').firestore.Firestore} */
const db = () => admin.firestore();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns today's UTC date as 'yyyy-mm-dd'.
 * @param {Date} [now]
 * @returns {string}
 */
function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Assert that the caller has the super_admin role.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
function assertSuper(request) {
  const role = request.auth?.token?.role;
  if (role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'super_admin role required.');
  }
}

// ── submitPhysioSelfReport ────────────────────────────────────────────────────

/**
 * Writes (or no-ops if already submitted today) a physio_self_reports daily doc.
 *
 * Firestore path: physio_self_reports/{uid}/daily/{yyyy-mm-dd}
 * Immutability enforced here: we check existence before creating.
 *
 * Input: { sleepHours, soreness, mood, restingFeel }
 * Result: { dateUtc, alreadySubmittedToday }
 */
exports.submitPhysioSelfReport = onCall({region: REGION}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const data = request.data || {};

  const sleepHours = Number(data.sleepHours);
  const soreness   = Math.round(Number(data.soreness));
  const mood       = Math.round(Number(data.mood));
  const restingFeel = Math.round(Number(data.restingFeel));

  if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 12) {
    throw new HttpsError('invalid-argument', 'sleepHours must be 0-12.');
  }
  if (!Number.isFinite(soreness) || soreness < 1 || soreness > 5) {
    throw new HttpsError('invalid-argument', 'soreness must be 1-5.');
  }
  if (!Number.isFinite(mood) || mood < 1 || mood > 5) {
    throw new HttpsError('invalid-argument', 'mood must be 1-5.');
  }
  if (!Number.isFinite(restingFeel) || restingFeel < 1 || restingFeel > 5) {
    throw new HttpsError('invalid-argument', 'restingFeel must be 1-5.');
  }

  const dateUtc = todayUtc();
  const docRef = db()
      .collection('physio_self_reports')
      .doc(uid)
      .collection('daily')
      .doc(dateUtc);

  const snap = await docRef.get();
  if (snap.exists) {
    return {dateUtc, alreadySubmittedToday: true};
  }

  await docRef.set({
    uid,
    dateUtc,
    sleepHours,
    soreness,
    mood,
    restingFeel,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {dateUtc, alreadySubmittedToday: false};
});

// ── initRlPolicy (cold-boot) ──────────────────────────────────────────────────

const {PolicyModel} = require('./src/ml/policyModel');

/**
 * Mint policy v1 with random weights when rl_policy_state/current is empty.
 * Also supports `force: true` to overwrite an existing v1 (dev/reset use).
 *
 * Input: { force?: boolean }
 * Result: { policyVersion, gcsPath }
 */
exports.initRlPolicy = onCall({region: REGION, timeoutSeconds: 120, memory: '1GiB'}, async (request) => {
  assertSuper(request);
  const force = Boolean(request.data?.force);

  const ref = db().collection('rl_policy_state').doc('current');
  const snap = await ref.get();

  if (snap.exists && !force) {
    const d = snap.data();
    return {policyVersion: d.policyVersion, gcsPath: d.gcsPath};
  }

  const targetVersion = 1;
  const pm = PolicyModel.randomPolicy();
  const gcsPath = await pm.saveToGcs(targetVersion);

  const policyStateDoc = {
    policyVersion: targetVersion,
    gcsPath,
    abPercent: 0,
    frozen: false,
    deployedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedByUid: request.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.set(policyStateDoc);
  return {policyVersion: targetVersion, gcsPath};
});

// ── getAdaptiveWorkoutPolicy (full implementation — S5) ───────────────────────

const {buildStateVector}        = require('./src/ml/featureBuilder');
const {enumerateCandidates}     = require('./src/ml/drillCandidates');
const {getWarmModel}            = require('./src/ml/policyModel');
const {applySafetyConstraints}  = require('./src/ml/safetyLayer');

/** Simple uint32 hash of a string → 0-99 bucket for A/B rollout. */
function uidBucket(uid) {
  let h = 5381;
  for (let i = 0; i < uid.length; i++) {
    h = ((h << 5) + h) ^ uid.charCodeAt(i);
  }
  return Math.abs(h) % 100;
}

/**
 * Maps ACWR and rolling RPE to an ExplanationCode.
 * @param {number[]} stateVec
 * @returns {string}
 */
function deriveExplanationCode(stateVec, explorationFlag) {
  if (explorationFlag) return 'EXPLORATION';
  const acwr    = stateVec[10] * 2.0;  // un-normalise
  const rpe7d   = stateVec[0]  * 10;
  const soreness3d = stateVec[2] * 5;
  if (acwr > 1.5 || rpe7d > 8.5 || soreness3d > 4) return 'RECOVERY_FORCED';
  if (stateVec[40] > 0) return 'COACH_PRIORITY';
  if (acwr < 0.6 || rpe7d < 2) return 'RESTING';
  if (acwr > 1.1) return 'PEAK';
  return 'BUILDING';
}

/**
 * Convert volumeBucket + last session duration to recommended minutes.
 * Baseline = 30 min; each bucket step = ±5 min.
 * @param {number} volumeBucket
 * @param {number[]} stateVec
 */
function bucketToMinutes(volumeBucket, stateVec) {
  const lastDuration = Math.round(stateVec[29] * 90); // un-normalise
  const baseline = lastDuration > 0 ? lastDuration : 30;
  return Math.max(10, Math.min(90, baseline + volumeBucket * 5));
}

/**
 * Convert intensityBucket to target RPE (1-10).
 * @param {string} intensityBucket
 */
function bucketToRpe(intensityBucket) {
  switch (intensityBucket) {
    case 'recovery': return 3;
    case 'low': return 4;
    case 'medium': return 6;
    case 'high': return 8;
    default: return 5;
  }
}

/**
 * getAdaptiveWorkoutPolicy
 *
 * Steps:
 *  1. Read rl_policy_state/current — bail to heuristic if frozen or abPercent = 0.
 *  2. Hash(uid) % 100 vs abPercent for A/B rollout.
 *  3. Build state vector.
 *  4. Enumerate drill candidates.
 *  5. Load warm model from GCS cache.
 *  6. ε-greedy action selection.
 *  7. Apply safety constraints (S8 stub: just age-band duration cap).
 *  8. Write rl_inference_log/{logId}.
 *  9. Return policy recommendation.
 *
 * Min instances = 1 keeps the TF.js model warm.
 */
exports.getAdaptiveWorkoutPolicy = onCall(
    {region: REGION, minInstances: 1, memory: '512MiB'},
    async (request) => {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Sign in required.');
      }
      const uid = request.auth.uid;
      const sportId = String(request.data?.sportId ?? 'soccer');

      const heuristic = () => ({
        mode: 'heuristic',
        recommendedDrillId: null,
        recommendedDurationMinutes: null,
        recommendedTargetRpe: null,
        policyVersion: null,
        explorationFlag: false,
        explanationCode: null,
        explanationText: null,
      });

      // Step 1 — read policy state
      let policyState;
      try {
        const snap = await db().collection('rl_policy_state').doc('current').get();
        if (!snap.exists) return heuristic();
        policyState = snap.data();
      } catch {
        return heuristic();
      }

      if (policyState.frozen || policyState.abPercent === 0) return heuristic();

      // Step 2 — A/B rollout
      if (uidBucket(uid) >= policyState.abPercent) return heuristic();

      const policyVersion = Number(policyState.policyVersion);

      try {
        // Step 3 — state vector
        const stateResult = await buildStateVector(uid, new Date());
        const stateVec = stateResult.vector;

        // Derive ageBand from state vector onehot
        const ageBand = stateVec[20] > 0.5 ? 'under13' :
            stateVec[21] > 0.5 ? 'teen13to16' : 'adult';

        // Recovery mode: ACWR > 1.5 OR rolling 7d RPE > 8.5 OR soreness > 4
        const recoveryMode =
            stateVec[10] * 2.0 > 1.5 ||
            stateVec[0]  * 10  > 8.5 ||
            stateVec[2]  * 5   > 4;

        // Step 4 — enumerate candidates
        const candidates = await enumerateCandidates(sportId, ageBand, recoveryMode);
        if (candidates.length === 0) return heuristic();

        // Step 5 — load model
        const model = await getWarmModel(policyVersion);

        // Step 6 — ε-greedy
        const epsilon = Math.max(0.05, 0.3 / Math.sqrt(policyVersion));
        const explorationFlag = Math.random() < epsilon;

        let chosenDrillId, chosenVolume, chosenIntensity, chosenQValue;

        if (explorationFlag) {
          const randCand = candidates[Math.floor(Math.random() * candidates.length)];
          const {VOLUME_BUCKETS, INTENSITY_BUCKETS} = require('./src/ml/policyModel');
          chosenDrillId   = randCand.drillId;
          chosenVolume    = VOLUME_BUCKETS[Math.floor(Math.random() * VOLUME_BUCKETS.length)];
          chosenIntensity = INTENSITY_BUCKETS[Math.floor(Math.random() * INTENSITY_BUCKETS.length)];
          chosenQValue    = 0;
        } else {
          const predictions = model.predictQ(stateVec, candidates);
          if (predictions.length === 0) return heuristic();
          const best = predictions.reduce((b, p) => (p.qValue > b.qValue ? p : b), predictions[0]);
          chosenDrillId   = best.drillId;
          chosenVolume    = best.volumeBucket;
          chosenIntensity = best.intensityBucket;
          chosenQValue    = best.qValue;
        }

        // Step 7 — full safety constraint layer (S8)
        const proposedDuration = bucketToMinutes(chosenVolume, stateVec);

        // Find the chosen drill's tier + attributeId for the advanced-drill downgrade check
        const chosenCand = candidates.find((c) => c.drillId === chosenDrillId);
        const drillTier   = chosenCand?.tier ?? 'beginner';
        const drillAttrId = chosenCand?.attributeId ?? '';

        const safetyResult = await applySafetyConstraints(
            stateVec,
            {drillId: chosenDrillId, volumeBucket: chosenVolume, intensityBucket: chosenIntensity},
            ageBand,
            drillTier,
            drillAttrId,
            sportId,
            uid,
            policyVersion,
            proposedDuration,
        );

        chosenDrillId   = safetyResult.finalAction.drillId;
        chosenVolume    = safetyResult.finalAction.volumeBucket;
        chosenIntensity = safetyResult.finalAction.intensityBucket;

        const recommendedDurationMinutes = safetyResult.recommendedDurationMinutes;
        let recommendedTargetRpe = bucketToRpe(chosenIntensity);

        const safetyOverrideApplied = safetyResult.overrideCodes.length > 0;
        const safetyOverrideCode = safetyOverrideApplied ? safetyResult.overrideCodes[0] : null;

        // Step 8 — write inference log
        const explanationCode = deriveExplanationCode(stateVec, explorationFlag);
        const logId = db().collection('rl_inference_log').doc().id;
        const logDoc = {
          logId,
          uid,
          policyVersion,
          state: {
            vector: stateVec,
            featureNames: stateResult.featureNames,
            builtAt: stateResult.builtAt,
          },
          candidateDrillIds: candidates.map((c) => c.drillId),
          chosenAction: {drillId: chosenDrillId, volumeBucket: chosenVolume, intensityBucket: chosenIntensity},
          qValue: chosenQValue,
          epsilonUsed: explorationFlag ? Math.max(0.05, 0.3 / Math.sqrt(policyVersion)) : 0,
          explorationFlag,
          modeledRewardEstimate: chosenQValue,
          explanationCode,
          safetyOverrideApplied,
          safetyOverrideCode,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Fire-and-forget — don't block the response on the log write
        db().collection('rl_inference_log').doc(logId).set(logDoc).catch((e) => {
          console.error('[rlOps] inference log write failed:', e);
        });

        const explanationTexts = {
          RESTING: 'Low recent load — good time to introduce a new drill.',
          BUILDING: 'Steady progress — policy selected a growth-phase drill.',
          PEAK: 'High training load detected — intensity ramped to match.',
          RECOVERY_FORCED: 'Fatigue signals detected — recovery session prescribed.',
          COACH_PRIORITY: "Coach's target attribute is being prioritised today.",
          EXPLORATION: 'Trying a new drill to discover what works best for you.',
        };

        // Step 9 — return
        return {
          mode: 'policy',
          recommendedDrillId: chosenDrillId,
          recommendedDurationMinutes,
          recommendedTargetRpe,
          policyVersion,
          explorationFlag,
          explanationCode,
          explanationText: explanationTexts[explanationCode] ?? null,
        };
      } catch (err) {
        console.error('[rlOps] getAdaptiveWorkoutPolicy error:', err);
        return heuristic();
      }
    },
);

// ── setPolicyAbPercent ────────────────────────────────────────────────────────
exports.setPolicyAbPercent = onCall({region: REGION}, async (request) => {
  assertSuper(request);
  const abPercent = Number(request.data?.abPercent);
  if (!Number.isFinite(abPercent) || abPercent < 0 || abPercent > 100) {
    throw new HttpsError('invalid-argument', 'abPercent must be 0-100.');
  }
  const ref = db().collection('rl_policy_state').doc('current');
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'rl_policy_state/current does not exist. Run initRlPolicy first.');
  }
  await ref.update({
    abPercent: Math.round(abPercent),
    updatedByUid: request.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return {abPercent: updated.data().abPercent, policyVersion: updated.data().policyVersion};
});

// ── freezeRlPolicy ────────────────────────────────────────────────────────────
exports.freezeRlPolicy = onCall({region: REGION}, async (request) => {
  assertSuper(request);
  const frozen = Boolean(request.data?.frozen);
  const ref = db().collection('rl_policy_state').doc('current');
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'rl_policy_state/current does not exist.');
  }
  await ref.update({
    frozen,
    updatedByUid: request.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return {frozen: updated.data().frozen, policyVersion: updated.data().policyVersion};
});

// ── rollbackRlPolicy ──────────────────────────────────────────────────────────
exports.rollbackRlPolicy = onCall({region: REGION}, async (request) => {
  assertSuper(request);
  const targetVersion = parseInt(String(request.data?.targetVersion), 10);
  if (!Number.isFinite(targetVersion) || targetVersion < 1) {
    throw new HttpsError('invalid-argument', 'targetVersion must be a positive integer.');
  }
  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG ?
      JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId || 'soccer-skills-tracker' :
      'soccer-skills-tracker';
  const bucket = `${projectId}.appspot.com`;
  const gcsPath = `gs://${bucket}/rl_models/policy/v${targetVersion}/`;

  // Verify GCS object exists before writing the state doc.
  const storage = admin.storage().bucket(bucket);
  const [exists] = await storage.file(`rl_models/policy/v${targetVersion}/model.json`).exists();
  if (!exists) {
    throw new HttpsError(
        'not-found',
        `GCS model artifact not found at ${gcsPath}model.json`,
    );
  }

  const ref = db().collection('rl_policy_state').doc('current');
  await ref.update({
    policyVersion: targetVersion,
    gcsPath,
    updatedByUid: request.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {policyVersion: targetVersion, gcsPath};
});
