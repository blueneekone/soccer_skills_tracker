const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

/**
 * Mocks an LMM + LMS transformation to derive a percentile score.
 */
function applyLMSAndLMM(value, ageInMonths, metricKey) {
  // Mock Lambda-Mu-Sigma curves: return a normalized percentile (0-100)
  const zScore = (value - 50) / 10; 
  let percentile = (zScore * 10) + 50; 
  return Math.max(0, Math.min(100, Math.round(percentile)));
}

/**
 * Mocks Pairwise Rank Parity across a dataset for bias removal.
 */
function enforcePairwiseRankParity(percentiles) {
  // In production, this would use a ranking parity algorithm to normalize disparities
  return percentiles;
}

/**
 * PHASE 2: STATISTICAL FAIRNESS ENGINE
 */
exports.calculatePlayerProgression = onCall({ region: 'us-central1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { playerUid, rawTelemetry, ageInMonths } = req.data;
  if (!playerUid || !rawTelemetry) {
    throw new HttpsError('invalid-argument', 'playerUid and rawTelemetry are required.');
  }

  // Enforce caller can only calculate progression for themselves or they are admin/coach
  if (uid !== playerUid) {
    const callerDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (!callerDoc.exists || (callerDoc.data().role !== 'director' && callerDoc.data().role !== 'super')) {
        throw new HttpsError('permission-denied', 'Unauthorized to calculate progression for this player.');
    }
  }

  logger.info(`Calculating player progression for ${playerUid}`);

  const percentiles = {
    POW: applyLMSAndLMM(rawTelemetry.POW || 50, ageInMonths, 'POW'),
    AGI: applyLMSAndLMM(rawTelemetry.AGI || 50, ageInMonths, 'AGI'),
    ACC: applyLMSAndLMM(rawTelemetry.ACC || 50, ageInMonths, 'ACC'),
    PAC: applyLMSAndLMM(rawTelemetry.PAC || 50, ageInMonths, 'PAC'),
    STM: applyLMSAndLMM(rawTelemetry.STM || 50, ageInMonths, 'STM'),
    COMP: applyLMSAndLMM(rawTelemetry.COMP || 50, ageInMonths, 'COMP')
  };

  const parityPercentiles = enforcePairwiseRankParity(percentiles);

  const firestore = admin.firestore();
  
  // Refactor local array mutations into atomic writeBatch commits (capped at 500)
  const batch = firestore.batch();
  let opCount = 0;

  const progRef = firestore.doc(`player_progression/${playerUid}`);
  
  batch.set(progRef, {
    percentiles: parityPercentiles,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    rawSource: rawTelemetry
  }, { merge: true });
  opCount++;

  // In a real scenario with many mutations, we check if opCount === 500 and commit
  if (opCount > 0) {
    await batch.commit();
  }

  return { success: true, percentiles: parityPercentiles };
});
