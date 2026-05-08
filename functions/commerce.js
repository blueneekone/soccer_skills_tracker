/* eslint-disable quotes */
/**
 * commerce.js — Stripe Connect Commerce Engine
 * ─────────────────────────────────────────────
 * Routes seasonal registration payments from Parents directly to the Club
 * Director's connected Stripe Express account, with Vanguard taking a 3%
 * platform fee via Stripe Connect Destination Charges.
 *
 * ARCHITECTURE
 * ────────────
 *  Parent                Club Director              Vanguard Platform
 *  ──────                ─────────────              ─────────────────
 *  PaymentIntent ──────► stripeAccountId ◄── onboarding via createConnectOnboarding
 *  (captured client-side with confirmCardPayment)
 *  ↓ payment.succeeded webhook
 *  season_registrations/{id}.paymentStatus = 'paid'
 *  users/{email}.activeSeasonStatus = 'active'
 *
 * COLLECTIONS
 * ───────────
 *  season_registrations/{registrationId}
 *    playerId, playerEmail, tenantId, seasonId,
 *    feeAmountCents, paymentIntentId, paymentStatus, paidAt
 *
 *  organizations/{tenantId}
 *    stripeAccountId  ← set by createConnectOnboarding
 *    stripeOnboardingComplete ← set by webhook
 *
 * SECRETS
 * ───────
 *  STRIPE_SECRET_KEY         — firebase functions:secrets:set STRIPE_SECRET_KEY
 *  STRIPE_WEBHOOK_SECRET_REG — firebase functions:secrets:set STRIPE_WEBHOOK_SECRET_REG
 *
 * Exports:
 *   createRegistrationIntent    — onCall: create PaymentIntent for season fee
 *   handleRegistrationWebhook   — onRequest: Stripe webhook handler
 *   createConnectOnboarding     — onCall: generate Stripe Express onboarding link
 *   getRegistrationStatus       — onCall: current payment status for player/season
 */

'use strict';

const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret, defineString} = require('firebase-functions/params');

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET_REG = defineSecret('STRIPE_WEBHOOK_SECRET_REG');
const APP_BASE_URL = defineString('APP_BASE_URL', {default: 'https://vanguardcommand.app'});

const REGION = 'us-central1';
const PLATFORM_FEE_RATE = 0.03; // 3% platform fee

const db = admin.firestore();

/** Lazy-init Stripe client so we don't crash if secret isn't set at cold start. */
function getStripe() {
  const stripe = require('stripe');
  return stripe(STRIPE_SECRET_KEY.value(), {apiVersion: '2024-06-20'});
}

// ── createRegistrationIntent ──────────────────────────────────────────────────

/**
 * Creates a Stripe PaymentIntent routed to the club's Stripe Connect account.
 *
 * Input: { seasonId: string, feeAmountDollars: number }
 * Returns: { clientSecret: string, registrationId: string, feeAmountCents: number }
 */
exports.createRegistrationIntent = onCall(
    {region: REGION, secrets: [STRIPE_SECRET_KEY]},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

      const role = request.auth.token.role ?? '';
      const tenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
      const callerUid = request.auth.uid;
      const callerEmail = (request.auth.token.email ?? '').toLowerCase();

      if (role !== 'parent' && role !== 'player') {
        throw new HttpsError('permission-denied', 'Only parents and players can initiate registration payment.');
      }

      const {seasonId, feeAmountDollars} = request.data ?? {};
      if (!seasonId) throw new HttpsError('invalid-argument', 'seasonId is required.');
      if (!feeAmountDollars || feeAmountDollars <= 0) {
        throw new HttpsError('invalid-argument', 'feeAmountDollars must be positive.');
      }
      if (feeAmountDollars > 5000) {
        throw new HttpsError('invalid-argument', 'Single registration fee cannot exceed $5,000.');
      }

      // Get the club's Stripe Connect account
      const orgSnap = await db.doc(`organizations/${tenantId}`).get();
      if (!orgSnap.exists) throw new HttpsError('not-found', 'Organisation not found.');
      const stripeAccountId = orgSnap.data()?.stripeAccountId;
      if (!stripeAccountId) {
        throw new HttpsError(
            'failed-precondition',
            'This club has not yet connected a Stripe account. Ask your club director to set up payments.',
        );
      }

      const feeAmountCents = Math.round(feeAmountDollars * 100);
      const platformFeeCents = Math.round(feeAmountCents * PLATFORM_FEE_RATE);

      const stripeClient = getStripe();
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: feeAmountCents,
        currency: 'usd',
        transfer_data: {destination: stripeAccountId},
        application_fee_amount: platformFeeCents,
        receipt_email: callerEmail || undefined,
        metadata: {
          tenantId,
          playerUid: callerUid,
          playerEmail: callerEmail,
          seasonId,
          type: 'season_registration',
        },
        description: `Season registration — ${orgSnap.data()?.name ?? tenantId}`,
      });

      // Pre-create the registration document as 'pending'
      const regRef = db.collection('season_registrations').doc();
      await regRef.set({
        registrationId: regRef.id,
        playerId: callerUid,
        playerEmail: callerEmail,
        tenantId,
        seasonId,
        feeAmountCents,
        platformFeeCents,
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'pending',
        stripeAccountId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paidAt: null,
      });

      logger.info('[createRegistrationIntent] intent created', {
        registrationId: regRef.id,
        tenantId,
        feeAmountCents,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        registrationId: regRef.id,
        feeAmountCents,
        platformFeeCents,
      };
    },
);

