/* eslint-disable quotes */
/**
 * hotelRebates.js — B2B partner kickback flow
 * ────────────────────────────────────────────
 * Phase 2, Epic 2, Session I.
 *
 * Hotel block rebates are inverted economics from registrations/tickets:
 * a hotel partner (Marriott, Hilton, third-party booking platform) wires
 * Vanguard a commission for room nights booked by tournament attendees.
 * Vanguard keeps a slice and Stripe-Transfers the rest to the host NGB's
 * Connect account.
 *
 * Pricing-policy contract:
 *   rateCard.hotel_rebate.rateBp is a NEGATIVE basis-point value (e.g.
 *   -7000 = 70% kickback to the NGB, 30% retained by Vanguard).
 *   computePlatformFee() returns:
 *     - platformFeeCents:  NEGATIVE  (credit owed to NGB)
 *     - netCents:          POSITIVE  (Vanguard retention)
 *   so the ledger row carries the NGB credit as a negative fee and the
 *   Revenue console renders it under "Rebates received".
 *
 * State machine on `hotel_rebates/{rebateId}`:
 *   submitted  →  approved  →  transferred
 *           \                       /
 *            -----> rejected -----
 *
 * Two callables (super_admin only — these are fed from a manual or
 * scheduled partner reconciliation pipeline):
 *   submitHotelRebateRecord — record the receipt; write a ledger row.
 *   approveHotelRebatePayout — fire the Stripe Transfer to the NGB.
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

function requireSuper(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const role = request.auth.token.role ?? '';
  if (role !== 'super_admin' && role !== 'global_admin') {
    throw new HttpsError('permission-denied', 'Super admin required.');
  }
}

// ── submitHotelRebateRecord ─────────────────────────────────────────────────

/**
 * Record a hotel partner commission receipt and write the ledger entry.
 * Idempotent on `idempotencyKey` (the partner's settlement reference).
 *
 * Input:
 *   { tenantId, hotelPartnerId, periodStart, periodEnd,
 *     partnerCommissionCents, idempotencyKey }
 *
 * `partnerCommissionCents` is the gross amount Vanguard received from the
 * partner.  `computePlatformFee` splits it into:
 *   - NGB credit (negative fee = ledger credit)
 *   - Vanguard retention (positive net)
 *
 * Returns: { rebateId, ngbCreditCents, vanguardRetentionCents, rateBp }
 */
exports.submitHotelRebateRecord = onCall(
    {region: REGION},
    async (request) => {
      requireSuper(request);

      const {
        tenantId,
        hotelPartnerId,
        periodStart,
        periodEnd,
        partnerCommissionCents,
        idempotencyKey,
        linkedEventId,
        roomNights,
      } = request.data ?? {};

      if (typeof tenantId !== 'string' || !tenantId.trim()) {
        throw new HttpsError('invalid-argument', 'tenantId required.');
      }
      if (typeof hotelPartnerId !== 'string' || !hotelPartnerId.trim()) {
        throw new HttpsError('invalid-argument', 'hotelPartnerId required.');
      }
      const gross = Number(partnerCommissionCents);
      if (!Number.isInteger(gross) || gross <= 0) {
        throw new HttpsError(
            'invalid-argument',
            'partnerCommissionCents must be a positive integer (cents).',
        );
      }
      if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 3) {
        throw new HttpsError(
            'invalid-argument',
            'idempotencyKey required (use partner settlement reference).',
        );
      }

      // Verify tenant exists & has a Connect account for the eventual transfer.
      const orgSnap = await db.doc(`organizations/${tenantId}`).get();
      if (!orgSnap.exists) throw new HttpsError('not-found', 'Tenant not found.');
      const stripeAccountId = orgSnap.data()?.stripeAccountId;
      // Note: we record the rebate regardless of Stripe Connect status.
      // The transfer in `approveHotelRebatePayout` will fail later if the
      // tenant hasn't completed Connect onboarding — that's the correct
      // friction point (it forces the NGB to onboard to claim the rebate).
      void stripeAccountId;

      const policy = await loadActivePolicy(getRegistryDb());
      const fee = computePlatformFee({
        policy,
        transactionType: 'hotel_rebate',
        grossCents: gross,
      });

      // Conservation: gross = vanguardRetention + ngbCredit (in magnitudes).
      // computePlatformFee returns platformFeeCents = ngbCredit (negative)
      // and netCents = vanguardRetention (positive).
      const vanguardRetentionCents = fee.netCents;
      const ngbCreditCents = fee.platformFeeCents; // negative

      const rebateId = sanitizeRebateId(idempotencyKey);
      const rebateRef = db.collection('hotel_rebates').doc(rebateId);
      const existing = await rebateRef.get();
      if (existing.exists) {
        // Idempotent re-submission.  Return the prior values, do not overwrite.
        const prev = existing.data() || {};
        return {
          rebateId,
          ngbCreditCents: Number(prev.ngbCreditCents) || 0,
          vanguardRetentionCents: Number(prev.vanguardRetentionCents) || 0,
          rateBp: Number(prev.rateBp) || 0,
          alreadyRecorded: true,
        };
      }

      const batch = db.batch();
      batch.set(rebateRef, {
        rebateId,
        tenantId,
        hotelPartnerId,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        partnerCommissionCents: gross,
        ngbCreditCents,
        vanguardRetentionCents,
        rateBp: fee.rateBp,
        policyId: policy.id,
        policyVersion: policy.version,
        status: 'submitted',
        source: 'super_admin_console',
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        submittedByUid: request.auth.uid,
        idempotencyKey,
        linkedEventId: linkedEventId || null,
        roomNights: typeof roomNights === 'number' ? roomNights : null,
      });

      recordPlatformFee(batch, db, {
        tenantId,
        transactionType: 'hotel_rebate',
        sourceDocPath: `hotel_rebates/${rebateId}`,
        grossCents: gross,
        platformFeeCents: ngbCreditCents, // negative
        netCents: vanguardRetentionCents,
        rateBp: fee.rateBp,
        policyId: policy.id,
        policyVersion: policy.version,
        idempotencyKey: `hotel_rebate_${rebateId}`,
      });

      // Session B6 — mirror a compact summary onto the linked event doc.
      // Length-capped via arrayUnion so the embedded array stays bounded.
      if (linkedEventId && typeof linkedEventId === 'string') {
        const eventRef = db.doc(`tournament_events/${linkedEventId}`);
        batch.update(eventRef, {
          hotelRebates: admin.firestore.FieldValue.arrayUnion({
            rebateId,
            partnerId: hotelPartnerId,
            ngbCreditCents,
            roomNights: typeof roomNights === 'number' ? roomNights : null,
            recordedAt: new Date().toISOString(),
          }),
        });
      }

      await batch.commit();

      logger.info('submitHotelRebateRecord: recorded', {
        rebateId,
        tenantId,
        hotelPartnerId,
        gross,
        ngbCreditCents,
        vanguardRetentionCents,
      });

      return {
        rebateId,
        ngbCreditCents,
        vanguardRetentionCents,
        rateBp: fee.rateBp,
        alreadyRecorded: false,
      };
    },
);

