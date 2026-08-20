/* eslint-disable quotes */
/**
 * pricingConstants.js
 * ───────────────────
 * Server-side mirror of `src/lib/types/pricing.ts`.
 *
 * The Cloud Functions codebase is plain CommonJS (no TS build step), so the
 * canonical TypeScript module cannot be imported directly.  Keep the constants
 * below in sync with `src/lib/types/pricing.ts` — any divergence introduces
 * split-brain billing math.
 *
 * If a new constant is added to the canonical file, mirror it here BEFORE
 * shipping any server code that depends on it.
 */

'use strict';

/** Canonical policy doc ID. */
const DEFAULT_POLICY_ID = 'default-v1';

/** Basis-point denominator: 10_000 bp = 100.00%. */
const BP_DIVISOR = 10_000;

/**
 * Closed set of TransactionType tags.  Mirror of the canonical TS union.
 * Frozen so a stray `TRANSACTION_TYPES.push(...)` doesn't drift the schema.
 */
const TRANSACTION_TYPES = Object.freeze([
  'season_registration',
  'digital_ticketing',
  'hotel_rebate',
  'merch_sale',
  'tournament_entry',
  'recruiter_lead_export',
]);

/** Closed set of BillingModel tags. */
const BILLING_MODELS = Object.freeze([
  'legacy_subscription',
  'transaction_billing',
  'grandfathered_free',
  'recruiter_hybrid',
]);

/**
 * @param {unknown} candidate
 * @returns {boolean}
 */
function isTransactionType(candidate) {
  return typeof candidate === 'string' && TRANSACTION_TYPES.indexOf(candidate) !== -1;
}

/**
 * @param {unknown} candidate
 * @returns {boolean}
 */
function isBillingModel(candidate) {
  return typeof candidate === 'string' && BILLING_MODELS.indexOf(candidate) !== -1;
}

module.exports = {
  DEFAULT_POLICY_ID,
  BP_DIVISOR,
  TRANSACTION_TYPES,
  BILLING_MODELS,
  isTransactionType,
  isBillingModel,
};
