/* eslint-disable quotes */
/**
 * subscription.js â€” Marketing / Stripe Checkout Stub
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * PRODUCTION PATH: When going live, replace the stub block in `createSubscription`
 * with real Stripe Checkout Session creation:
 *
 *   const stripe = require('stripe')(STRIPE_SECRET_KEY.value());
 *   const session = await stripe.checkout.sessions.create({
 *     mode: 'subscription',
 *     line_items: [{ price: priceId, quantity: 1 }],
 *     customer_email: callerEmail,
 *     metadata: { tenantId, tierId },
 *     success_url: 'https://vanguardcommand.app/setup?checkout=success',
 *     cancel_url:  'https://vanguardcommand.app/pricing?checkout=cancelled',
 *   });
 *   return { sessionUrl: session.url };
 *
 * STUB PATH (current): Sets subscriptionStatus: 'active' directly on the tenant's
 * Firestore document so the UI shows a success state without real payment.
 * Also writes an immutable subscription_log entry for billing audit purposes.
 *
 * TIER â†’ Firestore field map:
 *   basecamp   â†’ planTier: 'base_camp',   maxPlayers: 30
 *   pro        â†’ planTier: 'pro',          maxPlayers: null (unlimited)
 *   enterprise â†’ planTier: 'enterprise',   maxPlayers: null
 *
 * Exports:
 *   createSubscription â€” onCall
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const db = admin.firestore();

const TIER_CONFIG = {
  basecamp: {planTier: 'base_camp', maxPlayers: 30, label: 'Base Camp'},
  pro: {planTier: 'pro', maxPlayers: null, label: 'Vanguard Pro'},
  enterprise: {planTier: 'enterprise', maxPlayers: null, label: 'Enterprise'},
};

exports.createSubscription = onCall({region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const {priceId, tenantId, tierId} = request.data ?? {};
  const callerUid = request.auth.uid;
  const callerRole = request.auth.token.role ?? '';
  const callerTenant = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';

  if (!tierId || !TIER_CONFIG[tierId]) {
    throw new HttpsError('invalid-argument', `Unknown tierId: ${tierId}`);
  }
  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId is required.');
  }

  // Only directors and admins may change subscription
  if (callerRole !== 'director' && callerRole !== 'super_admin' && callerRole !== 'global_admin') {
    throw new HttpsError('permission-denied', 'Director role required to manage subscriptions.');
  }
  if (callerRole === 'director' && callerTenant !== tenantId) {
    throw new HttpsError('permission-denied', 'Tenant mismatch.');
  }

  const config = TIER_CONFIG[tierId];
  const now = admin.firestore.FieldValue.serverTimestamp();

  // â”€â”€ STUB: Directly activate subscription in Firestore â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PRODUCTION: Remove this block and return Stripe session URL instead.
  const orgRef = db.doc(`organizations/${tenantId}`);
  await orgRef.set({
    subscriptionStatus: 'active',
    planTier: config.planTier,
    maxPlayers: config.maxPlayers,
    subscribedAt: now,
    subscribedByUid: callerUid,
    stripepriceId: priceId ?? null,
  }, {merge: true});

  // Immutable subscription log
  await db.collection('subscription_logs').add({
    tenantId,
    callerUid,
    tierId,
    planTier: config.planTier,
    priceId: priceId ?? null,
    action: 'SUBSCRIBED_STUB',
    timestamp: now,
  });

  logger.info('[createSubscription] stub activated', {tenantId, tierId});

  return {
    status: 'activated',
    planTier: config.planTier,
    label: config.label,
    // sessionUrl: null â€” set when Stripe integration is live
  };
});
