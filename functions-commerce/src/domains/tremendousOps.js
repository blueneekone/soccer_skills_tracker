const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");
const { Tremendous } = require("tremendous");

const tremendousApiKey = defineSecret("TREMENDOUS_API_KEY");

const getTremendousClient = (apiKey) => {
  return new Tremendous(apiKey, "https://testflight.tremendous.com/api/v2");
};

exports.listRewardCatalog = onCall({ secrets: [tremendousApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User is not authenticated.");
  }
  
  try {
    const apiKey = tremendousApiKey.value();
    const client = getTremendousClient(apiKey);
    const response = await client.campaigns.list();
    return { campaigns: response.data.campaigns };
  } catch (error) {
    console.error("Tremendous listRewardCatalog error:", error);
    throw new HttpsError("internal", "Failed to list reward catalog.");
  }
});

exports.issueMilestoneReward = onCall({ secrets: [tremendousApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User is not authenticated.");
  }

  const { childId, campaignId, denomination, fundingSourceId, milestoneId } = request.data;
  
  if (!childId || !campaignId || !denomination || !fundingSourceId || !milestoneId) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = getFirestore();
  const householdId = request.auth.token.householdId;
  
  if (!householdId) {
    throw new HttpsError("permission-denied", "User does not belong to a household.");
  }

  const householdRef = db.collection('households').doc(householdId);
  const householdDoc = await householdRef.get();

  if (!householdDoc.exists) {
    throw new HttpsError("not-found", "Household not found.");
  }
  
  // Idempotency check:
  const rewardRef = householdRef.collection('rewards').doc(milestoneId);
  const rewardDoc = await rewardRef.get();
  if (rewardDoc.exists && rewardDoc.data().status === 'issued') {
    return { success: true, rewardId: rewardDoc.data().tremendousOrderId };
  }

  try {
    const apiKey = tremendousApiKey.value();
    const client = getTremendousClient(apiKey);
    
    const orderData = {
      payment: {
        funding_source_id: fundingSourceId
      },
      reward: {
        campaign_id: campaignId,
        value: {
          denomination: denomination,
          currency_code: "USD"
        },
        recipient: {
          name: "Child",
          email: "child@example.com"
        },
        delivery: {
          method: "EMAIL"
        }
      }
    };

    const response = await client.orders.create(orderData);
    const orderId = response.data.order.id;
    
    await rewardRef.set({
      milestoneId,
      campaignId,
      denomination,
      childId,
      status: 'issued',
      tremendousOrderId: orderId,
      issuedAt: new Date().toISOString(),
      issuedBy: request.auth.uid
    });

    return { success: true, rewardId: orderId };

  } catch (error) {
    console.error("Tremendous issueMilestoneReward error:", error);
    throw new HttpsError("internal", "Failed to issue milestone reward.");
  }
});
