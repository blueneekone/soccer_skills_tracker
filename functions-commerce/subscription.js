/* eslint-disable quotes */
/**
 * subscription.js — Marketing / Stripe Checkout Stub
 * ────────────────────────────────────────────────────────────────────────────
 * PRODUCTION PATH: When going live, replace the stub block in `createSubscription`
 * with real Stripe Checkout Session creation:
 *
 *   
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
 * STUB PATH (current): Sets subscription_status: 'active' on
 * license_entitlements/{clubId} (the authoritative collection read by the
 * Player OS gate) so the UI lifts the billing gate without real payment.
 * Also mirrors to organizations/{tenantId} for legacy Director OS reads,
 * and writes an immutable subscription_log entry for billing audit purposes.
 *
 * TIER → Firestore field map:
 *   basecamp   → planTier: 'base_camp',   maxPlayers: 30
 *   pro        → planTier: 'pro',          maxPlayers: null (unlimited)
 *   enterprise → planTier: 'enterprise',   maxPlayers: null
 *
 * Exports:
 *   createSubscription — onCall
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret} = require('firebase-functions/params');


const REGION = 'us-east1';
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');

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
  const { getFirestore } = require("firebase-admin/firestore");
  const db = getFirestore();

  // ── LIVE Stripe Connect Checkout Session ─────────────────────────────────
  const secretKey = STRIPE_SECRET_KEY.value();
  if (!secretKey) {
    throw new HttpsError('failed-precondition', 'Stripe secret key not configured.');
  }

  const stripeClient = stripe(secretKey);
  const session = await stripeClient.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId || 'price_dummy', quantity: 1 }],
    customer_email: request.auth.token.email || undefined,
    metadata: {
      clubId: tenantId,
      tierType: tierId,
    },
    subscription_data: {
      application_fee_percent: 0,
      metadata: {
        clubId: tenantId,
        tierType: tierId,
      }
    },
    success_url: 'https://vanguardcommand.app/setup?checkout=success',
    cancel_url:  'https://vanguardcommand.app/pricing?checkout=cancelled',
  });

  logger.info('[createSubscription] Stripe session created', {tenantId, tierId, sessionId: session.id});

  return {
    status: 'pending',
    sessionUrl: session.url,
  };
});
