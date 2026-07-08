/* eslint-disable max-len */
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { defineSecret, defineBoolean } = require('firebase-functions/params');

let tremendous;
try {
  tremendous = require('../../tremendous');
} catch (e) {
  logger.warn('Tremendous legacy module not found. Expect errors on escrow execution.');
}

const TREMENDOUS_API_KEY = defineSecret('TREMENDOUS_API_KEY');
const FEATURE_CV_BOUNTY_ENABLED = defineBoolean('FEATURE_CV_BOUNTY_ENABLED', { default: false });

/**
 * PHASE 1: THE TREMENDOUS ESCROW PIPELINE
 * Secure callable to release a funded Tremendous bounty escrow.
 */
exports.releaseTremendousBounty = onCall({ secrets: [TREMENDOUS_API_KEY] }, async (req) => {
  const { bountyId } = req.data || {};
  if (!bountyId) throw new HttpsError('invalid-argument', 'bountyId is required');

  const firestore = admin.firestore();
  const bountyRef = firestore.collection('bounties').doc(bountyId);

  try {
    const snap = await bountyRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Bounty not found');
    const bountyData = snap.data();

    if (bountyData.status !== 'unlocked' && bountyData.status !== 'active') {
      throw new HttpsError('failed-precondition', 'Bounty is not unlocked or active for escrow release');
    }

    if (tremendous && tremendous.createBountyOrder) {
      const result = await tremendous.createBountyOrder({
        fundingSourceId: bountyData.fundingSourceId,
        recipientName: bountyData.playerName || bountyData.playerEmail,
        recipientEmail: bountyData.playerEmail,
        valueCents: bountyData.rewardCents,
        currency: bountyData.currency || 'USD',
        bountyId: bountyId,
        bountyTitle: bountyData.title,
      });

      await bountyRef.update({
        status: 'verified',
        tremendousOrderId: result.orderId,
        tremendousRecipientId: result.recipientId,
        verifiedAt: new Date().toISOString()
      });

      logger.info('releaseTremendousBounty success', { bountyId, orderId: result.orderId });
      return { success: true, orderId: result.orderId };
    } else {
      throw new HttpsError('internal', 'Tremendous API integration is offline');
    }
  } catch (err) {
    logger.error('releaseTremendousBounty error', { bountyId, err });
    throw new HttpsError('internal', 'Failed to release escrow');
  }
});

/**
 * PHASE 2: COMPUTER VISION PIPELINE & SCHEMA
 * Firebase Remote Config gating the CV pipeline
 */
exports.cvBiomechanicsVerifier = onObjectFinalized(
  { bucket: 'sports-skill-tracker-dev.firebasestorage.app' }, 
  async (event) => {
    if (!FEATURE_CV_BOUNTY_ENABLED.value()) {
      logger.info('CV Pipeline disabled via Remote Config. Skipping clip processing.');
      return;
    }
    logger.info('CV Biomechanics Verifier processing clip', { file: event.data.name });
  }
);

/**
 * PHASE 3: OBJECTIVE AI BOUNTY TRIGGER
 */
exports.onCvVerifiedDrillWritten = onDocumentWritten('cv_verified_drill/{repId}', async (event) => {
  if (!FEATURE_CV_BOUNTY_ENABLED.value()) {
    logger.info('onCvVerifiedDrillWritten: FEATURE_CV_BOUNTY_ENABLED is FALSE, aborting');
    return;
  }

  const firestore = admin.firestore();
  const snap = event.data.after;
  if (!snap || !snap.exists) return;
  const repData = snap.data();

  const playerEmail = repData.playerEmail;
  if (!playerEmail) return;

  const bountiesQuery = await firestore.collection('bounties')
    .where('playerEmail', '==', playerEmail)
    .where('status', '==', 'active')
    .where('criterion.type', '==', 'cv_verified_drill')
    .get();

  for (const doc of bountiesQuery.docs) {
    const bountyDoc = doc.data();
    
    if (repData.verified && repData.confidence >= bountyDoc.criterion.minConfidence) {
      const verifiedReps = (repData.reps || 1);
      
      if (verifiedReps >= bountyDoc.criterion.requiredReps) {
        await doc.ref.update({
          status: 'unlocked',
          progressCurrent: verifiedReps,
          unlockedAt: new Date().toISOString()
        });

        logger.info('CV trigger unlocked bounty, invoking releaseTremendousBounty', { bountyId: doc.id });

        if (tremendous && tremendous.createBountyOrder) {
          const result = await tremendous.createBountyOrder({
            fundingSourceId: bountyDoc.fundingSourceId,
            recipientName: bountyDoc.playerName || bountyDoc.playerEmail,
            recipientEmail: bountyDoc.playerEmail,
            valueCents: bountyDoc.rewardCents,
            currency: bountyDoc.currency || 'USD',
            bountyId: doc.id,
            bountyTitle: bountyDoc.title,
          });

          await doc.ref.update({
            status: 'verified',
            tremendousOrderId: result.orderId,
            tremendousRecipientId: result.recipientId,
            verifiedAt: new Date().toISOString()
          });
        }
      }
    }
  }
});
