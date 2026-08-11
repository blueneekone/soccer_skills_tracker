import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';

const db = () => admin.firestore();

export const consumeFederationInvite = onCall({ region: 'us-east1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to consume federation invite.');
  }

  const uid = request.auth.uid;
  const inviteToken = typeof request.data === 'string'
    ? request.data
    : (request.data?.inviteToken || '');

  if (!inviteToken) {
    throw new HttpsError('invalid-argument', 'Invite token is required.');
  }

  const snap = await db().collection('federation_invites').where('token', '==', inviteToken).get();
  if (snap.empty) {
    throw new HttpsError('not-found', 'Invite not found.');
  }

  const inviteDoc = snap.docs[0];
  const inviteData = inviteDoc.data();

  if (inviteData.is_used !== false) {
    throw new HttpsError('failed-precondition', 'Invite is already used.');
  }

  const current_time = Date.now();
  const expVal = inviteData.expiration_timestamp;
  const expMs = (expVal && typeof expVal.toMillis === 'function')
    ? expVal.toMillis()
    : new Date(expVal).getTime();

  if (current_time >= expMs) {
    throw new HttpsError('failed-precondition', 'Invite is expired.');
  }

  const masterTenantId = inviteData.tenantId || inviteData.masterTenantId;
  const newClubId = `club_${randomBytes(8).toString('hex')}`;

  const batch = db().batch();
  batch.update(inviteDoc.ref, {
    is_used: true,
    used_by: uid,
    used_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(db().collection('users').doc(uid), {
    uid,
    role: 'director',
    type: 'governed',
    clubId: newClubId,
    tenantId: masterTenantId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  batch.set(db().collection('b2b_enrollments').doc(uid), {
    uid,
    tenantId: masterTenantId,
    clubId: newClubId,
    type: 'governed',
    inviteToken,
    enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    success: true,
    tenantId: masterTenantId,
    clubId: newClubId,
  };
});
