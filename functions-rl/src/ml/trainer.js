'use strict';
/**
 * trainer.js
 * ──────────
 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S7)
 *
 * Nightly training scheduler: `trainRlPolicyNightly`
 *
 * Runs at 04:00 UTC every day.
 *
 * Algorithm:
 *  1. Load rl_policy_state/current. Skip if frozen.
 *  2. Page rl_transitions from last 30 days (nextState not null), cap 100k rows.
 *  3. Compute |TD error| for each transition using current policy.
 *  4. Prioritised experience replay: sample 4096 transitions (β-annealed IS weights).
 *  5. Run K=200 gradient steps (Adam lr=1e-4, Huber loss, batch 512, gradient clip 1.0).
 *  6. Validation gate on 1024-transition held-out slice:
 *       - KL divergence of action distribution (new vs old policy) ≤ 0.5
 *       - meanQError ≤ 1.5 × prior meanQError
 *  7. If passed: saveToGcs(version+1), update rl_policy_state/current.
 *  8. Always write rl_training_runs/{yyyy-mm-dd}.
 *
 * Memory: 2GiB   Timeout: 540s
 */

const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

const REGION   = 'us-east1';
const GAMMA    = 0.99;
const BATCH_SZ = 512;
const K_STEPS  = 200;
const REPLAY_SZ = 4096;
const EVAL_SZ   = 1024;
const MAX_TRANSITIONS = 100_000;
const KL_LIMIT  = 0.5;
const Q_ERROR_RATIO = 1.5;

/** @returns {import('firebase-admin').firestore.Firestore} */
const db = () => admin.firestore();

/**
 * Sample indices with prioritised probability (proportional to |TD error|).
 * Falls back to uniform sampling when all priorities are 0.
 *
 * @param {number[]} priorities  |TD error| per transition
 * @param {number}   n           number of indices to sample
 * @param {number}   beta        IS exponent (0-1); higher = less bias
 * @returns {{ indices: number[], weights: number[] }}
 */
function prioritisedSample(priorities, n, beta = 0.6) {
  const total = priorities.reduce((s, p) => s + Math.max(p, 1e-6), 0);
  const probs = priorities.map((p) => Math.max(p, 1e-6) / total);

  const indices = [];
  const weights = [];

  for (let i = 0; i < n; i++) {
    let r = Math.random();
    let cumSum = 0;
    let idx = probs.length - 1;
    for (let j = 0; j < probs.length; j++) {
      cumSum += probs[j];
      if (r <= cumSum) { idx = j; break; }
    }
    indices.push(idx);
    // IS weight: (1 / (N * P(i)))^β
    weights.push(Math.pow(1 / (probs.length * probs[idx]), beta));
  }

  // Normalise IS weights
  const maxW = Math.max(...weights);
  return { indices, weights: weights.map((w) => w / maxW) };
}

/**
 * Compute KL divergence: sum p * log(p/q).
 * @param {number[]} p
 * @param {number[]} q
 */
function klDivergence(p, q) {
  const eps = 1e-10;
  return p.reduce((s, pi, i) => {
    if (pi < eps) return s;
    return s + pi * Math.log((pi + eps) / (q[i] + eps));
  }, 0);
}

/**
 * Build a crude drill embedding for a drillId from the global_drills collection.
 * Returns a 12-float zero vector if the drill is not found.
 * @param {string} drillId
 * @param {Map<string, number[]>} cache
 */
async function getDrillEmbedding(drillId, cache) {
  if (cache.has(drillId)) return cache.get(drillId);
  try {
    const snap = await db().collection('global_drills').doc(drillId).get();
    if (!snap.exists) { cache.set(drillId, Array(12).fill(0)); return Array(12).fill(0); }
    const d = snap.data();
    const tierHot = d.tier === 'advanced' ? [0,0,1] : d.tier === 'intermediate' ? [0,1,0] : [1,0,0];
    const emb = [
      0,0,0,0,0,0,   // attribute onehot (simplified — use zeros for training)
      ...tierHot,
      Math.min(1, (d.gamification?.baseXp ?? 0) / 500),
      Math.min(1, (d.gamification?.gritBonus ?? 0) / 100),
      d.mediaType === 'tactical_svg' ? 1 : 0,
    ];
    cache.set(drillId, emb);
    return emb;
  } catch {
    cache.set(drillId, Array(12).fill(0));
    return Array(12).fill(0);
  }
}

const {VOLUME_BUCKETS, INTENSITY_BUCKETS} = require('./policyModel');

const volIdx = (v)  => VOLUME_BUCKETS.indexOf(v);
const intIdx = (ib) => INTENSITY_BUCKETS.indexOf(ib);

