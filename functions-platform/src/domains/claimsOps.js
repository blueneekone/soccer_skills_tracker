'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {getRegistryDb, getRequestDb} = require('../../cellRouter');

const REGION = 'us-east1';
const db = () => getRegistryDb();

function assertAdminTier(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const role = request.auth.token.role ?? '';
  if (role !== 'global_admin' && role !== 'super_admin') throw new HttpsError('permission-denied', 'Admin required.');
  return { uid: request.auth.uid, email: request.auth.token.email };
}

exports.syncUserClaims = onDocumentWritten('users/{docId}', async (event) => {
  const docId = event.params.docId;
  const after = event.data.after.exists ? event.data.after.data() : null;
  if (!after) return;
  try {
    const userRecord = await admin.auth().getUserByEmail(docId);
    const currentClaims = userRecord.customClaims || {};
    const newClaims = {
      ...currentClaims,
      role: after.role || currentClaims.role,
      clubId: after.clubId || currentClaims.clubId,
      teamId: after.teamId || currentClaims.teamId,
      tenantId: after.tenantId || currentClaims.tenantId,
    };
    await admin.auth().setCustomUserClaims(userRecord.uid, newClaims);
  } catch (e) {
    logger.warn('syncUserClaims failed', e);
  }
});

exports.assignTenantClaims = onCall({region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const uid = request.auth.uid;
  const {inviteId} = request.data || {};
  if (!inviteId) throw new HttpsError('invalid-argument', '`inviteId` required.');
  const inviteRef = db().collection('invites').doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new HttpsError('not-found', 'Invite not found.');
  const invite = inviteSnap.data() || {};
  if (invite.status !== 'consumed' || invite.consumedBy !== uid) throw new HttpsError('permission-denied', 'Invite invalid.');
  const tenantId = invite.tenantId || invite.clubId || '';
  const targetRole = invite.targetRole || '';
  const teamId = invite.teamId || null;
  const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};
  const newClaims = {...existingClaims, clubId: tenantId, role: targetRole, ...(teamId ? {teamId} : {})};
  await admin.auth().setCustomUserClaims(uid, newClaims);
  try {
    const userEmail = (await admin.auth().getUser(uid)).email;
    if (userEmail) await db().collection('users').doc(userEmail.toLowerCase()).set({ role: targetRole, clubId: tenantId, ...(teamId ? {teamId} : {}) }, {merge: true});
  } catch (e) {}
  await db().collection('security_audits').add({ admin: request.auth.token.email || uid, action: 'ASSIGN_TENANT_CLAIMS', target: uid, details: JSON.stringify({ tenantId, targetRole, teamId }), timestamp: admin.firestore.FieldValue.serverTimestamp() });
  return {success: true};
});

exports.impersonateUserFn = onCall({region: REGION}, async (request) => {
  const adminContext = assertAdminTier(request);
  const {targetUid, targetEmail} = request.data || {};
  if (!targetUid) throw new HttpsError('invalid-argument', '`targetUid` required.');
  try {
    const customToken = await admin.auth().createCustomToken(targetUid);
    await db().collection('security_audits').add({ admin: adminContext.email || adminContext.uid, action: 'IMPERSONATION_SUCCESS', target: targetUid, details: JSON.stringify({ targetEmail: targetEmail || 'unknown', ip: request.rawRequest.ip || 'unknown' }), timestamp: admin.firestore.FieldValue.serverTimestamp() });
    return {customToken};
  } catch (err) {
    throw new HttpsError('internal', 'Failed to generate token.');
  }
});

exports.repairUserClaims = onCall({ region: REGION }, async (request) => {
  const adminContext = assertAdminTier(request);
  const { targetEmail, role, clubId, teamId, tenantId } = request.data || {};
  if (!targetEmail || !role) throw new HttpsError('invalid-argument', 'targetEmail and role required.');
  try {
    const userRecord = await admin.auth().getUserByEmail(targetEmail);
    const customClaims = { role, clubId: clubId || null, teamId: teamId || null, tenantId: tenantId || null };
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
    await db().collection('users').doc(userRecord.uid).set({ role, clubId: clubId || null, teamId: teamId || null, tenantId: tenantId || null, email: userRecord.email, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await db().collection('security_audits').add({ admin: adminContext.email || adminContext.uid, action: 'REPAIR_USER_CLAIMS', target: targetEmail, details: JSON.stringify(customClaims), timestamp: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true, customClaims };
  } catch (err) {
    throw new HttpsError('internal', 'Error repairing claims: ' + err.message);
  }
});
