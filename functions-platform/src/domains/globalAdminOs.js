'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { stripProtectedFields } = require('../utils/rbacUtil');
const { mintImpersonationToken } = require('../utils/loginAsUtil');
const { cascadeDeleteUserData } = require('../utils/rightToBeForgottenUtil');

const REGION = 'us-east1';
const ADMIN_ROLES = new Set(['global_admin', 'super_admin', 'admin']);
const MAX_BATCH = 450;

/** Lazy Firestore accessor. */
const db = () => admin.firestore();

/**
 * Ensures the caller is authenticated and holds an admin-tier role.
 */
function assertAdminTier(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const role = request.auth.token.role;
  if (!ADMIN_ROLES.has(role)) {
    logger.warn('[globalAdminOs] unauthorized attempt', {
      uid: request.auth.uid,
      role,
    });
    throw new HttpsError('permission-denied', 'Must be admin/global_admin/super_admin.');
  }
  return { uid: request.auth.uid, email: request.auth.token.email, role };
}

/**
 * Write an audit log entry for every admin action.
 */
async function writeAuditLog(action, actorUid, actorEmail, details) {
  try {
    await db().collection('audit_logs').add({
      action,
      actorUid,
      actorEmail,
      details: details || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    logger.warn('[globalAdminOs] audit log write failed', e);
  }
}

/**
 * Account Impersonation ("Login As")
 * Allows verified admins to mint custom JWT tokens to troubleshoot tenant accounts.
 */
exports.loginAs = onCall({ region: REGION }, async (request) => {
  const adminContext = assertAdminTier(request);

  // Explicitly strip protected RBAC fields from payload (Zero-Trust Security)
  const safeData = stripProtectedFields(request.data || {});

  const targetUid = safeData.targetUid;
  const targetEmail = safeData.targetEmail;
  const ip = request.rawRequest.ip;

  if (!targetUid || typeof targetUid !== 'string') {
    throw new HttpsError('invalid-argument', 'targetUid is required.');
  }

  try {
    const customToken = await mintImpersonationToken(
      adminContext.uid,
      adminContext.email,
      targetUid,
      targetEmail,
      ip
    );
    await writeAuditLog('loginAs', adminContext.uid, adminContext.email, { targetUid, targetEmail });
    return { customToken };
  } catch (err) {
    throw new HttpsError('internal', err.message);
  }
});

/**
 * Database Defrag & PII Shredder ("Right to be Forgotten")
 * Permanently purges ghost data and enforces strict cascading deletes.
 */
exports.rightToBeForgotten = onCall({ region: REGION }, async (request) => {
  const adminContext = assertAdminTier(request);

  // Explicitly strip protected RBAC fields from payload (Zero-Trust Security)
  const safeData = stripProtectedFields(request.data || {});

  const targetUid = safeData.targetUid;
  const targetEmail = safeData.targetEmail;

  if (!targetUid || typeof targetUid !== 'string') {
    throw new HttpsError('invalid-argument', 'targetUid is required.');
  }
  if (!targetEmail || typeof targetEmail !== 'string') {
    throw new HttpsError('invalid-argument', 'targetEmail is required.');
  }

  try {
    await cascadeDeleteUserData(targetUid, targetEmail);
    await writeAuditLog('rightToBeForgotten', adminContext.uid, adminContext.email, { targetUid, targetEmail });
    return { success: true };
  } catch (err) {
    throw new HttpsError('internal', err.message);
  }
});

// ---------------------------------------------------------------------------
// ADMIN SUPPORT CONSOLE FUNCTIONS
// ---------------------------------------------------------------------------

exports.listAllUsers = onCall({ region: REGION }, async (request) => {
  assertAdminTier(request);
  const { maxResults = 100, pageToken } = request.data || {};
  try {
    const listUsersResult = await admin.auth().listUsers(maxResults, pageToken);
    const users = listUsersResult.users.map(u => ({
      uid: u.uid,
      email: u.email,
      disabled: u.disabled,
      displayName: u.displayName,
      role: u.customClaims?.role || 'user',
      clubId: u.customClaims?.clubId || null,
      teamId: u.customClaims?.teamId || null,
      tenantId: u.customClaims?.tenantId || null
    }));
    return { users, pageToken: listUsersResult.pageToken };
  } catch (err) {
    logger.error('Error listing users', err);
    throw new HttpsError('internal', 'Error listing users');
  }
});

exports.repairUserClaims = onCall({ region: REGION }, async (request) => {
  const adminContext = assertAdminTier(request);
  const { targetEmail, role, clubId, teamId, tenantId } = request.data || {};

  if (!targetEmail || !role) {
    throw new HttpsError('invalid-argument', 'targetEmail and role are required.');
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(targetEmail);
    const customClaims = { 
      role, 
      clubId: clubId || null, 
      teamId: teamId || null,
      tenantId: tenantId || null
    };
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
    
    // Also update the Firestore user doc
    await db().collection('users').doc(userRecord.uid).set({
      role,
      clubId: clubId || null,
      teamId: teamId || null,
      tenantId: tenantId || null,
      email: userRecord.email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await writeAuditLog('repairUserClaims', adminContext.uid, adminContext.email, { targetEmail, targetUid: userRecord.uid, newClaims: customClaims });
    return { success: true, customClaims };
  } catch (err) {
    logger.error('Error repairing claims', err);
    throw new HttpsError('internal', 'Error repairing claims: ' + err.message);
  }
});

exports.resetUserPassword = onCall({ region: REGION }, async (request) => {
  const adminContext = assertAdminTier(request);
  const { targetEmail } = request.data || {};

  if (!targetEmail) {
    throw new HttpsError('invalid-argument', 'targetEmail is required.');
  }

  try {
    const link = await admin.auth().generatePasswordResetLink(targetEmail);
    await writeAuditLog('resetUserPassword', adminContext.uid, adminContext.email, { targetEmail });
    return { success: true, link };
  } catch (err) {
    logger.error('Error resetting password', err);
    throw new HttpsError('internal', 'Error resetting password: ' + err.message);
  }
});

exports.disableUser = onCall({ region: REGION }, async (request) => {
  const adminContext = assertAdminTier(request);
  const { targetUid, disabled } = request.data || {};

  if (!targetUid || disabled === undefined) {
    throw new HttpsError('invalid-argument', 'targetUid and disabled are required.');
  }

  try {
    await admin.auth().updateUser(targetUid, { disabled });
    await writeAuditLog('disableUser', adminContext.uid, adminContext.email, { targetUid, disabled });
    return { success: true };
  } catch (err) {
    logger.error('Error updating user status', err);
    throw new HttpsError('internal', 'Error updating user status: ' + err.message);
  }
});

exports.purgeUser = onCall({ region: REGION }, async (request) => {
  const adminContext = assertAdminTier(request);
  const { targetUid, targetEmail } = request.data || {};

  if (!targetUid || !targetEmail) {
    throw new HttpsError('invalid-argument', 'targetUid and targetEmail are required.');
  }

  try {
    // This utilizes the same cascade deletion logic as rightToBeForgotten
    await cascadeDeleteUserData(targetUid, targetEmail);
    await admin.auth().deleteUser(targetUid).catch(err => {
        logger.warn('Failed to delete auth user, maybe already gone.', err);
    });
    
    await writeAuditLog('purgeUser', adminContext.uid, adminContext.email, { targetUid, targetEmail });
    return { success: true };
  } catch (err) {
    logger.error('Error purging user', err);
    throw new HttpsError('internal', 'Error purging user: ' + err.message);
  }
});

exports.createTeam = onCall({ region: REGION }, async (request) => {
  const adminContext = assertAdminTier(request);
  const { clubId, teamName, ageGroup, gender, sport } = request.data || {};

  if (!clubId || !teamName) {
    throw new HttpsError('invalid-argument', 'clubId and teamName are required.');
  }

  try {
    // Basic slugification for team ID if needed, or use auto-id
    const teamId = teamName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    await db().collection('teams').doc(teamId).set({
      id: teamId,
      clubId,
      name: teamName,
      ageGroup: ageGroup || 'U12',
      gender: gender || 'Boys',
      sport: sport || 'Soccer',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await writeAuditLog('createTeam', adminContext.uid, adminContext.email, { teamId, clubId, teamName });
    return { success: true, teamId };
  } catch (err) {
    logger.error('Error creating team', err);
    throw new HttpsError('internal', 'Error creating team: ' + err.message);
  }
});

exports.deleteTeam = onCall({ region: REGION }, async (request) => {
  const adminContext = assertAdminTier(request);
  const { teamId } = request.data || {};

  if (!teamId) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }

  try {
    await db().collection('teams').doc(teamId).delete();
    // In a real cascading scenario, we'd delete subcollections. 
    // To keep it simple for now, we just delete the root doc.
    await writeAuditLog('deleteTeam', adminContext.uid, adminContext.email, { teamId });
    return { success: true };
  } catch (err) {
    logger.error('Error deleting team', err);
    throw new HttpsError('internal', 'Error deleting team: ' + err.message);
  }
});

exports.linkUserToTeam = onCall({ region: REGION }, async (request) => {
  const adminContext = assertAdminTier(request);
  const { targetEmail, clubId, teamId, role } = request.data || {};

  if (!targetEmail || !clubId || !teamId || !role) {
    throw new HttpsError('invalid-argument', 'targetEmail, clubId, teamId, and role are required.');
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(targetEmail);
    const customClaims = { 
      role, 
      clubId, 
      teamId 
    };
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
    
    await db().collection('users').doc(userRecord.uid).set({
      role,
      clubId,
      teamId,
      email: userRecord.email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await writeAuditLog('linkUserToTeam', adminContext.uid, adminContext.email, { targetEmail, targetUid: userRecord.uid, clubId, teamId, role });
    return { success: true, customClaims };
  } catch (err) {
    logger.error('Error linking user to team', err);
    throw new HttpsError('internal', 'Error linking user to team: ' + err.message);
  }
});

