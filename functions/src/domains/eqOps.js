const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

// Array of empathetic conversation anchors for the FCM Push Payload
const EMPATHETIC_ANCHORS = [
  "Ask them what they enjoyed most today.",
  "Tell them you love watching them play.",
  "Ask what they feel they learned from the game.",
  "Remind them that effort is what matters most."
];

/**
 * PHASE 1 & 2 & 3: THE CAR RIDE HOME EMBARGO, FCM PUSH, GRIT XP
 * Triggers when match telemetry is logged for a player.
 */
exports.processMatchTelemetry = onDocumentCreated(
  {
    document: 'match_telemetry/{matchId}',
    region: 'us-central1'
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const matchId = event.params.matchId;
    const playerUid = data.playerUid;

    if (!playerUid) {
      logger.error(`Match telemetry ${matchId} missing playerUid.`);
      return;
    }

    const firestore = admin.firestore();
    const now = Date.now();
    
    // Mathematically calculate embargoLiftTime (15 minutes post-match)
    // Using 15 * 60 * 1000 = 900000 ms
    const embargoLiftTimeMillis = now + 900000;
    const embargoLiftTime = admin.firestore.Timestamp.fromMillis(embargoLiftTimeMillis);

    // Initialize atomic batch
    const batch = firestore.batch();
    
    // 1. Update the document with embargoLiftTime
    batch.update(snapshot.ref, {
      embargoLiftTime: embargoLiftTime
    });

    // 2. Evaluate Grit XP (High RPE, Low Completion/Success)
    // Mock condition: RPE > 8 and successRate < 40%
    const rpe = data.rpe || 0;
    const successRate = data.successRate || 100;
    let gritAwarded = false;

    if (rpe > 8 && successRate < 40) {
      const userRef = firestore.doc(`users/${playerUid}`);
      batch.update(userRef, {
        gritXp: admin.firestore.FieldValue.increment(100),
        xp: admin.firestore.FieldValue.increment(10)
      });
      gritAwarded = true;
      logger.info(`Awarding Grit XP to ${playerUid} for high RPE (${rpe}) and low success (${successRate}%).`);
    }

    // Commit batch
    await batch.commit();

    // 3. Empathetic Push Network (FCM)
    try {
      const userDoc = await firestore.doc(`users/${playerUid}`).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const parentEmails = userData.parentEmails || [];
        
        // Find parents to push to
        for (const parentEmail of parentEmails) {
          const parentDoc = await firestore.doc(`users/${parentEmail.toLowerCase()}`).get();
          if (parentDoc.exists) {
            const parentData = parentDoc.data();
            const tokens = parentData.fcmTokens || [];

            if (tokens.length > 0) {
              const anchor = EMPATHETIC_ANCHORS[Math.floor(Math.random() * EMPATHETIC_ANCHORS.length)];
              const payload = {
                notification: {
                  title: "The Car Ride Home 🚗",
                  body: `Match data is processing for 15 minutes. ${anchor}`
                }
              };
              
              await admin.messaging().sendToDevice(tokens, payload);
              logger.info(`Dispatched Car Ride Home protocol to parent ${parentEmail}.`);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error dispatching FCM in Car Ride Home protocol:', err);
    }
  }
);
