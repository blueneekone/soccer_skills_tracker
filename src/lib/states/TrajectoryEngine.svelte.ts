/**
 * TrajectoryEngine.svelte.ts
 * ───────────────────────────
 * Phase 3, Epic 6 — Vertical Comparison & Trajectory Tracking
 *
 * Vanguard Trinity — Brain Layer
 *
 * This class manages all reactive state for Time-Lapse Memory Capsules and
 * the Growth Velocity Index (GVI).  It mirrors the architectural shape of
 * `ArmoryEngine.svelte.ts`:
 *
 *   • All mutable data is `$state` — reactive by construction.
 *   • All derivations are `$derived` getters — auto-subscribed.
 *   • Two Firestore `onSnapshot` listeners drive live updates.
 *   • The `destroy()` method unsubscribes both listeners.
 *
 * Firestore data sources
 * ──────────────────────
 *   1. `users/{email}` — `.trajectory` map field for GVI + month counters.
 *      Subscribed via a real-time listener so the HUD updates as the hourly
 *      aggregator writes fresh values.
 *
 *   2. `users/{email}/memory_capsules` — ordered by `surfacedAt` desc, limit 12.
 *      The first unacknowledged capsule drives the MemoryCapsuleArena overlay.
 *
 * Kill switches
 * ─────────────
 *   `vanguardFlags.capsulesEnabled`  — gates capsule subscription
 *   `vanguardFlags.gviEnabled`       — gates GVI field display in the HUD
 *
 * Lazy migration
 * ──────────────
 *   If `users/{email}.trajectory` is missing (pre-Epic-6 account), the engine
 *   stays in idle state.  No destructive defaults are written from the client.
 *   The hourly aggregator will populate the field on the next run.
 *
 * Usage
 * ─────
 *   const traj = new TrajectoryEngine();
 *   traj.connect((authStore.user?.email ?? '').toLowerCase());
 *   // In template: {#if traj.hasUnseenCapsule} <MemoryCapsuleArena ... /> {/if}
 *   // Cleanup:     onDestroy(() => traj.destroy());
 */

import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import {
	collection,
	doc,
	limit,
	onSnapshot,
	orderBy,
	query,
	updateDoc,
	where,
} from 'firebase/firestore';
import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
import type {
	GviTier,
	MemoryCapsuleDoc,
	TrajectoryField,
} from '$lib/types/trajectory.js';
import { PATHS } from '$lib/services/writes.types.js';

// ── GVI tier thresholds (must mirror gviTierFromValue in trajectoryOps.js) ────

function deriveGviTier(gvi: number | null): GviTier {
	if (gvi === null) return 'IGNITING';
	if (gvi >= 0.5) return 'BREAKOUT';
	if (gvi >= 0.05) return 'CLIMBING';
	return 'PLATEAU';
}

// ── GVI display labels ─────────────────────────────────────────────────────────

const GVI_TIER_LABELS: Record<GviTier, string> = {
	IGNITING: 'IGNITING — COLLECTING BASELINE',
	CLIMBING: 'CLIMBING',
	BREAKOUT: 'BREAKOUT',
	PLATEAU: 'PLATEAU DETECTED',
};

// ── Engine ────────────────────────────────────────────────────────────────────

export class TrajectoryEngine {
	// ── Mutable state ────────────────────────────────────────────────────

	/**
	 * Most recent GVI value from `users/{email}.trajectory.gvi`.
	 * null = no data yet (field missing or insufficient history).
	 */
	gvi = $state<number | null>(null);

	/** Number of distinct calendar months the player has been active. */
	monthsActive = $state(0);

	/** XP earned in the current calendar month. */
	currentMonthXp = $state(0);

	/** XP earned in the previous calendar month. */
	lastMonthXp = $state(0);

	/** ISO-8601 date when GVI was last computed by the aggregator CF. */
	lastComputedAt = $state<string>('');

	/**
	 * Up to 12 memory capsules, ordered by `surfacedAt` desc.
	 * Empty array = no capsules yet (normal for new players).
	 */
	capsules = $state<MemoryCapsuleDoc[]>([]);

	/** True while the initial Firestore data is loading. */
	loading = $state(true);

	/** Error message from a failed Firestore operation (empty = no error). */
	error = $state('');

	/** True while an `acknowledgeCapsule` write is in flight. */
	ackPending = $state(false);

	// ── Private internals ────────────────────────────────────────────────

	#userKey = $state<string>('');
	#unsubTrajectory: (() => void) | null = null;
	#unsubCapsules: (() => void) | null = null;

	// ── Reactive derivations ─────────────────────────────────────────────

	/**
	 * GVI tier bucket derived from the current `gvi` value.
	 * 'IGNITING' when gvi is null or the player has < 14 days of data.
	 */
	get gviTier(): GviTier {
		if (!vanguardFlags.gviEnabled) return 'IGNITING';
		return deriveGviTier(this.gvi);
	}

	/** Human-readable label for the current GVI tier. */
	get gviLabel(): string {
		return GVI_TIER_LABELS[this.gviTier];
	}

	/**
	 * Formatted GVI percentage string for display (e.g. "+47%").
	 * Returns '—' when gvi is null or the feature is disabled.
	 */
	get gviFormatted(): string {
		if (!vanguardFlags.gviEnabled || this.gvi === null) return '—';
		const pct = Math.round(this.gvi * 100);
		return pct >= 0 ? `+${pct}%` : `${pct}%`;
	}

