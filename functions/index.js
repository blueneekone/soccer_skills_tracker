/* eslint-disable quotes */
const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineString} = require('firebase-functions/params');

admin.initializeApp();
const ADMIN_EMAIL = defineString('ADMIN_EMAIL');

exports.syncUserClaims = onDocumentWritten('users/{email}', async (event) => {
  // 1. Grab the payload from the Gen 2 event object
  const userData = event.data.after.data();

  if (!userData) {
    logger.info('User profile deleted. Exiting function.');
    return null;
  }

  // 2. Extract the email from the event parameters
  const userEmail = event.params.email;
  const superAdmin = ADMIN_EMAIL.value();

  const customClaims = {
    teamId: userData.teamId || null,
    role: userData.role || 'player',
  };

  logger.info(`Intercepted profile update for: ${userEmail}`);

  // 3. The Gatekeeper
  if (userEmail.toLowerCase() === superAdmin.toLowerCase()) {
    customClaims.role = 'super_admin';
    logger.info('Super Admin detected! Upgrading badge.');
  }

  // 4. The Stamper
  try {
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
    logger.info('Successfully stamped claims!');
  } catch (error) {
    logger.error('Error stamping claims:', error);
  }

  return null;
});