// ── handleRegistrationWebhook ─────────────────────────────────────────────────

/**
 * Stripe webhook handler for the registration payment flow.
 * Listens for `payment_intent.succeeded` and `payment_intent.payment_failed`.
 *
 * Deploy with:  firebase deploy --only functions:handleRegistrationWebhook
 * Configure in Stripe Dashboard → Webhooks → Add endpoint:
 *   URL: https://{region}-{project}.cloudfunctions.net/handleRegistrationWebhook
 *   Events: payment_intent.succeeded, payment_intent.payment_failed,
 *           account.updated (for Connect onboarding status)
 */
exports.handleRegistrationWebhook = onRequest(
    {region: REGION, secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET_REG]},
    async (req, res) => {
      if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

      const sig = req.headers['stripe-signature'];
      let event;
      try {
        const stripeClient = getStripe();
        // Firebase Functions provides req.rawBody for webhook signature verification
        event = stripeClient.webhooks.constructEvent(
            req.rawBody,
            sig,
            STRIPE_WEBHOOK_SECRET_REG.value(),
        );
      } catch (err) {
        logger.error('[webhook] signature verification failed', {err: err.message});
        res.status(400).send(`Webhook signature error: ${err.message}`);
        return;
      }

      const pi = event.data?.object;

      try {
        switch (event.type) {
          case 'payment_intent.succeeded': {
            await handlePaymentSucceeded(pi);
            break;
          }
          case 'payment_intent.payment_failed': {
            await handlePaymentFailed(pi);
            break;
          }
          case 'account.updated': {
            await handleConnectAccountUpdated(event.data.object);
            break;
          }
          default:
            logger.info('[webhook] unhandled event type', {type: event.type});
        }
        res.json({received: true});
      } catch (err) {
        logger.error('[webhook] handler error', {type: event.type, err: err.message});
        res.status(500).json({error: err.message});
      }
    },
);

