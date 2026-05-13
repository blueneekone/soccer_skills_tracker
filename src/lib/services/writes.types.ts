/**
 * writes.types.ts
 * ────────────────
 * Type contracts and path constants for the Firestore atomic-batch write
 * facade (`writes.svelte.ts`).
 *
 * ARCHITECTURE — Phase 1, Epic 1
 * ──────────────────────────────────────────────────────────────────────
 * Every Firestore write that must succeed-or-fail-together — and every
 * counter that must accumulate correctly across concurrent offline
 * devices — flows through `src/lib/services/writes.svelte.ts`.  This
 * module defines:
 *
 *   • PATHS                — single source of truth for collection paths
 *   • BatchWriteResult     — uniform return shape from every facade call
 *   • DrillCompletionPayload, GritAwardPayload, WorkoutCompletionPayload,
 *     MatchCompletionPayload — fully-typed input contracts
 *
 * No Firestore write API is imported here.  Logic lives in the facade.
 *
 * Offline guarantee
 * ─────────────────
 * Firestore's `persistentLocalCache` (enabled in `firebase.js`) buffers
 * every queued `writeBatch` while the device is offline.  When the client
 * regains connectivity the SDK flushes the queue atomically per-batch:
 * either all operations in a single `batch.commit()` land, or none do.
 *
 * `increment()` is the critical operator that makes counters offline-safe:
 * the server applies a DELTA, not an absolute snapshot, so two devices
 * both adding +50 XP while offline correctly produce +100 XP on the
 * server — never the last-writer-wins collapse to +50.
 *
 * Idempotency
 * ───────────
 * Every payload carries a client-generated `batchId` (UUID v4) so the
 * audit log can detect a replayed batch on the rare path where the SDK
 * retries after a partial server-side acknowledgement.
 */

// ── Path constants ───────────────────────────────────────────────────────────

/**
 * Canonical Firestore collection / sub-collection paths used by the
 * write facade.  Importers never type a collection name as a magic
 * string — they reference `PATHS.<collectionName>` so a rename in one
 * place propagates everywhere.
 */
export const PATHS = {
	/** Top-level user document — armory.totalXP, armory.totalDrillCount, etc. */
	users: 'users',
	/** Sub-collection on users/{uid} for paginated XP history. */
	userXpHistory: (uid: string) => `users/${uid}/xpHistory`,
	/** Per-drill completion audit record (one doc per attempt). */
	drillCompletions: 'drill_completions',
	/** Per-grit-award audit record (failed-attempt XP). */
	gritAwards: 'grit_awards',
	/** Coach-assigned daily mission queue per player. */
	assignedMissions: 'assigned_missions',
	/** Fixture documents. */
	fixtures: 'fixtures',
	/** Match result documents — doc ID = fixtureId. */
	matchResults: 'match_results',
	/** Club-scoped opponent directory with denormalized stats. */
	opponents: 'opponents',
	/** Season documents — carry `completedFixtureCount` counter. */
	seasons: 'seasons',
	/** Player stats — streak_days, total_xp, last_training_utc, etc. Doc ID = email key. */
	playerStats: 'player_stats',
	/**
	 * Loss Avoidance re-engagement alerts (Epic 5).
	 * Doc ID convention: `{uid}_{YYYYMMDD}`.
	 * One immutable event record per player per calendar day.
	 */
	reengagementAlerts: 'reengagement_alerts',

	// ── Phase 3, Epic 5.4 — Parent Co-Op & Escrow Bounties ─────────────────

	/**
	 * Parent-funded escrow bounties.
	 * Written by `createBountyEscrow` CF callable only.
	 * Read by parent (household-scoped) and player (email-scoped).
	 */
	bounties: 'bounties',

	/**
	 * Immutable verification record written when bounty criteria are met.
	 * Doc ID = bountyId for O(1) join.
	 */
	bountyCompletions: 'bounty_completions',

	/**
	 * Immutable audit trail for every bounty status transition.
	 * Zero-liability paper trail for all money-adjacent events.
	 */
	bountyAudit: 'bounty_audit',

	/**
	 * Time-bounded XP multiplier boosts sponsored by parents.
	 * Sub-collection path: `users/{playerEmail}/telemetry_boosts/{boostId}`.
	 */
	telemetryBoosts: (playerEmail: string) =>
		`users/${playerEmail}/telemetry_boosts`,

	// ── Phase 3, Epic 6 — Trajectory Tracking ──────────────────────────────

	/**
	 * Time-Lapse Memory Capsules.
	 * Written by `trajectoryPlateauDetector` CF only.
	 * Doc ID convention: `cap_{isoWeekKey}` (prevents spam — one per week).
	 */
	memoryCapsules: (email: string) => `users/${email}/memory_capsules`,

	/**
	 * Monthly XP/GVI buckets.
	 * Written by `trajectoryMonthlyAggregator` CF only.
	 * Doc ID = 'YYYY-MM'.
	 */
	trajectoryMonths: (email: string) => `users/${email}/trajectory_months`,
} as const;

