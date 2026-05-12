/* eslint-disable quotes */
/**
 * legacyBillingOps.js
 * ────────────────────
 * Sunset path for the per-seat SaaS subscription model.
 *
 * Phase 2, Epic 2, Session E.
 *
 * One-way valve:  every legacy `license_entitlements/{clubId}` with an
 * active Stripe subscription is migrated to the new transaction-based
 * billing model.  The subscription is cancelled at period end so the club
 * keeps the access it has already paid for; on natural cancellation the
 * `customer.subscription.deleted` webhook flips `billingModel` to
 * `'transaction_billing'`, and the read-only paywall (Session F) stops
 * tripping.
 *
 * Recruiter carve-out
 * ───────────────────
 * Entries with `tier === 'recruiter'` are EXCLUDED here — they migrate to
 * the recruiter-hybrid model in Session M, not sunset to free.
 *
 * Exports:
 *   sunsetLegacySubscription  (onCall, super_admin)
 *   sweepLegacySubscriptions  (onSchedule, weekly)
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret} = require('firebase-functions/params');

const {getRegistryDb} = require('./cellRouter');

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');

const REGION = 'us-east1';

/** Tiers eligible for sunset.  `recruiter` is intentionally absent. */
const SUNSETTABLE_TIERS = Object.freeze(['tutor', 'team', 'club']);

/** Lazy-init Stripe so the absence of a secret never crashes cold-starts. */
function getStripe() {
  const stripe = require('stripe');
  return stripe(STRIPE_SECRET_KEY.value(), {apiVersion: '2024-06-20'});
}

// ── sunsetLegacySubscription ────────────────────────────────────────────────

/**
 * Cancel one tenant's legacy subscription at period end and flip
 * `organizations/{clubId}.billingModel` to `'transaction_billing'`.
 *
 * Idempotent: re-running on an already-sunset tenant is a no-op.
 *
 * Input:  { clubId: string }
 * Returns: { status: 'sunset' | 'skipped' | 'no_subscription', clubId, tier? }
 */
exports.sunsetLegacySubscription = onCall(
    {region: REGION, secrets: [STRIPE_SECRET_KEY]},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
      const role = request.auth.token.role ?? '';
      if (role !== 'super_admin' && role !== 'global_admin') {
        throw new HttpsError('permission-denied', 'Super admin required.');
      }

      const clubId = String(request.data?.clubId ?? '').trim();
      if (!clubId) throw new HttpsError('invalid-argument', 'clubId required.');

      const registry = getRegistryDb();
      const entRef = registry.collection('license_entitlements').doc(clubId);
      const entSnap = await entRef.get();
      if (!entSnap.exists) return {status: 'skipped', clubId, reason: 'no_entitlement'};

      const ent = entSnap.data() || {};
      const tier = String(ent.tier || '').toLowerCase();

      // Recruiter carve-out — these migrate in Session M.
      if (tier === 'recruiter') {
        return {status: 'skipped', clubId, tier, reason: 'recruiter_carveout'};
      }
      if (!SUNSETTABLE_TIERS.includes(tier)) {
        return {status: 'skipped', clubId, tier, reason: 'tier_not_sunsettable'};
      }
      if (String(ent.subscription_status || '').toLowerCase() !== 'active') {
        // Already cancelled or never active.  Just flip the org-side flag.
        await flipOrgToTransactionBilling(registry, clubId, ent);
        return {status: 'skipped', clubId, tier, reason: 'subscription_not_active'};
      }

      const subId = String(ent.stripe_subscription_id || '');
      if (!subId) {
        await flipOrgToTransactionBilling(registry, clubId, ent);
        return {status: 'skipped', clubId, tier, reason: 'missing_stripe_subscription_id'};
      }

      try {
        const stripeClient = getStripe();
        await stripeClient.subscriptions.update(subId, {cancel_at_period_end: true});
      } catch (err) {
        logger.error('sunsetLegacySubscription: Stripe update failed', {
          clubId,
          subId,
          err: err instanceof Error ? err.message : String(err),
        });
        throw new HttpsError('internal', 'Stripe subscription update failed.');
      }

      await entRef.set(
          {
            subscription_sunset_at: admin.firestore.FieldValue.serverTimestamp(),
            sunset_actor_uid: request.auth.uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'sunsetLegacySubscription',
          },
          {merge: true},
      );
      await flipOrgToTransactionBilling(registry, clubId, ent);

      logger.info('sunsetLegacySubscription: scheduled cancellation', {clubId, tier, subId});
      return {status: 'sunset', clubId, tier};
    },
);

