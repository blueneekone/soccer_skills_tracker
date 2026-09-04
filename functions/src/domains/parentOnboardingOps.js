
'use strict';
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

exports.claimParentInviteToken = onCall({ region: 'us-east1' }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

  const { inviteToken } = data;
  if (!inviteToken) throw new HttpsError('invalid-argument', 'Missing invite token.');

  const db = admin.firestore();
  const userRecord = await admin.auth().getUser(auth.uid);
  const parentEmailLower = userRecord.email.toLowerCase();

  const userRef = db.collection('users').doc(parentEmailLower);

  return await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }

    const userData = userDoc.data();
    if (userData.inviteToken !== inviteToken) {
      throw new HttpsError('invalid-argument', 'Invalid invite token.');
    }

    const householdId = userData.householdId;
    if (!householdId) {
      throw new HttpsError('internal', 'No household associated with this invite.');
    }

    transaction.update(userRef, {
      invitePending: false,
      inviteToken: admin.firestore.FieldValue.delete(),
      inviteTokenExpiresAt: admin.firestore.FieldValue.delete()
    });

    await admin.auth().setCustomUserClaims(auth.uid, {
      role: 'parent',
      householdId: householdId
    });

    return { success: true, householdId };
  });
});

exports.signParentalConsent = onCall({ region: 'us-east1' }, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated.');

  const role = auth.token.role || '';
  if (role !== 'parent') {
    throw new HttpsError('permission-denied', 'Only parents can sign consent.');
  }

  const { childEmail } = data;
  if (!childEmail) throw new HttpsError('invalid-argument', 'Missing child email.');

  const db = admin.firestore();

  // Verify household
  const parentEmailLower = (await admin.auth().getUser(auth.uid)).email.toLowerCase();
  const parentRef = db.collection('users').doc(parentEmailLower);
  const parentDoc = await parentRef.get();
  const parentData = parentDoc.data();
  if (!parentData || !parentData.householdId) {
     throw new HttpsError('permission-denied', 'Parent has no household.');
  }
  const householdId = parentData.householdId;

  const childRef = db.collection('users').doc(childEmail.toLowerCase());

  return await db.runTransaction(async (transaction) => {
    const childDoc = await transaction.get(childRef);
    if (!childDoc.exists) throw new HttpsError('not-found', 'Child profile not found.');

    const childData = childDoc.data();
    if (childData.householdId !== householdId) {
      throw new HttpsError('permission-denied', 'Child does not belong to parent household.');
    }

    transaction.update(childRef, {
      status: 'PARENTAL_CONSENT_VERIFIED',
      isCleared: true
    });

    const auditRef = db.collection('consent_logs').doc();
    transaction.set(auditRef, {
      parentUid: auth.uid,
      parentEmail: parentEmailLower,
      childEmail: childEmail.toLowerCase(),
      householdId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      action: 'PARENTAL_CONSENT_SIGNED'
    });

    return { success: true };
  });
});
