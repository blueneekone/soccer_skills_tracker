const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAdminDb } = require('../utils/adminDb.js');

exports.consumeStreakFreeze = onCall({ enforceAppCheck: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Auth required.');

  const db = getAdminDb();

  // Auth UID is provided, but user doc keys are typically lowercase emails.
  // We query the users collection where `uid == uid` to get the correct document reference.
  const usersQuery = await db.collection('users').where('uid', '==', uid).limit(1).get();

  if (usersQuery.empty) {
     const docRef = db.collection('users').doc(uid); // fallback to UID as doc id
     return runFreezeTransaction(db, docRef);
  }

  return runFreezeTransaction(db, usersQuery.docs[0].ref);
});

async function runFreezeTransaction(db, docRef) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) throw new HttpsError('not-found', 'User not found.');

    const data = snap.data();
    const armory = data.armory || {};
    const streakFreeze = armory.streakFreeze || {};
    const freezes = typeof streakFreeze.available === 'number' ? streakFreeze.available : 0;

    if (freezes <= 0) {
      throw new HttpsError('failed-precondition', 'No streak freezes available.');
    }

    const today = new Date().toISOString();

    tx.update(docRef, {
      'armory.streakFreeze.available': freezes - 1,
      'armory.streakFreeze.consumedAt': today,
      'armory.lastActiveUtc': today,
    });

    return {
      success: true,
      freezesRemaining: freezes - 1,
      streakPreserved: true,
    };
  });
}
