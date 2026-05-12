/**
 * pricing.ts
 * ───────────
 * Transaction-based pricing — canonical types and constants.
 *
 * Phase 2, Epic 2 — "Transition the core platform pricing to a transaction-based
 * model (0$ platform fee, micro-percentage on volume) to eliminate off-season
 * financial friction for clubs."
 *
 * Concepts
 * ─────────
 * • A `PricingPolicyDoc` is the single source of truth for what Vanguard
 *   charges on every flow of money through the platform.  It lives on the
 *   registry / (default) cell so every cell-routed write reads the same rates.
 *
 * • A `RateCardEntry` supports TWO independent fee paths:
 *     - percentage path: `rateBp` (basis points; 10_000 bp = 100.00%).
 *     - flat-fee path:   `flatFeeCents` (absolute cents, ignores grossCents).
 *   Both cannot be set on a single entry — the calculator enforces.
 *   The flat-fee path is used by per-event flows that have no gross
 *   to scale against (e.g. `recruiter_lead_export` is $X / export).
 *
 * • A `PlatformFeeLedgerEntry` is an immutable atom written inside the same
 *   writeBatch as the underlying business event.  Its doc ID is the upstream
 *   idempotency key (PaymentIntent.id / exportId / rebateId) so webhook
 *   retries never double-bill.
 *
 * Math rule
 * ─────────
 * All fee math is integer cents + integer basis points.  Floats are forbidden
 * inside the calculator — round-half-up at the boundary only.  10_000 bp = 100%.
 */

// ── Reserved identifiers ─────────────────────────────────────────────────────

/** Canonical policy doc ID used by all reads when no per-tenant override exists. */
export const DEFAULT_POLICY_ID = 'default-v1' as const;

/** Basis-point denominator: 10_000 bp = 100.00%. */
export const BP_DIVISOR = 10_000 as const;

// ── Transaction taxonomy ─────────────────────────────────────────────────────

/**
 * Every money-moving (or money-recording) flow through Vanguard gets a stable
 * `TransactionType` tag.  This drives:
 *   - which `RateCardEntry` the calculator consults
 *   - how the Director OS Revenue console buckets ledger rows
 *   - which Stripe webhook handler claims responsibility for the event
 *
 * Add a new transaction type ONLY by:
 *   1) extending this union,
 *   2) mirroring it in `functions/pricingConstants.js`,
 *   3) seeding a `RateCardEntry` for it in `bootstrapPricingPolicy`,
 *   4) documenting it in `docs/PLATFORM_FEE_LEDGER.md`.
 */
export type TransactionType =
	| 'season_registration'
	| 'digital_ticketing'
	| 'hotel_rebate'
	| 'merch_sale'
	| 'tournament_entry'
	| 'recruiter_lead_export';

/**
 * Billing model assigned to a tenant.  Mirrored as a JWT custom claim by
 * `syncUserClaims` so security rules can short-circuit the legacy paywall.
 *
 *   • legacy_subscription  — Pre-Phase-2 tenant on a Stripe seat tier.  The
 *                            read-only paywall still applies until the
 *                            subscription is cancelled (Session E sweep).
 *   • transaction_billing  — New model.  $0 platform fee; revenue accrues
 *                            via per-event ledger entries.  No paywall.
 *   • grandfathered_free   — Promo / pilot / NGB partner.  Never charged;
 *                            ledger entries are written with rateBp=0 for
 *                            audit completeness.
 *   • recruiter_hybrid     — Used on `recruiter_accounts/{email}` only.
 *                            Annual Stripe sub + per-export flat fee.
 */
export type BillingModel =
	| 'legacy_subscription'
	| 'transaction_billing'
	| 'grandfathered_free'
	| 'recruiter_hybrid';

// ── Rate card primitives ─────────────────────────────────────────────────────

/**
 * One row in the `RateCard`.  See module header — exactly one of
 * `rateBp` / `flatFeeCents` MUST be set; both being absent is treated as
 * "no fee" (charge zero, but still write the ledger row).
 */
export interface RateCardEntry {
	/** Percentage path.  Basis points: 100 = 1.00%.  Negative values express
	 *  platform-pays-tenant flows (e.g. hotel rebate share). */
	rateBp?: number;
	/** Flat-fee path.  Used when there is no gross to scale against
	 *  (e.g. `recruiter_lead_export`).  Always positive; charged per event. */
	flatFeeCents?: number;
	/** Floor on the per-transaction fee on the percentage path.  Ignored
	 *  when `flatFeeCents` is set. */
	minimumFeeCents?: number;
}

