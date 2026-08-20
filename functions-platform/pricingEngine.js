/* eslint-disable quotes */
/**
 * pricingEngine.js
 * ────────────────
 * Pure functions that convert (tenantId, transactionType, grossCents) into
 * a deterministic platform fee.  No Firestore writes here — the calculator
 * is policy-driven; the writer is `feeLedger.js` (Session C).
 *
 * Phase 2, Epic 2, Session B.
 *
 * Math rule
 * ─────────
 * Integer cents in, integer cents out.  Basis points are integers (100 bp =
 * 1.00%).  Internal multiplications happen as 64-bit BigInt to avoid the
 * 2^53 float-precision cliff for tenants pushing $10M+ annual volume.
 * Round-half-up is applied EXACTLY ONCE — at the boundary back to Number.
 *
 * Policy resolution
 * ─────────────────
 * `loadActivePolicy(registryDb, policyId?)` reads from the (default) cell.
 * Per-tenant overrides are achieved by passing a non-default `policyId` —
 * the caller is expected to read `organizations/{tenantId}.pricingPolicyId`
 * first and supply it.  If the override doc is missing we silently fall back
 * to `default-v1` rather than throw — a missing override is a soft signal
 * that the org was assigned a special policy that has since been retired,
 * and we'd rather charge the default than break revenue.
 */

'use strict';

const {DEFAULT_POLICY_ID, BP_DIVISOR, isTransactionType} = require('./pricingConstants');

// ── Policy loader ────────────────────────────────────────────────────────────

/**
 * Resolve a pricing policy doc.
 *
 * @param {FirebaseFirestore.Firestore} registryDb Always the (default) cell.
 *   Pass `getRegistryDb()` — never `getRequestDb(request)`.
 * @param {string} [policyId] Optional override.  Falls back to default-v1
 *   when missing or when the requested doc does not exist.
 * @returns {Promise<import('./pricingConstants').PricingPolicyDoc>}
 */
async function loadActivePolicy(registryDb, policyId) {
  const targetId = typeof policyId === 'string' && policyId.trim().length > 0 ?
    policyId.trim() :
    DEFAULT_POLICY_ID;
  let snap = await registryDb.collection('pricing_policy').doc(targetId).get();
  if (!snap.exists && targetId !== DEFAULT_POLICY_ID) {
    // Soft-fall back to default — see header note.
    snap = await registryDb.collection('pricing_policy').doc(DEFAULT_POLICY_ID).get();
  }
  if (!snap.exists) {
    // First-launch safety net: the policy collection is empty until
    // `bootstrapPricingPolicy` is run.  Treat as "no fee" — charge zero
    // and continue with the underlying transaction.  The ledger row will
    // still be written so finance can spot the gap.
    return {
      id: DEFAULT_POLICY_ID,
      version: 0,
      rateCard: {},
      volumeBreakpoints: [],
      maxFeeCentsPerTxn: null,
    };
  }
  const data = snap.data() || {};
  return {
    id: snap.id,
    version: Number(data.version) || 0,
    activeFrom: data.activeFrom || null,
    rateCard: (data.rateCard && typeof data.rateCard === 'object') ? data.rateCard : {},
    volumeBreakpoints: Array.isArray(data.volumeBreakpoints) ? data.volumeBreakpoints : [],
    maxFeeCentsPerTxn: typeof data.maxFeeCentsPerTxn === 'number' ?
      data.maxFeeCentsPerTxn :
      null,
    recruiterAnnualCents: typeof data.recruiterAnnualCents === 'number' ?
      data.recruiterAnnualCents :
      undefined,
  };
}

// ── Calculator ───────────────────────────────────────────────────────────────

/**
 * Compute a deterministic platform fee.
 *
 * Returns `{ platformFeeCents, netCents, rateBp, policyVersion, flatFee }`
 * where:
 *   - `platformFeeCents` is signed (positive = Vanguard takes, negative =
 *     Vanguard pays).  Always an integer.
 *   - `netCents = grossCents - platformFeeCents`.
 *   - `rateBp` is the basis-point rate that was applied — useful for the
 *     ledger row so historical reads can reconstruct the math.  When the
 *     flat-fee path is used `rateBp` is 0 and `flatFee` is true.
 *
 * Validation invariants (each throws RangeError on violation):
 *   1. `grossCents` must be a finite integer >= 0 (zero is legal for
 *      flat-fee paths like recruiter exports).
 *   2. `transactionType` must be a recognised tag.
 *   3. A `RateCardEntry` MUST NOT have both `rateBp` and `flatFeeCents` set.
 *
 * @param {{
 *   policy: import('./pricingConstants').PricingPolicyDoc,
 *   transactionType: string,
 *   grossCents: number,
 *   ytdGrossCents?: number,
 * }} args
 * @returns {{
 *   platformFeeCents: number,
 *   netCents: number,
 *   rateBp: number,
 *   policyVersion: number,
 *   flatFee: boolean,
 * }}
 */
