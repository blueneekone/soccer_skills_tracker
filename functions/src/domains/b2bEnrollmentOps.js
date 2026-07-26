'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');

const REGION = 'us-east1';
const db = () => admin.firestore();

function assertMfaAndTimeout(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const {token} = request.auth;

  const mfaInfo = token.firebase && token.firebase.sign_in_second_factor;
  if (!mfaInfo) {
    throw new HttpsError('permission-denied', 'MFA is required for B2B registration.');
  }

  const authTime = token.auth_time;
  if (!authTime) {
    throw new HttpsError('permission-denied', 'Missing auth_time.');
  }

  const now = Math.floor(Date.now() / 1000);
  const oneHourInSeconds = 3600;
  if (now - authTime > oneHourInSeconds) {
    throw new HttpsError('permission-denied', 'Session expired. Please re-authenticate.');
  }

  return token;
}

async function verifyLicenseAndPayload(data) {
  const license = typeof data.businessLicense === 'string' ? data.businessLicense : '';
  const photoId = typeof data.photoId === 'string' ? data.photoId : '';

  if (!license.trim() && !photoId.trim()) {
    throw new HttpsError(
        'invalid-argument',
        'Account Ownership Verification failed: Government-issued photo ID or business license is required.'
    );
  }

  return { license, photoId };
}

exports.enrollIndependentDirector = onCall(
  {region: REGION},
  async (request) => {
    assertMfaAndTimeout(request);

    const uid = request.auth.uid;
    const { license, photoId } = await verifyLicenseAndPayload(request.data);

    // Generate new standalone tenantId & clubId
    const tenantId = `tenant_${crypto.randomBytes(8).toString('hex')}`;
    const clubId = tenantId;

    // Record in Firestore
    await db().collection('b2b_enrollments').doc(uid).set({
      uid,
      tenantId,
      clubId,
      type: 'independent',
      license,
      photoId,
      stripeOnboardingStarted: true,
      enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      tenantId,
      clubId,
      stripeConnectUrl: `https://stripe.com/connect/onboarding?t=${tenantId}`,
    };
  }
);

exports.enrollGovernedDirector = onCall(
  {region: REGION},
  async (request) => {
    assertMfaAndTimeout(request);

    const uid = request.auth.uid;
    const inviteToken = request.data.inviteToken || '';

    if (!inviteToken) {
      throw new HttpsError('invalid-argument', 'Invite token is required.');
    }

    const inviteRef = db().collection('invites').doc(inviteToken);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      throw new HttpsError('not-found', 'Invite not found.');
    }

    const inviteData = inviteSnap.data();
    if (inviteData.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Invite is no longer valid.');
    }

    const masterTenantId = inviteData.tenantId;
    const newClubId = `club_${crypto.randomBytes(8).toString('hex')}`;

    await db().runTransaction(async (tx) => {
      // Re-read invite in tx
      const freshInvite = await tx.get(inviteRef);
      if (!freshInvite.exists || freshInvite.data().status !== 'pending') {
         throw new HttpsError('failed-precondition', 'Invite is no longer valid.');
      }

      tx.set(db().collection('b2b_enrollments').doc(uid), {
        uid,
        tenantId: masterTenantId,
        clubId: newClubId,
        type: 'governed',
        inviteToken,
        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.update(inviteRef, {
        status: 'consumed',
        consumedBy: uid,
        consumedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      tenantId: masterTenantId,
      clubId: newClubId,
    };
  }
);

module.exports = {
  assertMfaAndTimeout,
  enrollIndependentDirector: exports.enrollIndependentDirector,
  enrollGovernedDirector: exports.enrollGovernedDirector,
};