/** Strongly-typed map: every TransactionType MAY have an entry. */
export type RateCard = Partial<Record<TransactionType, RateCardEntry>>;

/**
 * Optional reverse-scaling discount.  When a tenant's YTD gross volume
 * exceeds `ytdGrossCentsThreshold`, the calculator multiplies the resolved
 * percentage rate by `rateModifier` (e.g. 0.85 = 15% discount at scale).
 *
 * The default policy ships with `volumeBreakpoints: []` — breakpoints are an
 * opt-in feature configured per tenant via `pricingPolicyId` overrides.
 */
export interface VolumeBreakpoint {
	ytdGrossCentsThreshold: number;
	rateModifier: number;
}

// ── Policy document ──────────────────────────────────────────────────────────

/**
 * Shape of a `pricing_policy/{policyId}` document.
 *
 * Lives on the registry / (default) cell.  Every Cloud Function that takes a
 * platform fee MUST read its policy via `loadActivePolicy(getRegistryDb())`
 * — never from a tenant-scoped cell.  Custom per-tenant pricing is achieved
 * by writing a SECOND policy doc and pointing `organizations/{tenantId}
 * .pricingPolicyId` at it.
 */
export interface PricingPolicyDoc {
	/** Document ID — also the value stamped on every ledger row's `policyId`. */
	id: string;
	/** Bumped by `updatePricingPolicy` on every change.  Stamped on each ledger
	 *  row so historical reads can reconstruct which rates were in force. */
	version: number;
	/** Server timestamp when this version became live. */
	activeFrom?: unknown;
	rateCard: RateCard;
	volumeBreakpoints: VolumeBreakpoint[];
	/** Absolute ceiling on any single transaction's platform fee.  `null` =
	 *  no cap (fee scales linearly).  Documented but unused at launch. */
	maxFeeCentsPerTxn?: number | null;
	/** Optional flat annual price for recruiter hybrid subs (cents).  Used by
	 *  the marketing pricing card; the Stripe Price ID is still the source of
	 *  truth for billing. */
	recruiterAnnualCents?: number;
}

// ── Ledger document ──────────────────────────────────────────────────────────

/**
 * Shape of a `platform_fee_ledger/{ledgerId}` document.  Immutable; doc ID is
 * the upstream idempotency key so webhook retries are a no-op.
 *
 * `platformFeeCents` is signed: positive = Vanguard takes (registrations,
 * tickets, exports); negative = Vanguard pays out (hotel rebate share).
 * `netCents` is always `grossCents - platformFeeCents`.
 */
export interface PlatformFeeLedgerEntry {
	/** Document ID == idempotency key (PaymentIntent.id / exportId / rebateId). */
	id: string;
	tenantId: string;
	transactionType: TransactionType;
	/** Firestore path of the upstream record (e.g. `season_registrations/abc`). */
	sourceDocPath: string;
	grossCents: number;
	platformFeeCents: number;
	netCents: number;
	rateBp: number;
	policyId: string;
	policyVersion: number;
	stripeChargeId?: string | null;
	paymentIntentId?: string | null;
	recordedAt?: unknown;
}

/**
 * Shape of the `organizations/{tenantId}/fee_summary/ytd` denormalized counter.
 * Updated via `increment()` inside the same writeBatch that writes the ledger
 * row.  Read by the Director OS Revenue console and by the volume-breakpoint
 * lookup in the fee calculator.
 */
export interface FeeSummaryYtd {
	grossCents: number;
	feesCents: number;
	txnCount: number;
	lastUpdatedAt?: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a basis-point rate to a percentage string for display.
 * `bpToPercentLabel(100)` → `"1.00%"`.  Negative values keep their sign so
 * the rebate UI can render "−70.00%" without extra branching.
 */
export function bpToPercentLabel(rateBp: number): string {
	const pct = rateBp / 100;
	return `${pct.toFixed(2)}%`;
}

/**
 * Convert integer cents to a human dollar string with sign.  Used by the
 * Revenue console for headline tiles.  `centsToUsd(12345)` → `"$123.45"`.
 */
export function centsToUsd(cents: number): string {
	const negative = cents < 0;
	const abs = Math.abs(cents);
	const dollars = Math.floor(abs / 100);
	const remainder = (abs % 100).toString().padStart(2, '0');
	return `${negative ? '-' : ''}$${dollars.toLocaleString('en-US')}.${remainder}`;
}