// ── sweepLegacySubscriptions ────────────────────────────────────────────────

/**
 * Scheduled weekly sweep.  Iterates every active legacy entitlement on
 * a sunsettable tier and applies the same logic as the onCall above.
 *
 * Recruiters are excluded by the SUNSETTABLE_TIERS allowlist.
 *
 * Schedule: every Monday 03:00 America/New_York.  Times of day are
 * informational only — the sweep is idempotent and safe to run anytime.
 */
exports.sweepLegacySubscriptions = onSchedule(
    {
      region: REGION,
      schedule: 'every monday 03:00',
      timeZone: 'America/New_York',
      secrets: [STRIPE_SECRET_KEY],
    },
    async () => {
      const registry = getRegistryDb();
      const snap = await registry
          .collection('license_entitlements')
          .where('tier', 'in', SUNSETTABLE_TIERS)
          .where('subscription_status', '==', 'active')
          .get();

      logger.info('sweepLegacySubscriptions: candidates', {count: snap.size});

      let succeeded = 0;
      let skipped = 0;
      let failed = 0;

      for (const docSnap of snap.docs) {
        const clubId = docSnap.id;
        const ent = docSnap.data() || {};
        const tier = String(ent.tier || '').toLowerCase();
        if (tier === 'recruiter') {
          skipped += 1;
          continue;
        }
        const subId = String(ent.stripe_subscription_id || '');
        if (!subId) {
          await flipOrgToTransactionBilling(registry, clubId, ent);
          skipped += 1;
          continue;
        }
        try {
          const stripeClient = getStripe();
          await stripeClient.subscriptions.update(subId, {cancel_at_period_end: true});
          await docSnap.ref.set(
              {
                subscription_sunset_at: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: 'sweepLegacySubscriptions',
              },
              {merge: true},
          );
          await flipOrgToTransactionBilling(registry, clubId, ent);
          succeeded += 1;
        } catch (err) {
          failed += 1;
          logger.error('sweepLegacySubscriptions: subscription update failed', {
            clubId,
            subId,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }

      logger.info('sweepLegacySubscriptions: done', {succeeded, skipped, failed});
    },
);

// ── Internals ──────────────────────────────────────────────────────────────

/**
 * Flip `organizations/{clubId}.billingModel` to `'transaction_billing'`.
 * Safe to call regardless of current state — Firestore merge is idempotent
 * and we only write the field if it differs to avoid spurious updatedAt
 * churn that would trigger downstream onWrite triggers (syncUserClaims, etc.).
 *
 * @param {FirebaseFirestore.Firestore} registry
 * @param {string} clubId
 * @param {object} entSnap Source entitlement data (for logging only).
 */
async function flipOrgToTransactionBilling(registry, clubId, entSnap) {
  const orgRef = registry.collection('organizations').doc(clubId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) {
    logger.warn('flipOrgToTransactionBilling: org missing', {clubId, entTier: entSnap?.tier});
    return;
  }
  const current = orgSnap.data() || {};
  if (current.billingModel === 'transaction_billing') return;
  await orgRef.set(
      {
        billingModel: 'transaction_billing',
        billingModelMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );
}

module.exports = {
  ...module.exports,
  flipOrgToTransactionBilling,
};