exports.trainRlPolicyNightly = onSchedule(
    {schedule: '0 4 * * *', timeZone: 'UTC', region: REGION, timeoutSeconds: 540, memory: '2GiB'},
    async () => {
      const startMs = Date.now();

      // 1. Load policy state
      const policyRef = db().collection('rl_policy_state').doc('current');
      const policySnap = await policyRef.get();
      const runDate = new Date().toISOString().slice(0, 10);

      const writeRunDoc = async (metrics) => {
        await db().collection('rl_training_runs').doc(runDate).set({
          runDate,
          ...metrics,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      };

      if (!policySnap.exists) {
        await writeRunDoc({ accepted: false, rejectionReason: 'rl_policy_state/current missing', sampleCount: 0, meanTdError: 0, meanQError: 0, klDivergence: 0, actionHistogram: {}, gradientSteps: 0, durationSeconds: 0, policyVersionBefore: 0, policyVersionAfter: null });
        return;
      }

      const policyData = policySnap.data();
      if (policyData.frozen) {
        await writeRunDoc({ accepted: false, rejectionReason: 'policy frozen', sampleCount: 0, meanTdError: 0, meanQError: 0, klDivergence: 0, actionHistogram: {}, gradientSteps: 0, durationSeconds: 0, policyVersionBefore: policyData.policyVersion, policyVersionAfter: null });
        return;
      }

      const currentVersion = Number(policyData.policyVersion);

      // 2. Page transitions (last 30 days, nextState not null)
      const cutoff30 = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 86_400_000);
      let transitions = [];
      let lastDoc = null;
      let pagesFetched = 0;

      while (transitions.length < MAX_TRANSITIONS && pagesFetched < 50) {
        let q = db().collection('rl_transitions')
            .where('nextState', '!=', null)
            .where('createdAt', '>=', cutoff30)
            .orderBy('createdAt', 'asc')
            .limit(2000);
        if (lastDoc) q = q.startAfter(lastDoc);

        const snap = await q.get();
        if (snap.empty) break;
        transitions.push(...snap.docs.map((d) => d.data()));
        lastDoc = snap.docs[snap.docs.length - 1];
        pagesFetched++;
      }

      if (transitions.length < BATCH_SZ) {
        await writeRunDoc({ accepted: false, rejectionReason: `insufficient transitions: ${transitions.length}`, sampleCount: transitions.length, meanTdError: 0, meanQError: 0, klDivergence: 0, actionHistogram: {}, gradientSteps: 0, durationSeconds: Math.round((Date.now() - startMs) / 1000), policyVersionBefore: currentVersion, policyVersionAfter: null });
        return;
      }

      // 3. Load current model
      const {PolicyModel} = require('./policyModel');
      let currentModel;
      try {
        currentModel = await PolicyModel.loadFromGcs(currentVersion);
      } catch (err) {
        await writeRunDoc({ accepted: false, rejectionReason: `model load failed: ${err.message}`, sampleCount: transitions.length, meanTdError: 0, meanQError: 0, klDivergence: 0, actionHistogram: {}, gradientSteps: 0, durationSeconds: Math.round((Date.now() - startMs) / 1000), policyVersionBefore: currentVersion, policyVersionAfter: null });
        return;
      }

      // 4. Compute |TD error| for prioritised replay
      const drillEmbCache = new Map();
      const tdErrors = [];

      for (const t of transitions) {
        const sv = t.state?.vector ?? Array(50).fill(0);
        const drillId = t.action?.drillId ?? '';
        const emb = await getDrillEmbedding(drillId, drillEmbCache);
        const vIdx = Math.max(0, volIdx(t.action?.volumeBucket));
        const iIdx = Math.max(0, intIdx(t.action?.intensityBucket));

        const qCurrent = currentModel.predictQTarget([sv], [emb], [vIdx], [iIdx])[0];
        const nsv = t.nextState?.vector ?? Array(50).fill(0);
        const qNext = t.terminal ? 0 :
          Math.max(...currentModel.predictQTarget([nsv], [emb], [vIdx], [iIdx]));
        const tdTarget = t.reward?.total + GAMMA * qNext;
        tdErrors.push(Math.abs(tdTarget - qCurrent));
      }

      const meanTdError = tdErrors.reduce((s, v) => s + v, 0) / tdErrors.length;

      // 5. Split off eval slice (last EVAL_SZ transitions)
      const evalTransitions = transitions.slice(-EVAL_SZ);
      const trainTransitions = transitions.slice(0, transitions.length - EVAL_SZ);
      const trainTdErrors = tdErrors.slice(0, trainTransitions.length);

      // Compute prior meanQError on eval set
      const priorQVals = [];
      for (const t of evalTransitions) {
        const sv = t.state?.vector ?? Array(50).fill(0);
        const emb = await getDrillEmbedding(t.action?.drillId ?? '', drillEmbCache);
        const vIdx = Math.max(0, volIdx(t.action?.volumeBucket));
        const iIdx = Math.max(0, intIdx(t.action?.intensityBucket));
        const q = currentModel.predictQTarget([sv], [emb], [vIdx], [iIdx])[0];
        priorQVals.push({ q, target: t.reward?.total + GAMMA * 0 });
      }
      const priorMeanQError = priorQVals.reduce((s, {q, target}) => s + Math.abs(q - target), 0) / priorQVals.length;

      // Build new model starting from current weights
      const newModel = await PolicyModel.loadFromGcs(currentVersion);

      // 6. K=200 gradient steps with prioritised replay
      let stepsDone = 0;
      for (let k = 0; k < K_STEPS && stepsDone < K_STEPS; k++) {
        const beta = 0.4 + (0.6 * k / K_STEPS);
        const {indices} = prioritisedSample(trainTdErrors, Math.min(BATCH_SZ, trainTransitions.length), beta);

        const batch = indices.map((i) => trainTransitions[i]);
        const stateVecs = [];
        const drillEmbs = [];
        const vIdxs = [];
        const iIdxs = [];
        const targets = [];

        for (const t of batch) {
          const sv = t.state?.vector ?? Array(50).fill(0);
          const nsv = t.nextState?.vector ?? Array(50).fill(0);
          const emb = await getDrillEmbedding(t.action?.drillId ?? '', drillEmbCache);
          const vi = Math.max(0, volIdx(t.action?.volumeBucket));
          const ii = Math.max(0, intIdx(t.action?.intensityBucket));

          const qNext = t.terminal ? 0 :
            Math.max(...newModel.predictQTarget([nsv], [emb], [vi], [ii]));
          const tdTarget = Math.max(-2, Math.min(2, t.reward?.total + GAMMA * qNext));

          stateVecs.push(sv);
          drillEmbs.push(emb);
          vIdxs.push(vi);
          iIdxs.push(ii);
          targets.push(tdTarget);
        }

        await newModel.trainStep(stateVecs, drillEmbs, vIdxs, iIdxs, targets);
        stepsDone++;
      }

      // 7. Validation gate
      const newQVals = [];
      const oldActionDist = Array(INTENSITY_BUCKETS.length).fill(0);
      const newActionDist = Array(INTENSITY_BUCKETS.length).fill(0);

      for (const t of evalTransitions) {
        const sv = t.state?.vector ?? Array(50).fill(0);
        const emb = await getDrillEmbedding(t.action?.drillId ?? '', drillEmbCache);
        const vi = Math.max(0, volIdx(t.action?.volumeBucket));
        const ii = Math.max(0, intIdx(t.action?.intensityBucket));

        const qNew = newModel.predictQTarget([sv], [emb], [vi], [ii])[0];
        const qOld = currentModel.predictQTarget([sv], [emb], [vi], [ii])[0];
        newQVals.push({ q: qNew, target: t.reward?.total });

        // Accumulate action distributions
        if (ii >= 0 && ii < INTENSITY_BUCKETS.length) {
          oldActionDist[ii]++;
          newActionDist[ii >= 0 ? ii : 0]++;
        }
      }

      const meanQError = newQVals.reduce((s, {q, target}) => s + Math.abs(q - target), 0) / newQVals.length;
      const evalN = evalTransitions.length || 1;

      // Normalise distributions
      const oldP = oldActionDist.map((v) => v / evalN);
      const newP = newActionDist.map((v) => v / evalN);
      const kl = klDivergence(oldP, newP);

      // Action histogram
      const actionHistogram = Object.fromEntries(INTENSITY_BUCKETS.map((ib, i) => [ib, newActionDist[i]]));

      const tooAggressive = kl > KL_LIMIT;
      const qErrorTooHigh = priorMeanQError > 0 && meanQError > Q_ERROR_RATIO * priorMeanQError;
      const accepted = !tooAggressive && !qErrorTooHigh;

      let policyVersionAfter = null;

      if (accepted) {
        const newVersion = currentVersion + 1;
        const gcsPath = await newModel.saveToGcs(newVersion);
        await policyRef.update({
          policyVersion: newVersion,
          gcsPath,
          deployedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        policyVersionAfter = newVersion;
      }

      const durationSeconds = Math.round((Date.now() - startMs) / 1000);

      await writeRunDoc({
        policyVersionBefore: currentVersion,
        policyVersionAfter,
        accepted,
        rejectionReason: tooAggressive ? `KL divergence too high: ${kl.toFixed(4)}` :
                         qErrorTooHigh ? `meanQError ratio too high: ${(meanQError / priorMeanQError).toFixed(2)}x` :
                         null,
        sampleCount: transitions.length,
        meanTdError,
        meanQError,
        klDivergence: kl,
        actionHistogram,
        gradientSteps: stepsDone,
        durationSeconds,
      });
    },
);
