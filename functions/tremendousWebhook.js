/* eslint-disable max-len */
/**
 * tremendousWebhook.js
 * ─────────────────────
 * HTTPS handler for Tremendous reward-status webhook events.
 *
 * Tremendous calls this endpoint when an order's status changes (e.g.
 * REWARDS.PAID, REWARDS.FAILED, ORDER.REFUNDED).  We update the bounty
 * status and write an audit entry.
 *
 * Security:
 *   - Signature verified via HMAC-SHA256 before any Firestore writes.
 *   - Raw body buffered before JSON.parse so the signature calculation is
 *     over exactly the bytes Tremendous signed.
 *
 * Webhook registration:
 *   Set the endpoint URL in Tremendous → Settings → Webhooks.
 *   Retrieve the signing secret and store it:
 *     firebase functions:secrets:set TREMENDOUS_WEBHOOK_SECRET
 */

const logger = require('firebase-functions/logger');
const admin  = require('firebase-admin');
const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const {verifyWebhookSignature} = require('./tremendous');
const {writeBountyAudit} = require('./bountyOps');

const TREMENDOUS_WEBHOOK_SECRET = defineSecret('TREMENDOUS_WEBHOOK_SECRET');

/**
 * Tremendous webhook receiver.
 * Method: POST
 * Path: /tremendousWebhook
 */
exports.tremendousWebhook = onRequest(
    {secrets: [TREMENDOUS_WEBHOOK_SECRET]},
    async (req, res) => {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      const signature = req.headers['tremendous-webhook-signature'] || '';
      if (!signature) {
        logger.warn('tremendousWebhook: missing signature header');
        res.status(400).send('Missing signature');
        return;
      }

      // Raw body is already a string/Buffer when using onRequest with firebase v2.
      const rawBody = typeof req.rawBody === 'string' ?
        req.rawBody :
        (req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body));

      try {
        verifyWebhookSignature(rawBody, signature, TREMENDOUS_WEBHOOK_SECRET.value());
      } catch (err) {
        logger.warn('tremendousWebhook: signature verification failed', {err: err.message});
        res.status(401).send('Signature verification failed');
        return;
      }

      const event = req.body || {};
      const eventType  = event.type   || '';
      const eventData  = event.data   || {};
      const orderId    = (eventData.order || {}).id || (eventData.reward || {}).order_id || '';
      const rewardData = eventData.reward || {};

      logger.info('tremendousWebhook: received', {eventType, orderId});

      if (!orderId) {
        logger.warn('tremendousWebhook: no orderId in payload', {event});
        res.status(200).send('ok'); // Ack so Tremendous does not retry.
        return;
      }

      const firestore = admin.firestore();

      // Find the bounty by tremendousOrderId.
      const q = await firestore
          .collection('bounties')
          .where('tremendousOrderId', '==', orderId)
          .limit(1)
          .get();

      if (q.empty) {
        logger.info('tremendousWebhook: no bounty found for orderId', {orderId});
        res.status(200).send('ok');
        return;
      }

      const bountySnap = q.docs[0];
      const bountyId   = bountySnap.id;
      const bounty     = bountySnap.data();

      let newStatus = null;
      let reason    = eventType;

      switch (eventType) {
        case 'REWARDS.PAID':
        case 'ORDER.APPROVED':
          newStatus = 'paid';
          break;
        case 'REWARDS.FAILED':
        case 'ORDER.REJECTED':
          newStatus = 'failed';
          break;
        default:
          // Other event types (e.g. REWARDS.DELIVERED) — log only.
          logger.info('tremendousWebhook: unhandled event type', {eventType, bountyId});
          res.status(200).send('ok');
          return;
      }

      const oldStatus = bounty.status;
      const now = new Date().toISOString();

      const updateData = {status: newStatus};
      if (newStatus === 'paid') {
        updateData.paidAt = now;
      }

      await bountySnap.ref.update(updateData);

      await writeBountyAudit(
          firestore, bountyId,
          bounty.householdId, bounty.tenantId,
          oldStatus, newStatus,
          'tremendousWebhook', reason,
      );

      // Dispatch FCM notification to parent + child (via notificationOps).
      try {
        const {dispatchBountyPaid} = require('./src/domains/notificationOps');
        if (newStatus === 'paid') {
          await dispatchBountyPaid(firestore, bounty, bountyId);
        }
      } catch (err) {
        // Notification failures are non-fatal for the webhook response.
        logger.error('tremendousWebhook: dispatchBountyPaid failed', {bountyId, err});
      }

      logger.info('tremendousWebhook: bounty updated', {bountyId, newStatus});
      res.status(200).send('ok');
    },
);
