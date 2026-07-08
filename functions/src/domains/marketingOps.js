const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');

/**
 * PHASE 3: AUTOMATED PARENTAL ROI NUDGES
 * Cron job running every Friday at 17:00.
 */
exports.dispatchWeeklyRoiNudges = onSchedule(
  {
    schedule: '0 17 * * 5', // Every Friday at 5:00 PM
    timeZone: 'America/Denver',
    region: 'us-central1'
  },
  async (event) => {
    logger.info('Starting Automated Parental ROI dispatch...');

    const firestore = admin.firestore();
    
    // Harvest cross-club dataset analytics (Mocked for performance)
    // We would aggregate totalXP for all players and compute percentiles.
    
    // Fetch all households/parents
    try {
      // Mock: Fetch top active players to dispatch nudges
      const playersQuery = await firestore.collection('users')
        .where('role', '==', 'player')
        .limit(10)
        .get();

      const messaging = admin.messaging();
      let dispatchCount = 0;

      for (const playerDoc of playersQuery.docs) {
        const playerData = playerDoc.data();
        const parentEmails = playerData.parentEmails || [];
        const playerXp = playerData.total_xp || 0;
        
        // Mock Percentile calculation
        const percentile = playerXp > 5000 ? 'Top 10%' : 'Top 25%';

        for (const parentEmail of parentEmails) {
          const parentDoc = await firestore.doc(`users/${parentEmail.toLowerCase()}`).get();
          if (parentDoc.exists) {
            const parentData = parentDoc.data();
            const tokens = parentData.fcmTokens || [];

            if (tokens.length > 0) {
              const payload = {
                notification: {
                  title: "Weekly ROI Report 📈",
                  body: `${playerData.firstName || 'Your child'} is in the ${percentile} of athletes this week! Their XP growth directly reflects your support.`
                }
              };
              
              await messaging.sendToDevice(tokens, payload);
              dispatchCount++;
            }
          }
        }
      }

      logger.info(`Successfully dispatched ${dispatchCount} Parental ROI nudges.`);
    } catch (error) {
      logger.error('Error dispatching Parental ROI nudges:', error);
    }
  }
);