function computePlatformFee({policy, transactionType, grossCents, ytdGrossCents}) {
  if (!Number.isFinite(grossCents) || !Number.isInteger(grossCents) || grossCents < 0) {
    throw new RangeError('computePlatformFee: grossCents must be a non-negative integer');
  }
  if (!isTransactionType(transactionType)) {
    throw new RangeError(`computePlatformFee: unknown transactionType "${transactionType}"`);
  }

  const entry = policy.rateCard[transactionType] || {};
  const hasRate = typeof entry.rateBp === 'number';
  const hasFlat = typeof entry.flatFeeCents === 'number';
  if (hasRate && hasFlat) {
    throw new RangeError(
        `computePlatformFee: rate card entry for "${transactionType}" cannot set both rateBp and flatFeeCents`,
    );
  }

  // No entry, no fee.  Still legal — the caller will write a ledger row with
  // platformFeeCents=0, which is intentional (audit completeness on free flows).
  if (!hasRate && !hasFlat) {
    return {
      platformFeeCents: 0,
      netCents: grossCents,
      rateBp: 0,
      policyVersion: policy.version,
      flatFee: false,
    };
  }

  // Flat-fee path — used by recruiter_lead_export.
  if (hasFlat) {
    const flat = Math.max(0, Math.trunc(entry.flatFeeCents));
    const capped = applyMaxCap(flat, policy.maxFeeCentsPerTxn);
    return {
      platformFeeCents: capped,
      netCents: grossCents - capped,
      rateBp: 0,
      policyVersion: policy.version,
      flatFee: true,
    };
  }

  // Percentage path.  Compute with BigInt to avoid precision loss on
  // 8-figure gross amounts and negative-rate rebate flows.
  const baseBp = Math.trunc(entry.rateBp);
  const effectiveBp = applyVolumeModifier(baseBp, policy.volumeBreakpoints, ytdGrossCents);
  const grossBig = BigInt(grossCents);
  const bpBig = BigInt(effectiveBp);
  // Half-up rounding on integer division: (grossBig * bpBig + sign * BP/2) / BP
  const product = grossBig * bpBig;
  const half = BigInt(BP_DIVISOR / 2);
  const adjusted = product >= 0n ? product + half : product - half;
  let feeCents = Number(adjusted / BigInt(BP_DIVISOR));

  // Apply minimum-fee floor only on positive percentage flows.  We never want
  // to floor a negative rate (rebate) — it would silently shrink the credit.
  if (feeCents > 0 && typeof entry.minimumFeeCents === 'number') {
    feeCents = Math.max(feeCents, Math.trunc(entry.minimumFeeCents));
  }

  const capped = applyMaxCap(feeCents, policy.maxFeeCentsPerTxn);
  return {
    platformFeeCents: capped,
    netCents: grossCents - capped,
    rateBp: effectiveBp,
    policyVersion: policy.version,
    flatFee: false,
  };
}

// ── Internals ────────────────────────────────────────────────────────────────

/**
 * Apply the highest-matching volume-tier rate modifier.
 *
 * `volumeBreakpoints` is sorted ascending by `ytdGrossCentsThreshold` for
 * the purposes of "highest match wins".  An empty array is the default
 * policy shape — no modifier, return the base rate unchanged.
 *
 * @param {number} baseBp
 * @param {Array<{ytdGrossCentsThreshold: number, rateModifier: number}>} breakpoints
 * @param {number} [ytdGrossCents]
 * @returns {number} Integer basis points after modifier.
 */
function applyVolumeModifier(baseBp, breakpoints, ytdGrossCents) {
  if (!Array.isArray(breakpoints) || breakpoints.length === 0) return baseBp;
  const ytd = typeof ytdGrossCents === 'number' && ytdGrossCents >= 0 ? ytdGrossCents : 0;
  // Find highest threshold the tenant has cleared.
  let modifier = 1;
  for (const bp of breakpoints) {
    const threshold = Number(bp.ytdGrossCentsThreshold);
    const m = Number(bp.rateModifier);
    if (Number.isFinite(threshold) && Number.isFinite(m) && ytd >= threshold) {
      modifier = m;
    }
  }
  // Round half-up after applying the modifier; basis points stay integers.
  return Math.trunc(baseBp * modifier + (baseBp >= 0 ? 0.5 : -0.5));
}

/**
 * Apply the optional per-transaction cap.  Cap is always positive; for
 * negative (rebate) fees we cap by absolute value to bound platform exposure
 * on partner-credit flows without flipping the sign.
 *
 * @param {number} feeCents
 * @param {number | null | undefined} maxFeeCentsPerTxn
 * @returns {number}
 */
function applyMaxCap(feeCents, maxFeeCentsPerTxn) {
  if (typeof maxFeeCentsPerTxn !== 'number' || maxFeeCentsPerTxn <= 0) return feeCents;
  const cap = Math.trunc(maxFeeCentsPerTxn);
  if (feeCents > cap) return cap;
  if (feeCents < -cap) return -cap;
  return feeCents;
}

module.exports = {
  loadActivePolicy,
  computePlatformFee,
};
