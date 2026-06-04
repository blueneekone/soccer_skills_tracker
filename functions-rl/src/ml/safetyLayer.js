'use strict';
/**
 * safetyLayer.js
 * ──────────────
 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S8)
 *
 * The Safety Constraint Layer sits between the policy's argmax-Q output and
 * the response returned to the player. It is NEVER bypassable — every policy
 * output passes through it, every override is audited.
 *
 * Constraints (hard caps):
 *
 * 1. AGE_DURATION_CAP
 *    under13     → max 30 min
 *    teen13to16  → max 45 min
 *    adult       → max 90 min
 *
 * 2. OVERTRAINING_RECOVERY_FORCE
 *    If rolling7dRpe > 8.5 OR soreness3d > 4 OR ACWR > 1.5:
 *      intensityBucket = 'recovery', volumeBucket = -2
 *
 * 3. REONBOARDING_CAP
 *    If daysSinceLastWorkout > 14:
 *      intensityBucket ≤ 'low', volumeBucket ≤ 0
 *
 * 4. ADVANCED_DRILL_DOWNGRADE
 *    If chosen drill tier = 'advanced' AND ageBand = 'under13':
 *      downgrade to nearest intermediate drill of same attributeId
 *      (nearest = lowest baseXp intermediate drill for that attribute)
 *
 * Every override writes `rl_safety_overrides/{eventId}` with:
 *   { uidHash, originalAction, finalAction, overrideCode, overrideReason,
 *     stateSnapshot, policyVersion }
 *
 * State vector index references (from featureBuilder.FEATURE_NAMES):
 *   [0]  rollingRpe7d         (× 10 to un-normalise)
 *   [2]  rollingSoreness3d    (× 5 to un-normalise)
 *   [7]  daysSinceLastWorkout (× 30 to un-normalise)
 *   [10] acwr                 (× 2 to un-normalise)
 *   [20] ageBandUnder13
 *   [21] ageBandTeen13to16
 *   [22] ageBandAdult
 */

const crypto = require('crypto');
const admin = require('firebase-admin');

/** @returns {import('firebase-admin').firestore.Firestore} */
const db = () => admin.firestore();

const INTENSITY_ORDER = ['recovery', 'low', 'medium', 'high'];

/**
 * @param {string} ib  intensity bucket string
 */
const intensityIndex = (ib) => {
  const idx = INTENSITY_ORDER.indexOf(ib);
  return idx === -1 ? 2 : idx; // default 'medium'
};

/**
 * Lookup the nearest intermediate drill for a given attributeId.
 * Returns null if none found (no downgrade possible).
 *
 * @param {string} attributeId
 * @param {string} sportId
 * @returns {Promise<string|null>}
 */
async function findIntermediateDrill(attributeId, sportId) {
  try {
    const snap = await db()
        .collection('global_drills')
        .where('sportId', '==', sportId)
        .where('attributeId', '==', attributeId)
        .where('tier', '==', 'intermediate')
        .orderBy('gamification.baseXp', 'asc')
        .limit(1)
        .get();
    if (snap.empty) return null;
    return snap.docs[0].id;
  } catch {
    return null;
  }
}

/**
 * Apply all hard safety constraints to a proposed action.
 *
 * @param {number[]} stateVec       50-float normalised state vector
 * @param {{ drillId: string; volumeBucket: number; intensityBucket: string }} proposedAction
 * @param {'under13'|'teen13to16'|'adult'} ageBand
 * @param {string}   drillTier      tier of the proposed drill ('beginner'|'intermediate'|'advanced')
 * @param {string}   drillAttrId    attributeId of the proposed drill
 * @param {string}   sportId        sport identifier for fallback drill lookup
 * @param {string}   uid            Firebase Auth UID (hashed before storage)
 * @param {number}   policyVersion
 * @param {number}   proposedDurationMinutes
 * @returns {Promise<{
 *   finalAction: { drillId: string; volumeBucket: number; intensityBucket: string },
 *   recommendedDurationMinutes: number,
 *   overrideCodes: string[],
 *   overrideReasons: string[]
 * }>}
 */
