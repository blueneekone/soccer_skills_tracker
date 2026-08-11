/* eslint-disable quotes */
/**
 * feeLedger.js
 * ─────────────
 * Atomic write helpers for the platform fee ledger.
 *
 * Phase 2, Epic 2, Session C.
 *
 * The ledger is the single source of truth for every dollar Vanguard ever
 * takes (or pays out) on the platform.  It MUST satisfy three invariants:
 *
 *   1. ATOMIC with the underlying business transaction.  Callers pass an
 *      open `WriteBatch` (or `Transaction`) into `recordPlatformFee()` and
 *      this module APPENDS its writes to that batch.  The batch is committed
 *      by the caller — never here — so the ledger row and the source-of-truth
 *      doc (e.g. `season_registrations/{id}.paymentStatus = 'paid'`) land
 *      or fail together.
 *
 *   2. IDEMPOTENT against webhook retries.  Stripe will redeliver
 *      `payment_intent.succeeded` if our webhook returns non-2xx.  Doc IDs
 *      MUST be derived from the upstream key (`paymentIntent.id` /
 *      `exportId` / `rebateId`) so a redelivery is a no-op `set({merge:true})`
 *      on the same row.
 *
 *   3. APPEND-ONLY from the client side.  `firestore.rules` denies all
 *      client writes; only Admin SDK (this module) writes ledger rows.
 *
 * Counters
 * ─────────
 * Two denormalized counters travel alongside every ledger row:
 *
 *   • `organizations/{tenantId}/fee_summary/ytd` — calendar-year aggregates
 *     used by the Director OS Revenue console and by the volume-tier
 *     lookup in the fee calculator.
 *
 *   • `organizations/{tenantId}/fee_summary/{YYYY-MM}` — monthly buckets
 *     used by the sparkline.  Created lazily via `set({merge:true})`.
 *
 * All counter math is `FieldValue.increment()` for offline-safe commutativity
 * (Phase 1 atomic-batch contract).
 */

'use strict';

const admin = require('firebase-admin');
const {isTransactionType} = require('./pricingConstants');

const FieldValue = admin.firestore.FieldValue;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Append a platform-fee ledger row + counter increments to an open batch.
 *
 * The caller is responsible for:
 *   - opening the batch (or transaction) against the correct cell
 *     (`getRegistryDb()` for control-plane rebate flows, `getTenantDb()` for
 *     tenant-scoped registration/ticketing flows — see Session D / H / I).
 *   - committing the batch.
 *   - supplying a stable `idempotencyKey` that survives webhook retries.
 *
 * The function is synchronous (writes are enqueued, not awaited) — Firestore
 * batches return at commit time.
 *
 * @param {FirebaseFirestore.WriteBatch} batch Open batch.
 * @param {FirebaseFirestore.Firestore} db Firestore instance the batch belongs
 *   to.  Used to construct doc refs — MUST match the batch's database.
 * @param {{
 *   tenantId: string,
 *   transactionType: string,
 *   sourceDocPath: string,
 *   grossCents: number,
 *   platformFeeCents: number,
 *   netCents: number,
 *   rateBp: number,
 *   policyId: string,
 *   policyVersion: number,
 *   stripeChargeId?: string | null,
 *   paymentIntentId?: string | null,
 *   idempotencyKey: string,
 * }} entry
 * @returns {{ledgerRef: FirebaseFirestore.DocumentReference}}
 */