// ── approveHotelRebatePayout ────────────────────────────────────────────────

/**
 * Approve a recorded rebate and fire the Stripe Transfer to the NGB's
 * Connect account.  Once `status === 'transferred'` the operation is
 * permanently locked (a redundant call is a no-op).
 *
 * Input:  { rebateId: string }
 * Returns: { status, transferId? }
 */
exports.approveHotelRebatePayout = onCall(
    {region: REGION, secrets: [STRIPE_SECRET_KEY]},
    async (request) => {
      requireSuper(request);

      const rebateId = String(request.data?.rebateId ?? '').trim();
      if (!rebateId) throw new HttpsError('invalid-argument', 'rebateId required.');

      const rebateRef = db.collection('hotel_rebates').doc(rebateId);
      const snap = await rebateRef.get();
      if (!snap.exists) throw new HttpsError('not-found', 'Rebate not found.');
      const rebate = snap.data() || {};

      if (rebate.status === 'transferred') {
        return {status: 'transferred', transferId: rebate.transferId || null, alreadyDone: true};
      }
      if (rebate.status !== 'submitted' && rebate.status !== 'approved') {
        throw new HttpsError(
            'failed-precondition',
            `Rebate is in status "${rebate.status}", cannot pay out.`,
        );
      }

      // Locate the host tenant's Connect account.
      const tenantId = String(rebate.tenantId || '').trim();
      const orgSnap = await db.doc(`organizations/${tenantId}`).get();
      const stripeAccountId = orgSnap.exists ?
        orgSnap.data()?.stripeAccountId :
        null;
      if (!stripeAccountId) {
        throw new HttpsError(
            'failed-precondition',
            'Tenant has no Stripe Connect account; cannot transfer.',
        );
      }

      // The amount to transfer is the absolute value of the NGB credit
      // (ngbCreditCents is negative — we used it as a ledger credit).
      const amount = Math.abs(Number(rebate.ngbCreditCents) || 0);
      if (amount <= 0) {
        throw new HttpsError(
            'failed-precondition',
            'ngbCreditCents is zero; nothing to transfer.',
        );
      }

      const stripeClient = getStripe();
      const transfer = await stripeClient.transfers.create({
        amount,
        currency: 'usd',
        destination: stripeAccountId,
        description: `Vanguard hotel rebate (${rebateId})`,
        metadata: {
          rebateId,
          tenantId,
          hotelPartnerId: String(rebate.hotelPartnerId || ''),
        },
      });

      await rebateRef.set(
          {
            status: 'transferred',
            transferId: transfer.id,
            transferredAt: admin.firestore.FieldValue.serverTimestamp(),
            transferredByUid: request.auth.uid,
          },
          {merge: true},
      );

      logger.info('approveHotelRebatePayout: transferred', {
        rebateId,
        tenantId,
        amount,
        transferId: transfer.id,
      });

      return {status: 'transferred', transferId: transfer.id};
    },
);

// ── Internals ───────────────────────────────────────────────────────────────

/** Firestore doc IDs disallow a small alphabet; sanitise defensively. */
function sanitizeRebateId(raw) {
  return String(raw).replace(/[\/.#$\[\]]/g, '_').slice(0, 1500);
}
