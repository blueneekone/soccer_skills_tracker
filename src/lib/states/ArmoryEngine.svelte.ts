/**
 * ArmoryEngine.svelte.ts
 * ──────────────────────
 * Gamification logic layer for the Vanguard Armory — with seamless,
 * invisible Firestore cloud synchronisation.
 *
 * Architecture
 * ────────────
 * •  TIER_DEFINITIONS  — exported constant describing every progression tier
 *    (XP floor, theme colour, label). Centralised here so the UI never
 *    hard-codes tier names; it reads from this source of truth.
 *
 * •  ArmoryEngine      — exported Svelte 5 rune-based class.
 *    All mutable data is `$state`; all derivations are `$derived` getters.
 *    This keeps the class "live" — any reactive context (Svelte component,
 *    `$effect`, test runner) that reads a getter automatically subscribes
 *    to the underlying signal.
 *
 * Firestore sync strategy
 * ───────────────────────
 * Path: `users/{userId}` — armory data lives inside the existing user
 * document under the `armory` map field.  All writes use dot-notation
 * (`armory.totalXP`, `armory.stats.PAC`) so they are atomic partial
 * updates that never clobber other user document fields.
 *
 *   users/{userId}: {
 *     ...existing profile fields...
 *     armory: {
 *       totalXP:    number,
 *       stats:      { PAC, ACC, AGI, STM, POW, VAN },
 *       xpHistory:  XpHistoryEntry[]
 *     }
 *   }
 *
 * Optimistic UI contract
 * ──────────────────────
 * Every mutation method (`awardXP`, `updateStat`) writes to `$state`
 * synchronously FIRST so the VanguardCard visually levels up with zero
 * latency, THEN fires a background Firestore write.  If the write fails,
 * the error is logged to the console and the UI is left in its optimistic
 * state — Firestore's offline cache will replay the write when the network
 * returns (because `firebase.js` enables `persistentLocalCache`).
 *
 * Note on xpHistory size
 * ──────────────────────
 * Each `awardXP` call appends one entry via Firestore `arrayUnion`.
 * Firestore has a 1 MB document limit — for high-volume workload consider
 * migrating xpHistory to a `users/{uid}/xpHistory` sub-collection.  At
 * the current rate (≤ 10 drills/day × 365 days × ~200 B/entry ≈ 730 KB)
 * a single document is safe for at least one season.
 *
 * Math contract for progressToNextTier
 * ─────────────────────────────────────
 *   Given:  currentFloor  = current tier's XP floor
 *           nextFloor     = next tier's XP floor   (or +∞ if VANGUARD)
 *           totalXP       = player's total accumulated XP
 *
 *   result  = clamp((totalXP − currentFloor) / (nextFloor − currentFloor), 0, 1) × 100
 *
 * VANGUARD is the terminal tier so progressToNextTier returns 100 and
 * xpRequired returns 0 — there is no higher tier to reach.
 *
 * Usage
 * ─────
 *   // Instantiate once per player session (e.g. in a Svelte component script)
 *   const engine = new ArmoryEngine({ userId: auth.currentUser.uid });
 *
 *   // Hydrate from Firestore (call once after auth resolves)
 *   await engine.loadPlayerData(auth.currentUser.uid);
 *
 *   // Award XP — $state updates instantly; Firestore syncs in background
 *   engine.awardXP(250, 'Sprint session — 6 reps above threshold');
 *
 *   // Read reactive values in a Svelte template
 *   engine.currentTier.label   // → 'ELITE'
 *   engine.progressToNextTier  // → 28 (percent)
 *   engine.xpRequired          // → 3350 XP to VANGUARD
 */

