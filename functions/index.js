/* eslint-disable quotes */
const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineString} = require('firebase-functions/params');

admin.initializeApp();
const ADMIN_EMAIL = defineString('ADMIN_EMAIL');

exports.syncUserClaims = onDocumentWritten('users/{email}', async (event) => {
  const userData = event.data.after.data();

  if (!userData) {
    logger.info('User profile deleted. Exiting function.');
    return null;
  }

  const userEmail = event.params.email;
  const superAdmin = ADMIN_EMAIL.value();

  const customClaims = {
    teamId: userData.teamId || null,
    role: userData.role || 'player',
    clubId: userData.clubId || null,
    householdId: userData.householdId || null,
  };

  logger.info(`Intercepted profile update for: ${userEmail}`);

  if (userEmail.toLowerCase() === superAdmin.toLowerCase()) {
    customClaims.role = 'super_admin';
    logger.info('Super Admin detected! Upgrading badge.');
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
    logger.info('Successfully stamped claims!');
  } catch (error) {
    logger.error('Error stamping claims:', error);
  }

  return null;
});

/**
 * Epic 2 placeholder: wire to minor_retention_queue / club offboarding jobs.
 * SafeSport messaging CC should enqueue parent copies here when implemented.
 */
exports.purgeLeaverDataStub = onSchedule('every 24 hours', async () => {
  logger.info(
      'TTL purge stub: process minor_retention_queue on club offboarding.',
  );
  return null;
});