// ── Uniform return shape ─────────────────────────────────────────────────────

/**
 * Every facade function resolves to this shape.  A resolved promise means
 * the SDK has accepted the batch; it does NOT mean the server has
 * acknowledged it yet (Firestore's offline-first model returns from
 * `commit()` as soon as the write is enqueued locally).
 *
 *   • committed       — `true` once `batch.commit()` resolves locally
 *   • batchId         — UUID v4 generated client-side for idempotency
 *   • offlineQueued   — `true` if the device is currently offline so the
 *                       caller can render a "saved offline" micro-toast
 */
export interface BatchWriteResult {
	committed: boolean;
	batchId: string;
	offlineQueued: boolean;
}

// ── Payload contracts ────────────────────────────────────────────────────────

/**
 * Input for `commitDrillCompletion()`.
 *
 * The facade is responsible for stamping `loggedAt: serverTimestamp()`
 * and `batchId`; callers never set those fields.
 *
 * Key-naming convention
 * ─────────────────────
 *   • `playerUid` — Firebase Auth UID. Used as a foreign key in the
 *                   `drill_completions` audit record so the doc can be
 *                   joined back to `request.auth.uid` in security rules.
 *   • `userKey`   — Lowercase email — the document ID convention for the
 *                   `users` collection in this codebase. Used for every
 *                   `doc(db, 'users', userKey)` reference and for the
 *                   `users/{userKey}/xpHistory` sub-collection.
 */
export interface DrillCompletionPayload {
	/** Firebase Auth UID of the player completing the drill. */
	playerUid: string;
	/** Lowercase email — document ID for the `users` collection. */
	userKey: string;
	/** Tenant partition key (clubId on the user profile). */
	clubId: string;
	/** Firestore document ID of the drill. */
	drillId: string;
	/** Human-readable drill title (denormalized for the audit log). */
	drillTitle?: string;
	/** Which attribute on the Scout's Six receives the XP (e.g. 'PAC'). */
	attributeId: string;
	/** XP delta to apply via `increment()` on the user document. */
	xpAwarded: number;
	/** Outcome marker — defaults to 'success' if omitted. */
	outcome?: 'success' | 'partial' | 'failed';
}

/**
 * Input for `commitGritAward()` — XP for a failed attempt on a hard drill
 * (Octalysis Core Drive 8: Loss Avoidance — celebrate the try, not the
 * outcome).  Facade hard-codes the 50 XP award and the 'grit' type.
 */
export interface GritAwardPayload {
	playerUid: string;
	userKey: string;
	clubId: string;
	drillId: string;
}

/**
 * Input for `commitWorkoutCompletion()`.
 *
 * The facade marks the assigned mission `completed`, optionally
 * increments the player's `armory.totalXP`, and writes an entry to
 * the player's xpHistory sub-collection — all in a single atomic batch.
 *
 * `incrementXp` defaults to `true`.  Set it to `false` ONLY when a
 * Cloud Function has already credited the XP server-side (e.g. the
 * legacy `logTrainingSession` callable).  In that case the facade
 * still closes the mission and records the history entry for the
 * Vanguard Card timeline, but skips the client-side increment so the
 * total isn't double-counted.
 */
export interface WorkoutCompletionPayload {
	/** Firebase Auth UID — foreign key for any audit records the batch writes. */
	playerUid: string;
	/** Lowercase email — document ID for the `users` collection. */
	userKey: string;
	/** Optional — only present when the workout closes a coach-assigned mission. */
	missionId?: string;
	/** XP delta — applied via `increment()` unless `incrementXp` is `false`. */
	xpAwarded: number;
	/** Human-readable reason for the XP history entry. */
	reason: string;
	/**
	 * If `false`, do not write the `increment(xpAwarded)` to the user
	 * document — only close the mission and record the timeline entry.
	 * Defaults to `true`.
	 */
	incrementXp?: boolean;
	// ── Subjective physiological fields (Phase 3, Epic 4 — RL pipeline) ──────
	/** Raw post-workout RPE on a 1-10 Borg scale. Null when not reported. */
	subjectiveRpe?: number | null;
	/** Muscle/joint soreness: 1 = none, 5 = severe. Null when not reported. */
	soreness?: number | null;
	/** Mood / energy level: 1 = very low, 5 = excellent. Null when not reported. */
	mood?: number | null;
	/** Hours of sleep the previous night (0-12). Null when not reported. */
	sleepHoursLastNight?: number | null;
}

/**
 * Input for `commitMatchResult()` — extends the existing match-completion
 * batch with opponent stats and season counter increments.
 *
 * `opponentId` is non-optional here even though it's optional on the
 * source Fixture, because skipping the opponent stats update would
 * silently leave the threat assessment stale.
 */
export interface MatchCompletionPayload {
	fixtureId: string;
	opponentId: string;
	seasonId: string;
	tenantId: string;
	scoreHome: number;
	scoreAway: number;
	playerStats: Record<string, unknown>;
	coachNotes?: string;
	highlights?: string;
	recordedBy?: string;
}
