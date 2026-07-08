const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

// Mock master registry for cosmetic pricing
const COSMETIC_CATALOG = {
  'M-HAIR-PLASMA-MOHAWK': { cost: 500, type: 'head' },
  'F-HAIR-PLASMA-MOHAWK': { cost: 500, type: 'head' },
  'GEAR-TORSO-CYBER': { cost: 1200, type: 'torso' },
  'GEAR-BOOTS-NEON': { cost: 800, type: 'footwear' },
};

/**
 * PHASE 2: THE COSMETIC ECONOMY (BACKEND)
 * Securely unlocks an avatar component by deducting Grit XP.
 */
exports.unlockAvatarComponent = onCall({ region: 'us-central1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const assetId = req.data?.assetId;
  if (!assetId || !COSMETIC_CATALOG[assetId]) {
    throw new HttpsError('invalid-argument', 'Valid assetId is required.');
  }

  const assetInfo = COSMETIC_CATALOG[assetId];
  const firestore = admin.firestore();
  const userRef = firestore.doc(`users/${uid}`);

  try {
    await firestore.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User document not found.');
      }

      const userData = userDoc.data();
      const currentXp = userData.xp || 0;
      const unlocked = userData.unlocked_cosmetics || [];

      if (unlocked.includes(assetId)) {
        throw new HttpsError('already-exists', 'User already owns this cosmetic.');
      }

      if (currentXp < assetInfo.cost) {
        throw new HttpsError('failed-precondition', 'Insufficient Grit XP.');
      }

      // Securely deduct XP and append to unlocked array
      transaction.update(userRef, {
        xp: admin.firestore.FieldValue.increment(-assetInfo.cost),
        unlocked_cosmetics: admin.firestore.FieldValue.arrayUnion(assetId)
      });
    });

    logger.info(`User ${uid} successfully unlocked ${assetId}`);
    return { success: true, unlockedAsset: assetId };
  } catch (error) {
    logger.error(`Error unlocking asset for ${uid}:`, error);
    throw new HttpsError('internal', error.message || 'Failed to unlock cosmetic.');
  }
});

/**
 * Commits the equipped layers to users/{uid}/avatar_loadout
 */
exports.saveActiveLoadout = onCall({ region: 'us-central1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const loadout = req.data?.loadout;
  if (!loadout || typeof loadout !== 'object') {
    throw new HttpsError('invalid-argument', 'Valid loadout object is required.');
  }

  const firestore = admin.firestore();
  const userRef = firestore.doc(`users/${uid}`);

  // In production, we'd verify that the user owns every asset in the loadout object.
  // For this sprint, we assume basic validation.
  
  await userRef.update({
    avatar_loadout: loadout,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  logger.info(`User ${uid} saved new active loadout.`);
  return { success: true };
});
