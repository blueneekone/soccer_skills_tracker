const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

exports.tremendousWebhook = onRequest(async (request, response) => {
  // Normally verify webhook signature here
  
  if (request.method !== 'POST') {
    response.status(405).send('Method Not Allowed');
    return;
  }
  
  try {
    const event = request.body;

    if (event && event.type === 'REWARD.REDEEMED') {
      const db = getFirestore();
      const telemetryRef = db.collection('system_telemetry').doc('platform');
      
      await telemetryRef.set({
        tremendousRewardsRedeemed: FieldValue.increment(1),
        lastTremendousRedemption: new Date().toISOString()
      }, { merge: true });
    }

    response.status(200).send('OK');
  } catch (error) {
    console.error('Tremendous webhook error:', error);
    response.status(500).send('Internal Server Error');
  }
});
