/* eslint-disable quotes */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {defineString} = require('firebase-functions/params');

admin.initializeApp();
const ADMIN_EMAIL = defineString('ADMIN_EMAIL');

exports.syncUserClaims = functions.firestore
    .document('users/{email}')
    .onWrite(async (change, context) => {
      const userData = change.after.data();

      if (!userData) {
        functions.logger.info('User profile deleted. Exiting function.');
        return null;
      }

      const userEmail = context.params.email;
      const superAdmin = ADMIN_EMAIL.value();

      const customClaims = {
        teamId: userData.teamId || null,
        role: userData.role || 'player',
      };

      functions.logger.info(`Intercepted profile update for: ${userEmail}`);

      // 1. The Gatekeeper
      if (userEmail.toLowerCase() === superAdmin.toLowerCase()) {
        customClaims.role = 'super_admin';
        functions.logger.info('Super Admin detected! Upgrading badge.');
      }

      // 2. The Stamper
      try {
        const userRecord = await admin.auth().getUserByEmail(userEmail);
        await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
        functions.logger.info('Successfully stamped claims!');
      } catch (error) {
        functions.logger.error('Error stamping claims:', error);
      }

      return null;
    });