async function applySafetyConstraints(
    stateVec,
    proposedAction,
    ageBand,
    drillTier,
    drillAttrId,
    sportId,
    uid,
    policyVersion,
    proposedDurationMinutes,
) {
  const overrideCodes = [];
  const overrideReasons = [];

  // Un-normalise relevant features
  const rollingRpe7d      = stateVec[0]  * 10;
  const rollingSoreness3d = stateVec[2]  * 5;
  const daysSinceLast     = stateVec[7]  * 30;
  const acwr              = stateVec[10] * 2.0;

  let finalDrillId    = proposedAction.drillId;
  let finalVolume     = proposedAction.volumeBucket;
  let finalIntensity  = proposedAction.intensityBucket;
  let finalDuration   = proposedDurationMinutes;

  // ── Constraint 1: Age-band duration cap ──────────────────────────────────
  const durationCap = ageBand === 'under13' ? 30 : ageBand === 'teen13to16' ? 45 : 90;
  if (finalDuration > durationCap) {
    finalDuration = durationCap;
    overrideCodes.push('AGE_DURATION_CAP');
    overrideReasons.push(`Duration capped to ${durationCap}min for ageBand ${ageBand}.`);
  }

  // ── Constraint 2: Overtraining recovery force ─────────────────────────────
  const overtraining = rollingRpe7d > 8.5 || rollingSoreness3d > 4 || acwr > 1.5;
  if (overtraining && finalIntensity !== 'recovery') {
    finalIntensity = 'recovery';
    finalVolume = -2;
    overrideCodes.push('OVERTRAINING_RECOVERY_FORCE');
    overrideReasons.push(
        `Overtraining signals detected: RPE7d=${rollingRpe7d.toFixed(1)} ` +
        `soreness3d=${rollingSoreness3d.toFixed(1)} ACWR=${acwr.toFixed(2)}.`,
    );
  }

  // ── Constraint 3: Re-onboarding cap ──────────────────────────────────────
  if (daysSinceLast > 14) {
    let changed = false;
    if (intensityIndex(finalIntensity) > intensityIndex('low')) {
      finalIntensity = 'low';
      changed = true;
    }
    if (finalVolume > 0) {
      finalVolume = 0;
      changed = true;
    }
    if (changed) {
      overrideCodes.push('REONBOARDING_CAP');
      overrideReasons.push(
          `Re-onboarding: ${daysSinceLast.toFixed(0)} days since last workout. Capped to low intensity / neutral volume.`,
      );
    }
  }

  // ── Constraint 4: Advanced drill downgrade for under13 ────────────────────
  if (ageBand === 'under13' && drillTier === 'advanced') {
    const fallbackDrillId = await findIntermediateDrill(drillAttrId, sportId);
    if (fallbackDrillId) {
      finalDrillId = fallbackDrillId;
      overrideCodes.push('ADVANCED_DRILL_DOWNGRADE');
      overrideReasons.push(
          `Advanced drill downgraded to intermediate for under13 player. Fallback: ${fallbackDrillId}.`,
      );
    }
  }

  // ── Write override audit docs ─────────────────────────────────────────────
  if (overrideCodes.length > 0) {
    const uidHash = crypto.createHash('sha256').update(uid).digest('hex');
    const stateSnapshot = {
      rollingRpe7d,
      rollingSoreness3d,
      daysSinceLast,
      acwr,
      ageBand,
    };

    // Write one doc per override code (each is a separate auditable event)
    const writePromises = overrideCodes.map((code, i) =>
      db().collection('rl_safety_overrides').add({
        uidHash,
        policyVersion,
        originalAction: {
          drillId: proposedAction.drillId,
          volumeBucket: proposedAction.volumeBucket,
          intensityBucket: proposedAction.intensityBucket,
        },
        finalAction: {
          drillId: finalDrillId,
          volumeBucket: finalVolume,
          intensityBucket: finalIntensity,
        },
        overrideCode: code,
        overrideReason: overrideReasons[i],
        stateSnapshot,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    );

    // Fire-and-forget — don't block response on audit writes
    Promise.all(writePromises).catch((err) =>
      console.error('[safetyLayer] override audit write failed:', err),
    );
  }

  return {
    finalAction: {
      drillId: finalDrillId,
      volumeBucket: finalVolume,
      intensityBucket: finalIntensity,
    },
    recommendedDurationMinutes: finalDuration,
    overrideCodes,
    overrideReasons,
  };
}

module.exports = { applySafetyConstraints };
