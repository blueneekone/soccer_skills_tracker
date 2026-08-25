const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');

const REGION = 'us-east1';

exports.createClub = onCall({ region: REGION }, async (request) => {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const db = () => admin.firestore();

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { uid, token } = request.auth;
  const isCommissioner = token.role === 'commissioner';
  const customTenantId = token.tenantId;

  const clubId = `club_${crypto.randomBytes(8).toString('hex')}`;
  let finalTenantId = clubId;

  if (isCommissioner && customTenantId) {
    finalTenantId = customTenantId;
  } else {
    finalTenantId = `tenant_${crypto.randomBytes(8).toString('hex')}`;
  }

  await db().runTransaction(async (tx) => {
    // Write new club logic inside transaction
    const clubRef = db().collection('clubs').doc(clubId);
    tx.set(clubRef, {
      id: clubId,
      tenantId: finalTenantId,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const licenseRef = clubRef.collection('license').doc('active_tier');
    tx.set(licenseRef, {
      status: 'active',
      tier: 'Gold',
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
      provisionedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return {
    success: true,
    clubId,
    tenantId: finalTenantId,
  };
});
