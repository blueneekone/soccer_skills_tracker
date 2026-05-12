/**
 * feeLedger.svelte.ts
 * ────────────────────
 * Reactive store for the Director OS Revenue & Fee console.
 *
 * Phase 2, Epic 2, Session G.
 *
 * Responsibilities:
 *   - Subscribe to `organizations/{tenantId}/fee_summary/ytd` for headline
 *     aggregates (YTD volume + fees + transaction count).
 *   - Subscribe to recent `platform_fee_ledger` rows (where tenantId == clubId,
 *     last 365 days, paginated to first 50) for the breakdown table.
 *   - Subscribe to monthly buckets `fee_summary/YYYY-MM` for the sparkline.
 *   - Derive a "what the legacy SaaS subscription would have cost" estimate
 *     so directors can see Phase 2's value in dollars.
 *
 * All reads are scoped to the tenant's cell — `getActiveDb()` (Phase 1
 * cell-routing contract).  No control-plane reads happen here.
 */

import { browser } from '$app/environment';
import {
	collection,
	doc,
	limit,
	onSnapshot,
	orderBy,
	query,
	Timestamp,
	where,
	type Unsubscribe,
} from 'firebase/firestore';
import { getActiveDb } from '$lib/firebase.js';
import type { PlatformFeeLedgerEntry, TransactionType } from '$lib/types/pricing';

// ── Public types ────────────────────────────────────────────────────────────

export interface FeeBreakdownRow {
	transactionType: TransactionType;
	grossCents: number;
	feesCents: number;
	count: number;
}

export interface MonthlySparklinePoint {
	yearMonth: string; // 'YYYY-MM'
	grossCents: number;
	feesCents: number;
	txnCount: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

const RECENT_LEDGER_LIMIT = 50;
const SPARKLINE_MONTHS = 12;

/**
 * Legacy SaaS pricing used for the "you would have paid" comparison.
 * These mirror the seat-tier defaults in `functions/src/domains/webhooksOps.js`
 * (`seatsLimitForTier`) but are *prices* — the seat-limit list is the source
 * of truth for seat allocation; this list is the source of truth for the
 * "how much you saved" calc only.  Update when the legacy price book changes.
 *
 * Values are USD cents per month per tier "unit" (tier-specific definition).
 */
const LEGACY_MONTHLY_CENTS: Record<string, number> = {
	tutor: 1900, // $19 / mo (small studio)
	team: 4900, // $49 / mo (one squad)
	club: 999, // $9.99 / seat / mo (multiplied by seats_limit)
	recruiter: 4900, // $49 / mo (kept for legacy displays only)
};

// ── Engine ──────────────────────────────────────────────────────────────────

export class FeeLedgerEngine {
	// ── Subscribed state ──────────────────────────────────────────────────
	ytdGrossCents = $state(0);
	ytdFeesCents = $state(0);
	ytdTxnCount = $state(0);
	recentEntries = $state<PlatformFeeLedgerEntry[]>([]);
	monthlySparkline = $state<MonthlySparklinePoint[]>([]);
	loading = $state(true);
	error = $state<string | null>(null);

	// ── Derived ──────────────────────────────────────────────────────────
	readonly effectiveRateBp = $derived(
		this.ytdGrossCents > 0
			? Math.round((this.ytdFeesCents / this.ytdGrossCents) * 10_000)
			: 0,
	);

	readonly breakdownByType = $derived.by<FeeBreakdownRow[]>(() => {
		const buckets = new Map<TransactionType, FeeBreakdownRow>();
		for (const entry of this.recentEntries) {
			const cur = buckets.get(entry.transactionType) ?? {
				transactionType: entry.transactionType,
				grossCents: 0,
				feesCents: 0,
				count: 0,
			};
			cur.grossCents += entry.grossCents;
			cur.feesCents += entry.platformFeeCents;
			cur.count += 1;
			buckets.set(entry.transactionType, cur);
		}
		return Array.from(buckets.values()).sort((a, b) => b.feesCents - a.feesCents);
	});

	readonly hasData = $derived(this.ytdTxnCount > 0 || this.recentEntries.length > 0);

	// ── Private ───────────────────────────────────────────────────────────
	private _unsubYtd: Unsubscribe | null = null;
	private _unsubLedger: Unsubscribe | null = null;
	private _unsubMonthly: Unsubscribe | null = null;
	private _tenantId = '';

	constructor(
		/** Legacy tier from `license_entitlements` — drives the "savings" math. */
		private readonly legacyTier: string | null = null,
		private readonly legacySeatsLimit: number = 0,
	) {}