	/**
	 * True when there is at least one unacknowledged capsule.
	 * Drives the conditional rendering of the MemoryCapsuleArena overlay.
	 */
	get hasUnseenCapsule(): boolean {
		if (!vanguardFlags.capsulesEnabled) return false;
		return this.capsules.some((c) => !c.acknowledged);
	}

	/**
	 * The most recent unacknowledged capsule, or null if none.
	 * The primary capsule rendered by MemoryCapsuleArena.
	 */
	get activeCapsule(): MemoryCapsuleDoc | null {
		if (!vanguardFlags.capsulesEnabled) return null;
		return this.capsules.find((c) => !c.acknowledged) ?? null;
	}

	/**
	 * Number of days ago the active capsule baseline was captured.
	 * Returns 0 when there is no active capsule.
	 */
	get baselineDaysAgo(): number {
		const cap = this.activeCapsule;
		if (!cap?.baselineDate) return 0;
		const diff = (Date.now() - Date.parse(cap.baselineDate)) / 86_400_000;
		return Math.max(0, Math.round(diff));
	}

	/**
	 * User-facing headline for the capsule overlay.
	 * e.g. "47 DAYS AGO YOU WERE AT LVL 8 — YOU'VE GROWN"
	 */
	get capsuleHeadline(): string {
		const cap = this.activeCapsule;
		if (!cap) return '';
		const days = this.baselineDaysAgo;
		const lvl = cap.baselineSnapshot?.level ?? 0;
		return `${days} DAYS AGO YOU WERE LVL ${lvl}`;
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Subscribe to Firestore data for the given player email key.
	 * Safe to call multiple times — cleans up previous listeners first.
	 *
	 * @param userKey  Lowercase email (Firestore document ID for `users`).
	 */
	connect(userKey: string): void {
		if (!browser || !userKey) return;

		this.#userKey = userKey;
		this.#unsubAll();
		this.loading = true;
		this.error = '';

		this.#subscribeTrajectory(userKey);
		this.#subscribeCapsules(userKey);
	}

	/**
	 * Dismiss (acknowledge) a capsule so it no longer blocks the overlay.
	 * Optimistic local update; Firestore write runs in the background.
	 *
	 * @param capsuleId  Firestore document ID (e.g. `cap_2026-W20`).
	 */
	async acknowledgeCapsule(capsuleId: string): Promise<void> {
		if (!browser || !this.#userKey || this.ackPending) return;

		// Optimistic update — hide the capsule instantly.
		this.capsules = this.capsules.map((c) =>
			c.capsuleId === capsuleId ? { ...c, acknowledged: true } : c,
		);

		this.ackPending = true;
		try {
			const ref = doc(db, PATHS.memoryCapsules(this.#userKey), capsuleId);
			await updateDoc(ref, { acknowledged: true });
		} catch (err) {
			// Roll back optimistic update on failure.
			this.capsules = this.capsules.map((c) =>
				c.capsuleId === capsuleId ? { ...c, acknowledged: false } : c,
			);
			console.warn('[TrajectoryEngine] acknowledgeCapsule failed:', err);
		} finally {
			this.ackPending = false;
		}
	}

	/** Unsubscribe all Firestore listeners and reset to initial state. */
	destroy(): void {
		this.#unsubAll();
		this.gvi = null;
		this.monthsActive = 0;
		this.currentMonthXp = 0;
		this.lastMonthXp = 0;
		this.lastComputedAt = '';
		this.capsules = [];
		this.loading = false;
		this.error = '';
		this.#userKey = '';
	}

	// ── Private subscription helpers ──────────────────────────────────────

	#subscribeTrajectory(userKey: string): void {
		const userRef = doc(db, 'users', userKey);

		this.#unsubTrajectory = onSnapshot(
			userRef,
			(snap) => {
				const data = snap.data();
				if (!data?.trajectory) {
					// Pre-Epic-6 account — trajectory field not yet written.
					this.loading = false;
					return;
				}

				const traj = data.trajectory as TrajectoryField;
				this.gvi = typeof traj.gvi === 'number' ? traj.gvi : null;
				this.monthsActive = Math.max(0, Math.floor(Number(traj.monthsActive) || 0));
				this.currentMonthXp = Math.max(0, Math.floor(Number(traj.currentMonthXp) || 0));
				this.lastMonthXp = Math.max(0, Math.floor(Number(traj.lastMonthXp) || 0));
				this.lastComputedAt = typeof traj.lastComputedAt === 'string' ? traj.lastComputedAt : '';
				this.loading = false;
			},
			(err) => {
				this.error = 'Trajectory data unavailable.';
				this.loading = false;
				console.warn('[TrajectoryEngine] trajectory snapshot error:', err);
			},
		);
	}

	#subscribeCapsules(userKey: string): void {
		if (!vanguardFlags.capsulesEnabled) {
			this.loading = false;
			return;
		}

		const capsulesQuery = query(
			collection(db, PATHS.memoryCapsules(userKey)),
			orderBy('surfacedAt', 'desc'),
			limit(12),
		);

		this.#unsubCapsules = onSnapshot(
			capsulesQuery,
			(snap) => {
				this.capsules = snap.docs.map((d) => ({
					capsuleId: d.id,
					...(d.data() as Omit<MemoryCapsuleDoc, 'capsuleId'>),
				}));
			},
			(err) => {
				// Capsule errors are non-fatal — GVI can still render.
				console.warn('[TrajectoryEngine] capsules snapshot error:', err);
			},
		);
	}

	#unsubAll(): void {
		this.#unsubTrajectory?.();
		this.#unsubCapsules?.();
		this.#unsubTrajectory = null;
		this.#unsubCapsules = null;
	}
}
