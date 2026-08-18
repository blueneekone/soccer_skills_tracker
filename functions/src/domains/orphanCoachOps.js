const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const REGION = 'us-east1';

exports.registerIndependentCoach = onCall({ region: REGION }, async (request) => {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const db = () => admin.firestore();

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { uid, token } = request.auth;
  const emailLower = token.email ? token.email.toLowerCase() : uid;

  const clubId = `independent-coach-${emailLower}`;
  const tenantId = 'orphan-cell';

  await db().runTransaction(async (tx) => {
      const clubRef = db().collection('clubs').doc(clubId);
      tx.set(clubRef, {
         id: clubId,
         tenantId,
         isOrphan: true,
         createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  });

  await admin.auth().setCustomUserClaims(uid, {
      role: 'independent_coach',
      isCleared: false,
      clubId,
      tenantId
  });

  return {
    success: true,
    clubId,
    tenantId
  };
});
