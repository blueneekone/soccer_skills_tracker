const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');

// Declare the secret utilizing Gen 2 params
const affinityWebhookSecret = defineSecret('AFFINITY_WEBHOOK_HMAC_SECRET');

exports.affinityWebhook = onRequest({ secrets: [affinityWebhookSecret] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const rawBody = req.rawBody;
  const signature = req.headers['x-affinity-signature'] || '';
  
  if (!signature) {
    logger.warn('[affinityWebhook] Missing signature');
    res.status(401).send('Unauthorized');
    return;
  }

  // Validate HMAC signature
  const secret = affinityWebhookSecret.value();
  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  
  // Use timingSafeEqual to prevent timing attacks
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    logger.error('[affinityWebhook] Invalid HMAC signature');
    res.status(401).send('Unauthorized');
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    logger.error('[affinityWebhook] Invalid JSON payload', err);
    res.status(400).send('Bad Request: Invalid JSON');
    return;
  }

  // Enforce Idempotency
  const eventId = payload.eventId || payload.messageId;
  if (!eventId) {
    logger.warn('[affinityWebhook] Payload missing eventId/messageId');
    res.status(400).send('Bad Request: Missing Event ID');
    return;
  }

  const db = admin.firestore();
  const eventRef = db.collection('affinity_webhook_events').doc(eventId);

  try {
    const eventDoc = await eventRef.get();
    if (eventDoc.exists) {
      logger.info(`[affinityWebhook] Event ${eventId} already processed, skipping.`);
      res.status(200).send('Already processed');
      return;
    }

    const { SIDCODE, externalSeasonId, members } = payload;
    if (!SIDCODE || !externalSeasonId || !Array.isArray(members)) {
      logger.warn('[affinityWebhook] Invalid payload structure, missing core fields');
      res.status(400).send('Bad Request: Invalid Structure');
      return;
    }

    // Lookup Team by SIDCODE and externalSeasonId
    const teamsQuery = await db.collection('teams')
      .where('sidcode', '==', SIDCODE)
      .where('seasonId', '==', externalSeasonId)
      .limit(1)
      .get();

    if (teamsQuery.empty) {
      logger.warn(`[affinityWebhook] No internal team found for SIDCODE: ${SIDCODE}, season: ${externalSeasonId}`);
      // Return 200 so they don't retry, but log it.
      res.status(200).send('Ignored: No matching team');
      return;
    }

    const teamId = teamsQuery.docs[0].id;

    // Use atomic writeBatch
    const batch = db.batch();
    let opCount = 0;
    const MAX_OPS = 500;

    // 1. Write the idempotency lock
    batch.set(eventRef, {
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      sidcode: SIDCODE,
      seasonId: externalSeasonId
    });
    opCount++;

    // 2. Process Members
    for (const member of members) {
      if (!member.id || !member.email) continue;
      
      // Stop if batch is full (math cap at 500)
      if (opCount >= MAX_OPS - 2) {
        logger.warn(`[affinityWebhook] Reached MAX_OPS limit for event ${eventId}. Truncating processing.`);
        break;
      }

      const emailKey = member.email.toLowerCase().trim();

      // Write roster link
      const rosterLinkRef = db.collection('roster_links').doc(member.id);
      batch.set(rosterLinkRef, {
        externalId: member.id,
        emailKey: emailKey,
        teamId: teamId,
        source: 'affinity',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      opCount++;

      // Write player eligibility
      const eligibilityId = `${emailKey}_${externalSeasonId}`;
      const eligibilityRef = db.collection('player_eligibility').doc(eligibilityId);
      
      const isSafeSportVerified = member.safeSportStatus === 'verified';
      const isConcussionVerified = member.concussionClearance === 'verified';
      const isEligible = isSafeSportVerified && isConcussionVerified; // Fail Closed Posture

      batch.set(eligibilityRef, {
        emailKey: emailKey,
        seasonId: externalSeasonId,
        safeSportStatus: member.safeSportStatus || 'missing',
        concussionClearance: member.concussionClearance || 'missing',
        redCards: typeof member.redCards === 'number' ? member.redCards : 0,
        eligible: isEligible,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      opCount++;
    }

    // Commit batch
    await batch.commit();
    logger.info(`[affinityWebhook] Successfully processed event ${eventId} with ${opCount} ops.`);

    res.status(200).send('OK');
  } catch (error) {
    logger.error(`[affinityWebhook] Internal processing error:`, error);
    res.status(500).send('Internal Server Error');
  }
});
