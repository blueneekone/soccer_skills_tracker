/**
 * pricingEngine.svelte.ts
 * ────────────────────────
 * Client-side mirror of `functions/pricingEngine.js`.
 *
 * Phase 2, Epic 2, Session B.
 *
 * Two responsibilities:
 *   1. `computePlatformFee()` — a pure preview/quote function the UI uses
 *      to render the fee BEFORE a PaymentIntent is created.  This MUST
 *      produce bit-identical results to the server-side calculator;
 *      drift would surface as "shown $X.YZ, charged $X.YA" complaints.
 *
 *   2. `pricingPolicyStore` — a reactive singleton that `onSnapshot`s
 *      `pricing_policy/default-v1` from the registry (default) cell.
 *      Used by the marketing pricing card and the Director OS Revenue
 *      console to render live rates without redeploys.
 *
 * The store ALWAYS reads from the (default) cell — pricing is control-plane
 * data and must never live on a tenant-scoped cell.
 */

import { browser } from '$app/environment';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getDb } from '$lib/firebase.js';
import {
	DEFAULT_CELL_ID,
} from '$lib/types/cells';
import {
	BP_DIVISOR,
	DEFAULT_POLICY_ID,
	type PricingPolicyDoc,
	type RateCard,
	type RateCardEntry,
	type TransactionType,
	type VolumeBreakpoint,
} from '$lib/types/pricing';

// ── Pure calculator ──────────────────────────────────────────────────────────

export interface ComputeFeeArgs {
	policy: PricingPolicyDoc;
	transactionType: TransactionType;
	grossCents: number;
	ytdGrossCents?: number;
}

export interface ComputeFeeResult {
	platformFeeCents: number;
	netCents: number;
	rateBp: number;
	policyVersion: number;
	flatFee: boolean;
}

/**
 * Pure fee calculator.  Mirror of `functions/pricingEngine.js#computePlatformFee`.
 * If you change the math here, you MUST change it there in the same commit.
 */
export function computePlatformFee(args: ComputeFeeArgs): ComputeFeeResult {
	const { policy, transactionType, grossCents, ytdGrossCents } = args;
	if (!Number.isFinite(grossCents) || !Number.isInteger(grossCents) || grossCents < 0) {
		throw new RangeError('computePlatformFee: grossCents must be a non-negative integer');
	}

	const entry: RateCardEntry = policy.rateCard[transactionType] ?? {};
	const hasRate = typeof entry.rateBp === 'number';
	const hasFlat = typeof entry.flatFeeCents === 'number';
	if (hasRate && hasFlat) {
		throw new RangeError(
			`computePlatformFee: rate card entry for "${transactionType}" cannot set both rateBp and flatFeeCents`,
		);
	}

	if (!hasRate && !hasFlat) {
		return {
			platformFeeCents: 0,
			netCents: grossCents,
			rateBp: 0,
			policyVersion: policy.version,
			flatFee: false,
		};
	}

	if (hasFlat) {
		const flat = Math.max(0, Math.trunc(entry.flatFeeCents as number));
		const capped = applyMaxCap(flat, policy.maxFeeCentsPerTxn);
		return {
			platformFeeCents: capped,
			netCents: grossCents - capped,
			rateBp: 0,
			policyVersion: policy.version,
			flatFee: true,
		};
	}

	const baseBp = Math.trunc(entry.rateBp as number);
	const effectiveBp = applyVolumeModifier(baseBp, policy.volumeBreakpoints, ytdGrossCents);
	const grossBig = BigInt(grossCents);
	const bpBig = BigInt(effectiveBp);
	const product = grossBig * bpBig;
	const half = BigInt(BP_DIVISOR / 2);
	const adjusted = product >= 0n ? product + half : product - half;
	let feeCents = Number(adjusted / BigInt(BP_DIVISOR));

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

function applyVolumeModifier(
	baseBp: number,
	breakpoints: VolumeBreakpoint[],
	ytdGrossCents?: number,
): number {
	if (!Array.isArray(breakpoints) || breakpoints.length === 0) return baseBp;
	const ytd = typeof ytdGrossCents === 'number' && ytdGrossCents >= 0 ? ytdGrossCents : 0;
	let modifier = 1;
	for (const bp of breakpoints) {
		const t = Number(bp.ytdGrossCentsThreshold);
		const m = Number(bp.rateModifier);
		if (Number.isFinite(t) && Number.isFinite(m) && ytd >= t) modifier = m;
	}
	return Math.trunc(baseBp * modifier + (baseBp >= 0 ? 0.5 : -0.5));
}

function applyMaxCap(feeCents: number, maxFeeCentsPerTxn?: number | null): number {
	if (typeof maxFeeCentsPerTxn !== 'number' || maxFeeCentsPerTxn <= 0) return feeCents;
	const cap = Math.trunc(maxFeeCentsPerTxn);
	if (feeCents > cap) return cap;
	if (feeCents < -cap) return -cap;
	return feeCents;
}

// ── Reactive policy store ────────────────────────────────────────────────────

/**
 * Empty-but-valid policy returned before the live snapshot arrives.  Mirrors
 * the server-side soft-launch fallback in `functions/pricingEngine.js`.
 */
const EMPTY_POLICY: PricingPolicyDoc = {
	id: DEFAULT_POLICY_ID,
	version: 0,
	rateCard: {},
	volumeBreakpoints: [],
	maxFeeCentsPerTxn: null,
};

function createPricingPolicyStore() {
	let policy = $state<PricingPolicyDoc>(EMPTY_POLICY);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let unsub: Unsubscribe | null = null;

	function ensureSubscribed(): void {
		if (!browser || unsub) return;
		const registryDb = getDb(DEFAULT_CELL_ID);
		unsub = onSnapshot(
			doc(registryDb, 'pricing_policy', DEFAULT_POLICY_ID),
			(snap) => {
				loading = false;
				if (!snap.exists()) {
					policy = EMPTY_POLICY;
					return;
				}
				const data = snap.data();
				policy = {
					id: snap.id,
					version: Number(data.version) || 0,
					activeFrom: data.activeFrom,
					rateCard: (data.rateCard && typeof data.rateCard === 'object'
						? data.rateCard
						: {}) as RateCard,
					volumeBreakpoints: Array.isArray(data.volumeBreakpoints)
						? (data.volumeBreakpoints as VolumeBreakpoint[])
						: [],
					maxFeeCentsPerTxn:
						typeof data.maxFeeCentsPerTxn === 'number' ? data.maxFeeCentsPerTxn : null,
					recruiterAnnualCents:
						typeof data.recruiterAnnualCents === 'number'
							? data.recruiterAnnualCents
							: undefined,
				};
			},
			(err) => {
				loading = false;
				error = err.message;
			},
		);
	}

	function detach(): void {
		if (unsub) {
			unsub();
			unsub = null;
		}
	}

	return {
		ensureSubscribed,
		detach,
		get policy() {
			return policy;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		/**
		 * Look up a rate card entry by transaction type.  Returns `null` when
		 * the policy has no entry for that type so callers can render an
		 * explicit "not configured" state instead of silently showing 0%.
		 */
		entry(type: TransactionType): RateCardEntry | null {
			return policy.rateCard[type] ?? null;
		},
	};
}

/** Singleton reactive store.  Call `.ensureSubscribed()` from a layout once. */
export const pricingPolicyStore = createPricingPolicyStore();
