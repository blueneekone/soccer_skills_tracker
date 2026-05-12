/* eslint-disable quotes */
/**
 * recruiterBilling.js — Recruiter Hybrid Billing
 * ───────────────────────────────────────────────
 * Phase 2, Epic 2, Session M.
 *
 * Recruiters pay on a HYBRID model:
 *
 *   (1) An annual access subscription (Stripe `subscription` mode checkout),
 *       provisioned via the existing `createStripeCheckoutSession` callable.
 *       Stamped on `recruiter_accounts/{email}` with status='active'.
 *
 *   (2) A flat per-export charge for every lead/contact export they take,
 *       routed through the policy engine's `recruiter_lead_export` rate
 *       card entry (flatFeeCents path).  Charges are added to the existing
 *       Stripe subscription via `invoiceItem.create({ customer, amount })`,
 *       so they appear on the same monthly/annual invoice as the
 *       access fee.  No new PaymentIntents per export — that would be
 *       prohibitively expensive in Stripe fees on a $1-5 charge.
 *
 * Why metered + recurring instead of pay-as-you-go PaymentIntents?
 *   - $0.50 Stripe fee per PaymentIntent destroys margins on a $2 export.
 *   - Recruiters expect monthly billing, not per-action card charges.
 *   - InvoiceItems aggregate into the recurring invoice the customer
 *     already accepted via the annual sub.  No new payment surface.
 *
 * Idempotency
 * ────────────
 * `exportId` (caller-supplied UUID) is the idempotency key for both
 * the Firestore log entry AND the Stripe invoice item.  Re-running
 * recordRecruiterExport with the same exportId is a no-op.
 *
 * Exports:
 *   recordRecruiterExport  — onCall (recruiter)
 *   cancelRecruiterAccount — onCall (recruiter or super)
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret} = require('firebase-functions/params');

const {loadActivePolicy, computePlatformFee} = require('./pricingEngine');
const {recordPlatformFee} = require('./feeLedger');
const {getRegistryDb} = require('./cellRouter');

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');

const REGION = 'us-east1';

const db = admin.firestore();

function getStripe() {
  const stripe = require('stripe');
  return stripe(STRIPE_SECRET_KEY.value(), {apiVersion: '2024-06-20'});
}

// ── recordRecruiterExport ───────────────────────────────────────────────────

/**
 * Record a recruiter's lead export and queue the per-export fee against
 * their Stripe subscription invoice.
 *
 * Input: { exportId: string, leadCount: number, exportType?: string,
 *          searchQuery?: string }
 * Returns: { exportLogged, feeChargedCents, rateCard }
 *
 * Server-side authorisation:
 *   - Caller must be authed.
 *   - Caller's role must be 'recruiter'.
 *   - Caller must hold an active clearance (defensive — the route gate is
 *     the primary guard; this is layered).
 *   - `recruiter_accounts/{email}` must exist with subscription_status='active'.
 */
