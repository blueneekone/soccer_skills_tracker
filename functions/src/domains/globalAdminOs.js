'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { stripProtectedFields } = require('../utils/rbacUtil');
const { mintImpersonationToken } = require('../utils/loginAsUtil');
const { cascadeDeleteUserData } = require('../utils/rightToBeForgottenUtil');

const REGION = 'us-east1';

/**
 * Ensures the caller is authenticated and holds the necessary role.
 */
function assertGlobalOrSuperAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const role = request.auth.token.role;
  if (role !== 'global_admin' && role !== 'super_admin') {
    logger.warn('[globalAdminOs] unauthorized attempt', {
      uid: request.auth.uid,
      role,
    });
    throw new HttpsError('permission-denied', 'Must be global/super admin.');
  }
  return { uid: request.auth.uid, email: request.auth.token.email };
}

/**
 * Account Impersonation ("Login As")
 * Allows verified admins to mint custom JWT tokens to troubleshoot tenant accounts.
 */
exports.loginAs = onCall({ region: REGION }, async (request) => {
  const adminContext = assertGlobalOrSuperAdmin(request);

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
  assertGlobalOrSuperAdmin(request);

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
    return { success: true };
  } catch (err) {
    throw new HttpsError('internal', err.message);
  }
});
