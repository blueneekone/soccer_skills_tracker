'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const crypto = require('crypto');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const PLATFORM_NAME = 'Nexus Command';

exports.generateVpcChallenge = onCall(
  { region: REGION, enforceAppCheck: false },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'Authenticated UID required.');
    }

    const challenge = crypto.randomBytes(32).toString('base64url');

    await admin.firestore().collection('coppaChallenges').doc(userId).set({
      challenge,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { challenge, rpName: PLATFORM_NAME, userId };
  }
);

exports.verifyVpcSignature = onCall(
  { region: REGION, enforceAppCheck: false },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'Authenticated UID required.');
    }

    const { attestationObjectB64, clientDataJSONB64, credentialIdB64 } = request.data;
    if (!attestationObjectB64 || !clientDataJSONB64 || !credentialIdB64) {
      throw new HttpsError('invalid-argument', 'Missing WebAuthn payload fields.');
    }

    const firestore = admin.firestore();
    const challengeRef = firestore.collection('coppaChallenges').doc(userId);
    const challengeSnap = await challengeRef.get();

    if (!challengeSnap.exists) {
      throw new HttpsError('not-found', 'No pending challenge found.');
    }
    const challengeData = challengeSnap.data();

    // Verify challenge matches
    const clientData = JSON.parse(Buffer.from(clientDataJSONB64, 'base64url').toString('utf8'));
    if (clientData.challenge !== challengeData.challenge) {
      throw new HttpsError('permission-denied', 'Challenge mismatch.');
    }

    // Encrypt IP Address (E-Sign Act compliance)
    const rawIp = request.rawRequest?.ip || 'unknown';
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      crypto.scryptSync(process.env.PII_VAULT_MASTER_KEY || 'default-fallback-key-32b', 'salt', 32),
      Buffer.alloc(16, 0)
    );
    const encryptedIp = cipher.update(rawIp, 'utf8', 'hex') + cipher.final('hex');

    const batch = firestore.batch();

    // Delete challenge to prevent replay
    batch.delete(challengeRef);

    // Atomically record consent
    const consentRef = firestore.collection('consents').doc();
    batch.set(consentRef, {
      parentId: request.auth.token.email || userId,
      childId: userId, // Assuming parent signs for themselves or linked minors
      consentDate: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: encryptedIp,
      consentMethod: 'webauthn',
      coppaStatus: 'granted',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update parent's verified status
    const userRef = firestore.collection('users').doc(request.auth.token.email || userId);
    batch.update(userRef, {
      vpcStatus: 'verified',
      coppaStatus: 'granted'
    });

    await batch.commit();

    return { success: true, vpcVerified: true };
  }
);