exports.recordRecruiterExport = onCall(
    {region: REGION, secrets: [STRIPE_SECRET_KEY]},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
      const role = request.auth.token.role ?? '';
      if (role !== 'recruiter') {
        throw new HttpsError('permission-denied', 'Recruiter role required.');
      }
      if (request.auth.token.isCleared !== true) {
        throw new HttpsError(
            'failed-precondition',
            'Active clearance required to export lead data.',
        );
      }

      const email = String(request.auth.token.email || '').toLowerCase();
      if (!email) throw new HttpsError('unauthenticated', 'Caller email missing.');

      const exportId = String(request.data?.exportId ?? '').trim();
      const leadCount = Number(request.data?.leadCount);
      const exportType = String(request.data?.exportType ?? 'csv');
      const searchQuery = typeof request.data?.searchQuery === 'string' ?
        String(request.data.searchQuery).slice(0, 500) :
        null;

      if (!exportId || exportId.length < 8) {
        throw new HttpsError(
            'invalid-argument',
            'exportId required (caller-generated UUID).',
        );
      }
      if (!Number.isInteger(leadCount) || leadCount <= 0 || leadCount > 10000) {
        throw new HttpsError('invalid-argument', 'leadCount must be 1..10000.');
      }

      // Verify the recruiter account is active.
      const recRef = db.collection('recruiter_accounts').doc(email);
      const recSnap = await recRef.get();
      if (!recSnap.exists) {
        throw new HttpsError(
            'failed-precondition',
            'No active recruiter subscription found.',
        );
      }
      const recData = recSnap.data() || {};
      if (recData.subscription_status !== 'active') {
        throw new HttpsError(
            'failed-precondition',
            `Recruiter subscription is "${recData.subscription_status}", not active.`,
        );
      }

      // Idempotency check.
      const logRef = db.collection('recruiter_export_log').doc(exportId);
      const existing = await logRef.get();
      if (existing.exists) {
        return {
          exportLogged: true,
          feeChargedCents: Number(existing.data()?.feeChargedCents) || 0,
          alreadyLogged: true,
        };
      }

      // Resolve the flat fee from the live policy.
      const policy = await loadActivePolicy(getRegistryDb());
      const fee = computePlatformFee({
        policy,
        transactionType: 'recruiter_lead_export',
        grossCents: 0, // Flat-fee path ignores gross; pass 0 for clarity.
      });
      const feeCents = fee.platformFeeCents;

      // Push a Stripe invoiceItem onto the recruiter's existing subscription.
      // Skip the call when the rate card has no flat fee configured (zero fee
      // is legal — write the audit row but do not bill Stripe).
      let stripeInvoiceItemId = null;
      if (feeCents > 0 && recData.stripe_customer_id) {
        try {
          const stripeClient = getStripe();
          const invoiceItem = await stripeClient.invoiceItems.create(
              {
                customer: String(recData.stripe_customer_id),
                amount: feeCents,
                currency: 'usd',
                description: `Lead export — ${leadCount} contacts (${exportType})`,
                metadata: {
                  exportId,
                  recruiterEmail: email,
                  leadCount: String(leadCount),
                  policyId: policy.id,
                  policyVersion: String(policy.version),
                },
              },
              {idempotencyKey: `export_${exportId}`},
          );
          stripeInvoiceItemId = invoiceItem.id;
        } catch (err) {
          logger.error('recordRecruiterExport: Stripe invoiceItem failed', {
            email,
            exportId,
            err: err instanceof Error ? err.message : String(err),
          });
          throw new HttpsError(
              'internal',
              'Failed to record export charge.  Try again or contact support.',
          );
        }
      }

      // Atomic batch: log entry + ledger row + recruiter usage counter.
      const batch = db.batch();
      batch.set(logRef, {
        exportId,
        recruiterEmail: email,
        recruiterUid: request.auth.uid,
        leadCount,
        exportType,
        searchQuery,
        feeChargedCents: feeCents,
        stripeInvoiceItemId,
        stripeCustomerId: recData.stripe_customer_id || null,
        policyId: policy.id,
        policyVersion: policy.version,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.set(recRef, {
        totalExports: admin.firestore.FieldValue.increment(1),
        totalLeadsExported: admin.firestore.FieldValue.increment(leadCount),
        totalFeesCents: admin.firestore.FieldValue.increment(feeCents),
        lastExportAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      recordPlatformFee(batch, db, {
        // Recruiter exports do not belong to a club tenant — use the
        // recruiter's email as the tenant scope so the rules' `emailKey()`
        // path lets the recruiter read their own receipts.
        tenantId: email,
        transactionType: 'recruiter_lead_export',
        sourceDocPath: `recruiter_export_log/${exportId}`,
        grossCents: 0,
        platformFeeCents: feeCents,
        netCents: -feeCents, // recruiter pays out -> negative net
        rateBp: 0,
        policyId: policy.id,
        policyVersion: policy.version,
        idempotencyKey: `recruiter_export_${exportId}`,
      });

      await batch.commit();

      logger.info('recordRecruiterExport: charged', {
        email,
        exportId,
        leadCount,
        feeCents,
        stripeInvoiceItemId,
      });

      return {
        exportLogged: true,
        feeChargedCents: feeCents,
        stripeInvoiceItemId,
      };
    },
);

// ── cancelRecruiterAccount ──────────────────────────────────────────────────

/**
 * Cancel the recruiter's annual subscription at period end.  Pending
 * invoice items (unbilled exports) will still settle on the final invoice;
 * post-cancellation exports will be rejected by `recordRecruiterExport`.
 *
 * Callable by the recruiter themselves (their own account only) or by
 * super_admin (any account, used during disputes / fraud cases).
 *
 * Input: { email?: string }  (defaults to caller's own email)
 */
exports.cancelRecruiterAccount = onCall(
    {region: REGION, secrets: [STRIPE_SECRET_KEY]},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
      const callerEmail = String(request.auth.token.email || '').toLowerCase();
      const callerRole = request.auth.token.role ?? '';
      const targetEmail = String(request.data?.email || callerEmail).toLowerCase();
      if (!targetEmail) throw new HttpsError('invalid-argument', 'Target email missing.');

      const isSelf = targetEmail === callerEmail;
      const isSuper = callerRole === 'super_admin' || callerRole === 'global_admin';
      if (!isSelf && !isSuper) {
        throw new HttpsError(
            'permission-denied',
            'Only the recruiter or a super admin may cancel an account.',
        );
      }

      const recRef = db.collection('recruiter_accounts').doc(targetEmail);
      const snap = await recRef.get();
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Recruiter account not found.');
      }
      const data = snap.data() || {};
      const subId = String(data.stripe_subscription_id || '');
      if (!subId) {
        await recRef.set({
          subscription_status: 'canceled',
          canceledAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
        return {status: 'canceled', note: 'no_stripe_subscription'};
      }

      try {
        const stripeClient = getStripe();
        await stripeClient.subscriptions.update(subId, {cancel_at_period_end: true});
      } catch (err) {
        logger.error('cancelRecruiterAccount: Stripe failed', {
          targetEmail,
          subId,
          err: err instanceof Error ? err.message : String(err),
        });
        throw new HttpsError('internal', 'Stripe cancellation failed.');
      }

      await recRef.set({
        subscription_status: 'canceling',
        cancelAtPeriodEndSetAt: admin.firestore.FieldValue.serverTimestamp(),
        canceledByUid: request.auth.uid,
      }, {merge: true});

      logger.info('cancelRecruiterAccount: scheduled', {targetEmail, subId});
      return {status: 'canceling'};
    },
);