function recordPlatformFee(batch, db, entry) {
  validateEntry(entry);

  const ledgerId = sanitizeLedgerId(entry.idempotencyKey);
  const ledgerRef = db.collection('platform_fee_ledger').doc(ledgerId);

  batch.set(
      ledgerRef,
      {
        id: ledgerId,
        tenantId: entry.tenantId,
        transactionType: entry.transactionType,
        sourceDocPath: entry.sourceDocPath,
        grossCents: entry.grossCents,
        platformFeeCents: entry.platformFeeCents,
        netCents: entry.netCents,
        rateBp: entry.rateBp,
        policyId: entry.policyId,
        policyVersion: entry.policyVersion,
        stripeChargeId: entry.stripeChargeId || null,
        paymentIntentId: entry.paymentIntentId || null,
        recordedAt: FieldValue.serverTimestamp(),
      },
      {merge: true},
  );

  // YTD aggregate.  Path is namespaced inside the org doc so security rules
  // can grant read access to that org's directors without exposing the
  // full collection.
  const ytdRef = db
      .collection('organizations')
      .doc(entry.tenantId)
      .collection('fee_summary')
      .doc('ytd');

  batch.set(
      ytdRef,
      {
        grossCents: FieldValue.increment(entry.grossCents),
        feesCents: FieldValue.increment(entry.platformFeeCents),
        txnCount: FieldValue.increment(1),
        lastUpdatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true},
  );

  // Monthly bucket for the sparkline.  Use UTC year-month so reporting is
  // consistent regardless of facility timezone.
  const ym = utcYearMonth(new Date());
  const monthlyRef = db
      .collection('organizations')
      .doc(entry.tenantId)
      .collection('fee_summary')
      .doc(ym);

  batch.set(
      monthlyRef,
      {
        grossCents: FieldValue.increment(entry.grossCents),
        feesCents: FieldValue.increment(entry.platformFeeCents),
        txnCount: FieldValue.increment(1),
        lastUpdatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true},
  );

  return {ledgerRef};
}

// ── Internals ────────────────────────────────────────────────────────────────

/**
 * Reject malformed ledger entries early — these mistakes are cheaper to catch
 * at the batch-build site than after a Stripe redelivery hits a half-written
 * counter.
 *
 * @param {object} e
 */
function validateEntry(e) {
  if (!e || typeof e !== 'object') {
    throw new TypeError('recordPlatformFee: entry must be an object');
  }
  if (typeof e.tenantId !== 'string' || e.tenantId.length === 0) {
    throw new RangeError('recordPlatformFee: tenantId required');
  }
  if (!isTransactionType(e.transactionType)) {
    throw new RangeError(`recordPlatformFee: invalid transactionType "${e.transactionType}"`);
  }
  if (typeof e.sourceDocPath !== 'string' || e.sourceDocPath.length === 0) {
    throw new RangeError('recordPlatformFee: sourceDocPath required');
  }
  for (const key of ['grossCents', 'platformFeeCents', 'netCents', 'rateBp', 'policyVersion']) {
    if (!Number.isInteger(e[key])) {
      throw new RangeError(`recordPlatformFee: ${key} must be an integer`);
    }
  }
  // Conservation law — net + fee == gross.  Off-by-one would silently corrupt
  // the YTD aggregate, so we enforce it here even though the caller is
  // expected to have used `computePlatformFee()` (which guarantees it).
  if (e.grossCents - e.platformFeeCents !== e.netCents) {
    throw new RangeError('recordPlatformFee: gross - fee != net (conservation violated)');
  }
  if (typeof e.policyId !== 'string' || e.policyId.length === 0) {
    throw new RangeError('recordPlatformFee: policyId required');
  }
  if (typeof e.idempotencyKey !== 'string' || e.idempotencyKey.length === 0) {
    throw new RangeError('recordPlatformFee: idempotencyKey required');
  }
}

/**
 * Strip characters Firestore disallows in document IDs and clamp to 1500
 * bytes (Firestore's hard limit).  Stripe IDs are alphanumeric + underscore
 * so this is normally a no-op, but defensive coding is cheap here.
 *
 * @param {string} key
 * @returns {string}
 */
function sanitizeLedgerId(key) {
  const cleaned = String(key).replace(/[\/.#$\[\]]/g, '_');
  if (cleaned.length === 0) {
    throw new RangeError('recordPlatformFee: idempotencyKey empty after sanitisation');
  }
  return cleaned.slice(0, 1500);
}

/**
 * Format a Date as YYYY-MM in UTC.  Used as the monthly bucket doc ID.
 *
 * @param {Date} d
 * @returns {string}
 */
function utcYearMonth(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

module.exports = {
  recordPlatformFee,
};