import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import { arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';

// ── Tier definitions ─────────────────────────────────────────────────────────

/** A single progression tier. */
export type ArmoryTier = {
	/** Canonical identifier — also used as the display label. */
	id: 'ROOKIE' | 'PRO' | 'ELITE' | 'VANGUARD';
	/** Inclusive lower bound (XP ≥ floor to be in this tier). */
	floor: number;
	/**
	 * Exclusive upper bound. VANGUARD uses `Infinity` — it has no ceiling.
	 * This makes the progressToNextTier formula generic: the engine never
	 * needs to special-case the terminal tier outside one `=== Infinity` guard.
	 */
	ceiling: number;
	/** Primary neon accent colour for VanguardCard edge glow + stat colours. */
	accent: string;
	/** Muted secondary colour used for disabled/inactive UI elements. */
	muted: string;
	/** Human-readable flavour text shown in the card tier banner. */
	label: string;
};

/**
 * All progression tiers in ascending XP order.
 *
 * Keeping them in an ordered array (not a map) lets `findLast` scan from
 * the top → O(n) but n = 4, so irrelevant; it also makes iteration order
 * predictable for progress bars and "next tier" previews.
 */
export const TIER_DEFINITIONS: readonly ArmoryTier[] = [
	{
		id: 'ROOKIE',
		floor: 0,
		ceiling: 1_000,
		accent: '#9ca3af', // cool gray — matte, unpolished
		muted: '#4b5563',
		label: 'ROOKIE',
	},
	{
		id: 'PRO',
		floor: 1_000,
		ceiling: 5_000,
		accent: '#a78bfa', // violet — elevated, technical
		muted: '#6d28d9',
		label: 'PRO',
	},
	{
		id: 'ELITE',
		floor: 5_000,
		ceiling: 10_000,
		accent: '#fb923c', // amber-orange — hot, competitive
		muted: '#c2410c',
		label: 'ELITE',
	},
	{
		id: 'VANGUARD',
		floor: 10_000,
		ceiling: Infinity, // terminal tier — no upper bound
		accent: '#00f0ff', // Stark cyan — the signature Vanguard look
		muted: '#0e7490',
		label: 'VANGUARD',
	},
] as const;

// ── Types ────────────────────────────────────────────────────────────────────

/** A single entry in the XP audit log. */
export type XpHistoryEntry = {
	/** ISO-8601 timestamp of when the XP was awarded. */
	date: string;
	/** Raw XP points added in this event. */
	amount: number;
	/** Human-readable reason (e.g. "Sprint session", "Match completed"). */
	reason: string;
	/** Running total after this event (for quick sparkline rendering). */
	runningTotal: number;
};

/**
 * The "Scout's Six" — the six key athletic metrics displayed on the card.
 *
 * All values are strings because units vary wildly (mph, seconds, levels,
 * inches) and the UI renders them verbatim. Callers are responsible for
 * formatting (e.g. `toFixed(2) + "s"`).
 */
export type ScoutsSix = {
	/** Top speed (e.g. "21.4 MPH") */
	PAC: string;
	/** Acceleration — time from 0 to first stride (e.g. "1.52s") */
	ACC: string;
	/** Agility — cone drill or 5-10-5 time (e.g. "4.12s") */
	AGI: string;
	/** Stamina level from RPG XP system (e.g. "Lvl 18") */
	STM: string;
	/** Explosive power — standing broad jump (e.g. "32 in") */
	POW: string;
	/** Vanguard composite rating — single scalar derived from all metrics */
	VAN: string;
};

/** Constructor options — all fields optional for ergonomic instantiation. */
export type ArmoryEngineInit = {
	/** Firebase Auth UID. When provided, `loadPlayerData` can be called immediately. */
	userId?: string;
	totalXP?: number;
	playerStats?: Partial<ScoutsSix>;
	xpHistory?: XpHistoryEntry[];
};

/** Shape of the `armory` map stored inside `users/{userId}` in Firestore. */
type FirestoreArmoryDoc = {
	totalXP?: number;
	stats?: Partial<ScoutsSix>;
	xpHistory?: XpHistoryEntry[];
};

// ── Engine class ─────────────────────────────────────────────────────────────

export class ArmoryEngine {
	// ── Mutable state ────────────────────────────────────────────────────

	/**
	 * Firebase Auth UID this engine is bound to.
	 * `null` = offline / demo mode — all Firestore calls are skipped.
	 */
	userId = $state<string | null>(null);

	/**
	 * Accumulated XP points. All award / deduction operations flow through
	 * `awardXP` so the audit log (`xpHistory`) always stays in sync.
	 *
	 * Direct mutation is intentionally NOT blocked — callers that hydrate
	 * from Firestore can write `engine.totalXP = snapshot.xp` without going
	 * through the history log (which would pollute the log with "load" events).
	 */
	totalXP = $state(0);

	/**
	 * The Scout's Six athletic metrics. Initialised with safe placeholder
	 * strings so VanguardCard always has something to render even before a
	 * Firestore hydration completes.
	 */
	playerStats = $state<ScoutsSix>({
		PAC: '—',
		ACC: '—',
		AGI: '—',
		STM: '—',
		POW: '—',
		VAN: '—',
	});

	/**
	 * Immutable audit log of every `awardXP` call. Stored as an array of
	 * plain objects — no deep reactivity needed since we only push, never
	 * mutate in place. Svelte 5 tracks the array reference; pushing via
	 * `this.xpHistory = [...this.xpHistory, entry]` (copy-on-write) fires
	 * the signal correctly.
	 */
	xpHistory = $state<XpHistoryEntry[]>([]);

	// ── Reactive derivations ─────────────────────────────────────────────

	/**
	 * The tier whose `floor ≤ totalXP < ceiling`.
	 *
	 * Scans the array from the END so the first match is the highest
	 * qualifying tier — this avoids an explicit "highest wins" sort step.
	 * Falls back to ROOKIE if somehow totalXP is negative.
	 */
	get currentTier(): ArmoryTier {
		return (
			[...TIER_DEFINITIONS].reverse().find((t) => this.totalXP >= t.floor) ??
			TIER_DEFINITIONS[0]
		);
	}

	/**
	 * The next tier above the current one, or `null` if already VANGUARD.
	 *
	 * Exposed as its own getter so template code can conditionally render
	 * "next tier" UI without recomputing tier logic.
	 */
	get nextTier(): ArmoryTier | null {
		const idx = TIER_DEFINITIONS.findIndex((t) => t.id === this.currentTier.id);
		return idx < TIER_DEFINITIONS.length - 1 ? TIER_DEFINITIONS[idx + 1] : null;
	}

	/**
	 * Completion percentage (0 – 100) between the current tier floor and the
	 * next tier floor.
	 *
	 * Formula:
	 *   earned = totalXP − currentFloor
	 *   span   = nextFloor − currentFloor
	 *   pct    = clamp(earned / span, 0, 1) × 100
	 *
	 * VANGUARD (terminal tier): returns 100 because there is no higher tier.
	 */
	get progressToNextTier(): number {
		const next = this.nextTier;
		if (!next) return 100;

		const earned = this.totalXP - this.currentTier.floor;
		const span = next.floor - this.currentTier.floor;

		// Guard against a malformed tier definition producing a zero span.
		if (span <= 0) return 100;

		return Math.min(100, Math.max(0, (earned / span) * 100));
	}

	/**
	 * Raw XP still needed to reach the next tier's floor.
	 *
	 * Returns 0 for VANGUARD (nothing left to earn structurally).
	 * Useful for "X more XP to {nextTier}" copy in the card footer.
	 */
	get xpRequired(): number {
		const next = this.nextTier;
		if (!next) return 0;
		return Math.max(0, next.floor - this.totalXP);
	}

	/**
	 * The current tier's XP floor — convenience shorthand for XP bar maths
	 * in the template (`engine.currentTierFloor` reads cleaner than
	 * `engine.currentTier.floor`).
	 */
	get currentTierFloor(): number {
		return this.currentTier.floor;
	}

	/**
	 * The next tier's XP floor, or `currentTierFloor + 1` for VANGUARD so
	 * the XP bar can always render without a null check.
	 */
	get nextTierFloor(): number {
		return this.nextTier?.floor ?? this.currentTier.floor + 1;
	}

	// ── Constructor ──────────────────────────────────────────────────────

	constructor(init: ArmoryEngineInit = {}) {
		if (init.userId !== undefined) this.userId = init.userId;
		if (init.totalXP !== undefined) this.totalXP = init.totalXP;
		if (init.playerStats) {
			this.playerStats = { ...this.playerStats, ...init.playerStats };
		}
		if (init.xpHistory) this.xpHistory = [...init.xpHistory];
	}

	// ── Cloud hydration ───────────────────────────────────────────────────

	/**
	 * Fetch this player's armory snapshot from Firestore and hydrate the
	 * local `$state` variables.
	 *
	 * Call this once after Firebase Auth resolves.  The `$state` fields stay
	 * at their placeholder values until this resolves, so VanguardCard
	 * renders immediately with dashes ("—") rather than blocking on a spinner.
	 *
	 * If the document doesn't yet contain an `armory` field (first-time user),
	 * the local state is left unchanged — any subsequent `awardXP` / `updateStat`
	 * call will create the field via `setDoc( ..., { merge: true } )`.
	 *
	 * @param userId Firebase Auth UID.
	 */
	async loadPlayerData(userId: string): Promise<void> {
		if (!browser) return; // SSR-safe guard

		this.userId = userId;

		try {
			const ref = doc(db, 'users', userId);
			const snap = await getDoc(ref);

			if (!snap.exists()) return; // brand-new user — nothing to hydrate

			const armory = (snap.data()?.armory ?? {}) as FirestoreArmoryDoc;

			if (typeof armory.totalXP === 'number') {
				this.totalXP = armory.totalXP;
			}
			if (armory.stats && typeof armory.stats === 'object') {
				this.playerStats = { ...this.playerStats, ...armory.stats };
			}
			if (Array.isArray(armory.xpHistory)) {
				this.xpHistory = armory.xpHistory as XpHistoryEntry[];
			}
		} catch (err) {
			console.warn('[ArmoryEngine] loadPlayerData failed — offline or permission denied:', err);
		}
	}

	// ── Core methods (optimistic + cloud sync) ────────────────────────────

	/**
	 * Award (or deduct, if `amount` is negative) XP and append a timestamped
	 * entry to `xpHistory`.
	 *
	 * Optimistic UI: `$state` is mutated synchronously so the VanguardCard
	 * reacts instantly.  The Firestore write is fired in the background via
	 * `_syncXP()` — failure is logged silently; the offline cache will
	 * replay the write when connectivity is restored.
	 *
	 * @param amount   XP delta. Positive = award, negative = deduction.
	 * @param reason   Human-readable explanation for the audit log.
	 */
	awardXP(amount: number, reason: string): void {
		// Kill switch: feature_xp_gamification_enabled (Remote Config)
		// Platform Admin can disable XP math from Firebase Console without a redeploy.
		if (!vanguardFlags.xpEnabled) return;

		// 1. Optimistic update — instant visual feedback
		this.totalXP = Math.max(0, this.totalXP + amount);
		const entry: XpHistoryEntry = {
			date: new Date().toISOString(),
			amount,
			reason,
			runningTotal: this.totalXP,
		};
		this.xpHistory = [...this.xpHistory, entry];

		// 2. Background cloud sync — fire and forget
		this._syncXP(entry);
	}

	/**
	 * Update a single Scout's Six metric.
	 *
	 * Accepts `string | number` — if a number is passed it is coerced to
	 * a string via `String()` so `playerStats` always stores strings,
	 * keeping the VanguardCard template simple (no conditional formatting).
	 *
	 * Fires a shallow copy of `playerStats` so Svelte 5's fine-grained
	 * reactivity marks the relevant derived values as stale.
	 *
	 * @param statName  Key in `ScoutsSix` (e.g. 'PAC', 'VAN').
	 * @param newValue  New display value (e.g. '22.1 MPH' or 95).
	 */
	updateStat(statName: keyof ScoutsSix, newValue: string | number): void {
		// 1. Optimistic update
		const strValue = String(newValue);
		this.playerStats = {
			...this.playerStats,
			[statName]: strValue,
		};

		// 2. Background cloud sync
		this._syncStat(statName, strValue);
	}

	/**
	 * Bulk-replace all Scout's Six metrics at once — convenience method for
	 * Firestore hydration where all stats arrive in a single snapshot.
	 *
	 * Missing keys in `partial` are preserved from the current state.
	 * Does NOT trigger a Firestore write — use for read-path hydration only.
	 */
	hydrateStats(partial: Partial<ScoutsSix>): void {
		this.playerStats = { ...this.playerStats, ...partial };
	}

	/**
	 * Hard-reset the engine to a clean slate — intended for testing and
	 * dev-mode hot reload, not production use.
	 */
	reset(): void {
		this.totalXP = 0;
		this.playerStats = { PAC: '—', ACC: '—', AGI: '—', STM: '—', POW: '—', VAN: '—' };
		this.xpHistory = [];
	}

	// ── Private Firestore sync helpers ────────────────────────────────────

	/**
	 * Persist the latest XP total and append the history entry to Firestore.
	 *
	 * Uses `arrayUnion` so concurrent device writes each append their own
	 * entry without overwriting each other (last-write-wins on `totalXP` is
	 * acceptable — the delta is always positive for real drills).
	 *
	 * `setDoc(..., { merge: true })` is used so the `armory` field is created
	 * if absent (first-ever drill for this user) while leaving all other user
	 * document fields untouched.
	 */
	_syncXP(entry: XpHistoryEntry): void {
		if (!browser || !this.userId) return;

		const ref = doc(db, 'users', this.userId);
		setDoc(
			ref,
			{
				armory: {
					totalXP: this.totalXP,
					xpHistory: arrayUnion(entry),
				},
			},
			{ merge: true },
		).catch((err: unknown) => {
			console.warn('[ArmoryEngine] XP sync failed — will retry via offline cache:', err);
		});
	}

	/**
	 * Persist a single Scout's Six metric to Firestore using dot-notation so
	 * only the targeted stat field is touched.
	 *
	 * `updateDoc` is used (not `setDoc`) because by the time a stat is updated
	 * the user document is guaranteed to exist (auth + load have already run).
	 * Falls back to a `setDoc` merge if the doc somehow doesn't exist yet.
	 */
	_syncStat(statName: keyof ScoutsSix, value: string): void {
		if (!browser || !this.userId) return;

		const ref = doc(db, 'users', this.userId);

		// Dot-notation key targets only this stat inside the armory.stats map.
		const patch = { [`armory.stats.${statName}`]: value };

		updateDoc(ref, patch).catch((err: unknown) => {
			// Document may not yet exist for brand-new users — fall back to merge.
			const code = (err as { code?: string })?.code;
			if (code === 'not-found') {
				setDoc(ref, { armory: { stats: { [statName]: value } } }, { merge: true }).catch(
					(fallbackErr: unknown) => {
						console.warn('[ArmoryEngine] Stat sync fallback failed:', fallbackErr);
					},
				);
			} else {
				console.warn('[ArmoryEngine] Stat sync failed — will retry via offline cache:', err);
			}
		});
	}
}
