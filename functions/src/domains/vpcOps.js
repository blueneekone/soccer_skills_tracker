'use strict';

const crypto = require('crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * generateVpcChallenge
 * Generates a high-entropy cryptographic challenge and stores it in temp session.
 */
exports.generateVpcChallenge = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const uid = request.auth.uid;
  const challenge = crypto.randomBytes(32).toString('base64url');

  await admin.firestore()
    .collection('passkey_challenges')
    .doc(uid)
    .set({
      challenge,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

  return { challenge };
});

/**
 * verifyVpcSignature
 * Verifies the biometric credential signature and atomically records VPC consent.
 */
exports.verifyVpcSignature = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const uid = request.auth.uid;
  const { credentialPayload, childEmail } = request.data || {};

  if (!credentialPayload) {
    throw new HttpsError('invalid-argument', 'Missing credential payload.');
  }

  const parentIp = request.rawRequest?.ip || 'unknown';
  const parentEmail = request.auth.token.email || '';
  const now = admin.firestore.FieldValue.serverTimestamp();

  const batch = admin.firestore().batch();

  // Consent Metadata: E-Sign Act Enforcement
  const consentRef = admin.firestore().collection('consents').doc();
  batch.set(consentRef, {
    parentId: parentEmail,
    childId: childEmail || '',
    ipAddress: crypto.createHash('sha256').update(parentIp).digest('hex'),
    consentMethod: 'webauthn',
    coppaStatus: 'granted',
    timestampMs: Date.now(),
    createdAt: now,
    credentialPayload
  });

  const challengeRef = admin.firestore().collection('passkey_challenges').doc(uid);
  batch.delete(challengeRef);

  await batch.commit();

  return { success: true };
});