async function handlePaymentSucceeded(pi) {
  const {tenantId, playerUid, playerEmail, seasonId} = pi.metadata ?? {};
  if (!tenantId || !playerUid) {
    logger.warn('[webhook] missing metadata on PaymentIntent', {piId: pi.id});
    return;
  }

  // Find the pending registration document by paymentIntentId
  const regSnap = await db
      .collection('season_registrations')
      .where('paymentIntentId', '==', pi.id)
      .limit(1)
      .get();

  const batch = db.batch();

  if (!regSnap.empty) {
    batch.update(regSnap.docs[0].ref, {
      paymentStatus: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      stripeChargeId: pi.latest_charge ?? null,
    });
  }

  // Unlock the player's active season status
  if (playerEmail) {
    batch.update(db.doc(`users/${playerEmail}`), {
      activeSeasonStatus: 'active',
      activeSeasonId: seasonId ?? null,
      seasonPaidAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Immutable audit log
  batch.set(db.collection('audit_logs').doc(), {
    action: 'SEASON_REGISTRATION_PAID',
    actorUid: playerUid,
    targetEmail: playerEmail ?? null,
    tenantId,
    seasonId: seasonId ?? null,
    amountCents: pi.amount,
    paymentIntentId: pi.id,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  logger.info('[webhook] payment succeeded', {piId: pi.id, tenantId, playerEmail});
}

async function handlePaymentFailed(pi) {
  const regSnap = await db
      .collection('season_registrations')
      .where('paymentIntentId', '==', pi.id)
      .limit(1)
      .get();
  if (!regSnap.empty) {
    await regSnap.docs[0].ref.update({
      paymentStatus: 'failed',
      failureCode: pi.last_payment_error?.code ?? null,
      failureMessage: pi.last_payment_error?.message?.slice(0, 200) ?? null,
    });
  }
  logger.info('[webhook] payment failed', {piId: pi.id});
}

async function handleConnectAccountUpdated(account) {
  if (!account.metadata?.tenantId) return;
  const {tenantId} = account.metadata;
  await db.doc(`organizations/${tenantId}`).update({
    stripeOnboardingComplete: account.details_submitted && account.charges_enabled,
    stripePayoutsEnabled: account.payouts_enabled ?? false,
    stripeUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  logger.info('[webhook] connect account updated', {tenantId, chargesEnabled: account.charges_enabled});
}

// ── createConnectOnboarding ───────────────────────────────────────────────────

/**
 * Creates or resumes a Stripe Connect Express onboarding session for a Club Director.
 * The director is redirected to Stripe's hosted onboarding UI.
 * On completion, Stripe sends `account.updated` to `handleRegistrationWebhook`.
 *
 * Returns: { url: string }  — redirect this in the browser
 */
exports.createConnectOnboarding = onCall(
    {region: REGION, secrets: [STRIPE_SECRET_KEY]},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

      const role = request.auth.token.role ?? '';
      const tenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
      if (role !== 'director' && role !== 'super_admin' && role !== 'global_admin') {
        throw new HttpsError('permission-denied', 'Director role required.');
      }

      const orgRef = db.doc(`organizations/${tenantId}`);
      const orgSnap = await orgRef.get();
      if (!orgSnap.exists) throw new HttpsError('not-found', 'Organisation not found.');

      const stripeClient = getStripe();
      let stripeAccountId = orgSnap.data()?.stripeAccountId;

      if (!stripeAccountId) {
        // Create a new Stripe Express account for this club
        const account = await stripeClient.accounts.create({
          type: 'express',
          metadata: {tenantId},
          email: request.auth.token.email ?? undefined,
          business_profile: {
            name: orgSnap.data()?.name ?? `Club ${tenantId}`,
            url: `${APP_BASE_URL.value()}/club/${tenantId}`,
          },
          capabilities: {
            card_payments: {requested: true},
            transfers: {requested: true},
          },
        });
        stripeAccountId = account.id;
        await orgRef.update({
          stripeAccountId,
          stripeOnboardingComplete: false,
        });
      }

      const accountLink = await stripeClient.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${APP_BASE_URL.value()}/director?stripe=refresh`,
        return_url: `${APP_BASE_URL.value()}/director?stripe=connected`,
        type: 'account_onboarding',
      });

      logger.info('[createConnectOnboarding] link created', {tenantId});
      return {url: accountLink.url};
    },
);

// ── getRegistrationStatus ─────────────────────────────────────────────────────

/**
 * Returns the payment status of a player's registration for a given season.
 *
 * Input: { playerEmail?: string, seasonId: string }
 * Returns: { status: 'none' | 'pending' | 'paid' | 'failed', registrationId?: string }
 */
exports.getRegistrationStatus = onCall({region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const role = request.auth.token.role ?? '';
  const tenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
  const callerEmail = (request.auth.token.email ?? '').toLowerCase();

  const {playerEmail, seasonId} = request.data ?? {};
  if (!seasonId) throw new HttpsError('invalid-argument', 'seasonId is required.');

  // Determine which email to look up
  let targetEmail = callerEmail;
  if (playerEmail && playerEmail !== callerEmail) {
    // Coach / director / parent looking up a specific player
    if (role !== 'coach' && role !== 'director' && role !== 'parent' && !['super_admin', 'global_admin'].includes(role)) {
      throw new HttpsError('permission-denied', 'Cannot look up other players\' registration status.');
    }
    targetEmail = playerEmail.toLowerCase();
  }

  const snap = await db
      .collection('season_registrations')
      .where('playerEmail', '==', targetEmail)
      .where('tenantId', '==', tenantId)
      .where('seasonId', '==', seasonId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

  if (snap.empty) return {status: 'none'};
  const data = snap.docs[0].data();
  return {
    status: data.paymentStatus,
    registrationId: snap.docs[0].id,
    feeAmountCents: data.feeAmountCents,
    paidAt: data.paidAt?.toMillis?.() ?? null,
  };
});
