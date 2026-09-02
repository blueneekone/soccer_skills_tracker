const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

/**
 * Executes SafeSport Automated Lockdown when a critical lightning strike occurs.
 * Suspends active schedules and triggers Shadow CC broadcast.
 */
exports.triggerWeatherLockdown = async function(clubId, db) {
  try {
    const schedulesRef = db.collection('schedules').where('clubId', '==', clubId).where('sessionStatus', 'in', ['active', 'scheduled']);
    const schedSnap = await schedulesRef.get();

    if (schedSnap.empty) {
      logger.info('triggerWeatherLockdown: No active schedules found for club', { clubId });
      return;
    }

    // Atomic writeBatch mutation chunked to 250 (max 500 ops per batch)
    const chunkSize = 250;
    for (let i = 0; i < schedSnap.docs.length; i += chunkSize) {
      const chunk = schedSnap.docs.slice(i, i + chunkSize);
      const batch = db.batch();

      const teamIds = new Set();

      chunk.forEach(doc => {
        batch.update(doc.ref, {
          fieldStatus: 'locked',
          sessionStatus: 'suspended'
        });
        if (doc.data().teamId) {
          teamIds.add(doc.data().teamId);
        }
      });

      // Dispatch SafeSport Shadow CC broadcast for each affected team
      for (const tId of teamIds) {
        const broadcastRef = db.collection('team_broadcasts').doc();
        batch.set(broadcastRef, {
          teamId: tId,
          clubId,
          message: 'CRITICAL WEATHER ALERT: Lightning in area. Clear the pitch immediately and seek shelter in vehicles.',
          type: 'emergency_broadcast',
          channelType: 'parent_lounge', // Required for safeSportBroadcast trigger matching
          safesportMonitored: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      await batch.commit();
      logger.info('triggerWeatherLockdown: Processed batch lockdown', { clubId, count: chunk.length });
    }
  } catch (error) {
    logger.error('triggerWeatherLockdown: Failed', { clubId, error: error.message });
  }
};