	connect(tenantId: string): void {
		if (!browser) return;
		if (!tenantId || typeof tenantId !== 'string') {
			this.loading = false;
			this.error = 'No tenant scope.';
			return;
		}
		this.disconnect();
		this._tenantId = tenantId;
		this.loading = true;
		this.error = null;

		const db = getActiveDb();

		// YTD aggregate — headline numbers.
		this._unsubYtd = onSnapshot(
			doc(db, `organizations/${tenantId}/fee_summary/ytd`),
			(snap) => {
				this.loading = false;
				if (!snap.exists()) {
					this.ytdGrossCents = 0;
					this.ytdFeesCents = 0;
					this.ytdTxnCount = 0;
					return;
				}
				const d = snap.data();
				this.ytdGrossCents = numericField(d.grossCents);
				this.ytdFeesCents = numericField(d.feesCents);
				this.ytdTxnCount = numericField(d.txnCount);
			},
			(err) => {
				this.loading = false;
				this.error = err.message;
			},
		);

		// Recent ledger entries — breakdown table.  Server-side cell write
		// stamps `recordedAt`; we query the last 365 days bounded by the
		// LIMIT to keep the snapshot listener cheap on busy tenants.
		const yearAgo = Timestamp.fromMillis(Date.now() - 365 * 24 * 60 * 60 * 1000);
		const recentQuery = query(
			collection(db, 'platform_fee_ledger'),
			where('tenantId', '==', tenantId),
			where('recordedAt', '>=', yearAgo),
			orderBy('recordedAt', 'desc'),
			limit(RECENT_LEDGER_LIMIT),
		);
		this._unsubLedger = onSnapshot(
			recentQuery,
			(snap) => {
				const rows: PlatformFeeLedgerEntry[] = [];
				snap.forEach((docSnap) => {
					const d = docSnap.data();
					rows.push({
						id: docSnap.id,
						tenantId: String(d.tenantId ?? ''),
						transactionType: d.transactionType as TransactionType,
						sourceDocPath: String(d.sourceDocPath ?? ''),
						grossCents: numericField(d.grossCents),
						platformFeeCents: numericField(d.platformFeeCents),
						netCents: numericField(d.netCents),
						rateBp: numericField(d.rateBp),
						policyId: String(d.policyId ?? ''),
						policyVersion: numericField(d.policyVersion),
						stripeChargeId: d.stripeChargeId ?? null,
						paymentIntentId: d.paymentIntentId ?? null,
						recordedAt: d.recordedAt,
					});
				});
				this.recentEntries = rows;
			},
			(err) => {
				// Don't overwrite ytd-listener error — different failure modes.
				if (!this.error) this.error = err.message;
			},
		);

		// Monthly buckets — sparkline.  Last 12 months, sorted ascending so
		// the chart can render left-to-right without flipping the array.
		const monthIds = lastNYearMonthsUtc(SPARKLINE_MONTHS);
		const monthlyQuery = query(
			collection(db, `organizations/${tenantId}/fee_summary`),
			where('__name__', 'in', monthIds.length > 0 ? monthIds : ['_never_']),
		);
		this._unsubMonthly = onSnapshot(
			monthlyQuery,
			(snap) => {
				const byYm = new Map<string, MonthlySparklinePoint>();
				snap.forEach((docSnap) => {
					const d = docSnap.data();
					byYm.set(docSnap.id, {
						yearMonth: docSnap.id,
						grossCents: numericField(d.grossCents),
						feesCents: numericField(d.feesCents),
						txnCount: numericField(d.txnCount),
					});
				});
				// Fill missing months with zeros so the sparkline has 12 points.
				this.monthlySparkline = monthIds.map(
					(ym) =>
						byYm.get(ym) ?? {
							yearMonth: ym,
							grossCents: 0,
							feesCents: 0,
							txnCount: 0,
						},
				);
			},
			(err) => {
				if (!this.error) this.error = err.message;
			},
		);
	}

	disconnect(): void {
		this._unsubYtd?.();
		this._unsubLedger?.();
		this._unsubMonthly?.();
		this._unsubYtd = null;
		this._unsubLedger = null;
		this._unsubMonthly = null;
	}

	/**
	 * Estimate what the tenant would have paid on the legacy subscription model
	 * year-to-date.  Returns USD cents.  Used by the "Savings vs Subscription"
	 * tile — a positive number means transaction-billing was cheaper.
	 *
	 * Uses `legacyTier` + `legacySeatsLimit` snapshotted from
	 * `license_entitlements` so the savings reading stays stable even after
	 * the cutover nulls those fields out (Session F).
	 */
	legacySubscriptionYtdCostCents(): number {
		const monthsElapsed = utcMonthsElapsedYtd(new Date());
		const tier = (this.legacyTier ?? '').toLowerCase();
		const rate = LEGACY_MONTHLY_CENTS[tier];
		if (!rate) return 0;
		if (tier === 'club') {
			const seats = Math.max(0, Math.trunc(this.legacySeatsLimit || 0));
			return rate * seats * monthsElapsed;
		}
		return rate * monthsElapsed;
	}

	/** Positive = transaction model is cheaper.  `null` when no legacy tier. */
	savingsCentsVsLegacy(): number | null {
		const tier = (this.legacyTier ?? '').toLowerCase();
		if (!tier || !LEGACY_MONTHLY_CENTS[tier]) return null;
		return this.legacySubscriptionYtdCostCents() - this.ytdFeesCents;
	}
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function numericField(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

function utcMonthsElapsedYtd(now: Date): number {
	// 1-indexed month, so January at month-start is 1 — we round up to at
	// least 1 so a brand-new January install shows non-zero baseline cost.
	return Math.max(1, now.getUTCMonth() + 1);
}

function lastNYearMonthsUtc(n: number): string[] {
	const out: string[] = [];
	const now = new Date();
	for (let i = n - 1; i >= 0; i--) {
		const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
		const y = d.getUTCFullYear();
		const m = String(d.getUTCMonth() + 1).padStart(2, '0');
		out.push(`${y}-${m}`);
	}
	return out;
}
