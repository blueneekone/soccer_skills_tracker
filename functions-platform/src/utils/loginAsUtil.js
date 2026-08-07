'use strict';

const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

/** Lazy Firestore accessor */
const db = () => admin.firestore();

/**
 * Mints a custom token for a target user and audits the action.
 * @param {string} adminUid The UID of the admin performing the action.
 * @param {string} adminEmail The email of the admin performing the action.
 * @param {string} targetUid The UID of the user to impersonate.
 * @param {string} targetEmail The email of the user to impersonate.
 * @param {string} ip The IP address of the requester.
 * @returns {Promise<string>} The generated custom token.
 */
async function mintImpersonationToken(
    adminUid,
    adminEmail,
    targetUid,
    targetEmail,
    ip,
) {
  try {
    const customToken = await admin.auth().createCustomToken(targetUid, {
      impersonation: true,
      impersonatedBy: adminEmail,
    });

    await db().collection('security_audit').add({
      action: 'LOGIN_AS_SUCCESS',
      actorUid: adminUid,
      actorEmail: adminEmail,
      targetUid,
      targetEmail,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: ip || 'unknown',
    });

    logger.info('[mintImpersonationToken] success', {
      actorUid: adminUid,
      targetUid,
    });

    return customToken;
  } catch (err) {
    logger.error('[mintImpersonationToken] failed', {
      actorUid: adminUid,
      targetUid,
      err: err.message,
    });
    throw new Error('Failed to generate impersonation token.');
  }
}

module.exports = {
  mintImpersonationToken,
};
