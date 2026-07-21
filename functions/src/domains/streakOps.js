const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAdminDb } = require('../../cellRouter.js');
const { FieldValue } = require('firebase-admin/firestore');

/**
 * consumeStreakFreeze — atomically decrements streakFreezes by 1
 * and marks today as an active day to preserve the streak.
 * Zero-trust: UID is taken from auth context, never from payload.
 */
exports.consumeStreakFreeze = onCall({ enforceAppCheck: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Auth required.');

  // Get default cell db since we don't know the exact cell
  const db = getAdminDb();
  const statsRef = db.collection('player_stats').doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(statsRef);
    if (!snap.exists) throw new HttpsError('not-found', 'No player stats found.');

    const data = snap.data();
    const freezes = typeof data.streakFreezes === 'number' ? data.streakFreezes : 0;

    if (freezes <= 0) {
      throw new HttpsError('failed-precondition', 'No streak freezes available.');
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    tx.update(statsRef, {
      streakFreezes: FieldValue.increment(-1),
      lastActiveDate: today,
      lastFreezeUsed: today,
    });

    return {
      success: true,
      freezesRemaining: freezes - 1,
      streakPreserved: true,
    };
  });
});
