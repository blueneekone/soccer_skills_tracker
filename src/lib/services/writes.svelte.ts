/**
 * writes.svelte.ts
 * ─────────────────
 * Firestore atomic-batch write facade — Phase 1, Epic 1.
 *
 * SINGLE-WRITE-CHOKE-POINT RULE
 * ──────────────────────────────────────────────────────────────────────
 * No `.svelte` component, no service, no engine — NOTHING outside this
 * file — may import `setDoc`, `updateDoc`, `addDoc`, `writeBatch`, or
 * `increment` directly from `firebase/firestore` for the multi-document
 * sequences exposed here.  Centralising every batch gives us:
 *
 *   1.  ATOMICITY      — drill record + XP credit either both land or
 *                        both retry; the player's profile can never lag
 *                        the audit log.
 *
 *   2.  OFFLINE SAFETY — `increment()` makes numeric counters commutative
 *                        so concurrent offline devices accumulate
 *                        correctly when they reconnect.  No last-writer-
 *                        wins clobber.
 *
 *   3.  IDEMPOTENCY    — every batch carries a client-generated UUID v4
 *                        `batchId` so the audit log can detect a replayed
 *                        batch on the rare partial-ack retry path.
 *
 *   4.  TESTABILITY    — facade functions are pure async I/O; UI flows
 *                        can be unit-tested by mocking this module.
 *
 *   5.  MAINTAINABILITY — collection paths live in `PATHS` (writes.types);
 *                         a rename ripples through one file.
 *
 * Each function resolves a `BatchWriteResult` synchronously (Firestore's
 * offline model returns from `batch.commit()` as soon as the write is
 * enqueued locally; server acknowledgement is observed separately via
 * `offlineSync.svelte.ts → waitForPendingWrites()`).
 */

import { browser } from '$app/environment';
import { getActiveDb } from '$lib/firebase.js';
import {
	collection,
	doc,
	getDocs,
	increment,
	query,
	serverTimestamp,
	Timestamp,
	where,
	writeBatch,
	type WriteBatch,
} from 'firebase/firestore';
import {
	PATHS,
	type BatchWriteResult,
	type DrillCompletionPayload,
	type GritAwardPayload,
	type MatchCompletionPayload,
	type WorkoutCompletionPayload,
} from './writes.types';
import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';

/**
 * Phase 1, Epic 1 — Cell-Based Routing, Session F.
 *
 * Every facade entry point opens its `writeBatch` against the
 * CURRENT user's cell, not the module-load-time default.  This
 * matters because:
 *
 *   1.  An ultra-large NGB tenant may be promoted to a dedicated cell
 *       (`cell-use1-001`) after the page has loaded.  The next
 *       `commitDrillCompletion()` must land on the new cell — not the
 *       stale (default) — without requiring a page reload.
 *
 *   2.  `getActiveDb()` is HMR-safe and per-cell cached, so the cost of
 *       calling it once per batch is essentially free (a Map lookup).
 *
 *   3.  All documents in a single batch MUST live on the same cell —
 *       Firestore writeBatch cannot span databases.  Capture the cell
 *       once per batch with a local variable and never mix.
 */

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Generate a client-side UUID v4 for idempotency.  Falls back to a
 * timestamp + random suffix when `crypto.randomUUID` is unavailable
 * (older Safari, SSR).
 */
function nextBatchId(prefix: string): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Snapshot of the current online/offline state at the moment the batch
 * was enqueued.  Used to populate `BatchWriteResult.offlineQueued` so
 * the caller can render a "Saved offline — will sync when connected"
 * micro-toast without subscribing to navigator events itself.
 */
function snapshotOnline(): boolean {
	if (!browser) return true; // SSR: pretend online; writes are skipped anyway
	if (typeof navigator === 'undefined') return true;
	return navigator.onLine !== false;
}

/**
 * Common commit wrapper — runs `batch.commit()`, swallows the offline
 * "no network" error path (the SDK queues the write transparently), and
 * builds the uniform return shape.
 *
 * A REJECTED commit here means a real error: security-rule denial, a
 * malformed payload, etc.  The caller surfaces it to the user.
 */
async function runBatch(batch: WriteBatch, batchId: string): Promise<BatchWriteResult> {
	const online = snapshotOnline();
	await batch.commit();
	return { committed: true, batchId, offlineQueued: !online };
}

// ── commitDrillCompletion ────────────────────────────────────────────────────

/**
 * Atomically record a drill completion AND credit the player's XP.
 *
 * Batch contents
 * ──────────────
 *   1.  drill_completions/{auto}              — full audit record
 *   2.  users/{uid}                           — armory.totalXP += xpAwarded
 *                                              armory.totalDrillCount += 1
 *   3.  users/{uid}/xpHistory/{auto}          — paginated XP timeline entry
 *
 * BEFORE this facade existed, `DrillExecution.svelte` wrote only the
 * audit record — the XP was tracked in the drill document but NEVER
 * applied to the user profile, so `totalXP` flat-lined no matter how
 * many drills the player completed.  This batch fixes that bug while
 * guaranteeing offline-safe accumulation via `increment()`.
 */
export async function commitDrillCompletion(
	payload: DrillCompletionPayload,
): Promise<BatchWriteResult> {
	const batchId = nextBatchId('drill');
	// Capture the active cell ONCE per batch — see Session F header.
	const db = getActiveDb();
	const batch = writeBatch(db);

	const drillRef = doc(collection(db, PATHS.drillCompletions));
	const userRef = doc(db, PATHS.users, payload.userKey);
	const historyRef = doc(collection(db, PATHS.userXpHistory(payload.userKey)));

	batch.set(drillRef, {
		batchId,
		playerUid: payload.playerUid,
		userKey: payload.userKey,
		clubId: payload.clubId,
		drillId: payload.drillId,
		drillTitle: payload.drillTitle ?? null,
		attributeId: payload.attributeId,
		xpAwarded: payload.xpAwarded,
		outcome: payload.outcome ?? 'success',
		loggedAt: serverTimestamp(),
	});

	batch.set(
		userRef,
		{
			armory: {
				totalXP: increment(payload.xpAwarded),
				totalDrillCount: increment(1),
			},
		},
		{ merge: true },
	);

	batch.set(historyRef, {
		batchId,
		date: new Date().toISOString(),
		amount: payload.xpAwarded,
		reason: payload.drillTitle ?? payload.drillId,
		source: 'drill_completion',
		drillId: payload.drillId,
		attributeId: payload.attributeId,
		loggedAt: serverTimestamp(),
	});

	return runBatch(batch, batchId);
}

// ── commitGritAward ──────────────────────────────────────────────────────────

/**
 * Octalysis Core Drive 8 — "Loss Avoidance" / Grit XP.
 *
 * Rewards a player for ATTEMPTING a hard drill even when they fail.
 * Hard-coded 50 XP because the value is a UX constant, not a per-drill
 * variable.
 *
 * Epic 7 pre-flights (run BEFORE the batch is built):
 *   1.  Complexity gate — rejects non rank-3 drills when `gritGateEnabled`.
 *       Throws 'GRIT_NOT_ELIGIBLE' (caller silences this; it is expected).
 *   2.  Daily cap — counts today's `grit_awards` for this player; throws
 *       'GRIT_DAILY_CAP' when the count reaches `vanguardFlags.gritDailyCap`.
 *       The Cloud Function backstop (`onGritAwardCreated`) provides a
 *       server-side safety net for stale clients.
 *
 * Batch contents
 * ──────────────
 *   1.  grit_awards/{auto}           — audit record (includes complexityRank)
 *   2.  users/{uid}                  — armory.totalXP += 50
 *   3.  users/{uid}/xpHistory/{auto} — timeline entry tagged 'grit'
 */
export async function commitGritAward(payload: GritAwardPayload): Promise<BatchWriteResult> {
	const GRIT_XP = 50;

	// ── Pre-flight 1: complexity gate ─────────────────────────────────────
	if (vanguardFlags.gritGateEnabled && payload.complexityRank !== 3) {
		throw new Error('GRIT_NOT_ELIGIBLE');
	}

	// ── Pre-flight 2: daily cap ───────────────────────────────────────────
	const db = getActiveDb();
	const todayStartMs = Date.UTC(
		new Date().getUTCFullYear(),
		new Date().getUTCMonth(),
		new Date().getUTCDate(),
	);
	const todayStartTs = Timestamp.fromMillis(todayStartMs);

	const capSnap = await getDocs(
		query(
			collection(db, PATHS.gritAwards),
			where('playerUid', '==', payload.playerUid),
			where('loggedAt', '>=', todayStartTs),
		),
	);
	if (capSnap.size >= vanguardFlags.gritDailyCap) {
		throw new Error('GRIT_DAILY_CAP');
	}

	// ── Batch write ───────────────────────────────────────────────────────
	const batchId = nextBatchId('grit');
	const batch = writeBatch(db);

	const gritRef = doc(collection(db, PATHS.gritAwards));
	const userRef = doc(db, PATHS.users, payload.userKey);
	const historyRef = doc(collection(db, PATHS.userXpHistory(payload.userKey)));

	batch.set(gritRef, {
		batchId,
		playerUid: payload.playerUid,
		userKey: payload.userKey,
		clubId: payload.clubId,
		drillId: payload.drillId,
		complexityRank: payload.complexityRank,
		xpAwarded: GRIT_XP,
		type: 'failed_attempt_grit',
		loggedAt: serverTimestamp(),
	});

	batch.set(
		userRef,
		{
			armory: {
				totalXP: increment(GRIT_XP),
			},
		},
		{ merge: true },
	);

	batch.set(historyRef, {
		batchId,
		date: new Date().toISOString(),
		amount: GRIT_XP,
		reason: 'Grit — failed attempt rewarded',
		source: 'grit_award',
		drillId: payload.drillId,
		complexityRank: payload.complexityRank,
		loggedAt: serverTimestamp(),
	});

	return runBatch(batch, batchId);
}

// ── commitWorkoutCompletion ──────────────────────────────────────────────────

/**
 * Atomically close a coach-assigned mission AND credit the player's XP.
 *
 * Before this facade, the workout page did:
 *   await updateDoc(assigned_missions/{id}, { status: 'completed' });
 *   engine.awardXP(earned, reason);   // separate Firestore write
 *
 * The two writes could diverge on flaky networks: the mission could
 * be marked complete while the XP write silently failed (or vice
 * versa) — the player would see the mission closed but no XP credit.
 * This batch eliminates that split.
 *
 * Batch contents
 * ──────────────
 *   1.  assigned_missions/{missionId} (optional) — status: 'completed'
 *   2.  users/{uid}                              — armory.totalXP += xpAwarded
 *   3.  users/{uid}/xpHistory/{auto}             — timeline entry
 */
export async function commitWorkoutCompletion(
	payload: WorkoutCompletionPayload,
): Promise<BatchWriteResult> {
	const batchId = nextBatchId('workout');
	const db = getActiveDb();
	const batch = writeBatch(db);

	const userRef = doc(db, PATHS.users, payload.userKey);
	const historyRef = doc(collection(db, PATHS.userXpHistory(payload.userKey)));

	if (payload.missionId) {
		const missionRef = doc(db, PATHS.assignedMissions, payload.missionId);
		batch.update(missionRef, {
			status: 'completed',
			completedAt: serverTimestamp(),
			completedBatchId: batchId,
		});
	}

	// Default ON — only skip when a Cloud Function has already credited
	// the XP server-side (e.g. legacy `logTrainingSession` callable).
	const shouldIncrement = payload.incrementXp !== false;
	if (shouldIncrement) {
		batch.set(
			userRef,
			{
				armory: {
					totalXP: increment(payload.xpAwarded),
				},
			},
			{ merge: true },
		);
	}

	batch.set(historyRef, {
		batchId,
		date: new Date().toISOString(),
		amount: payload.xpAwarded,
		reason: payload.reason,
		source: 'workout_completion',
		missionId: payload.missionId ?? null,
		incrementedClientSide: shouldIncrement,
		loggedAt: serverTimestamp(),
	});

	return runBatch(batch, batchId);
}

// ── commitMatchResult ────────────────────────────────────────────────────────

/**
 * Atomically record a match result, mark the fixture complete, update
 * the opponent's denormalized head-to-head stats, and bump the season
 * completed-fixture counter.
 *
 * All counter updates use `increment()` so concurrent coaches recording
 * different matches against the same opponent (e.g. two teams in the
 * same club playing the same rival on the same weekend) accumulate
 * correctly even if both record results offline.
 *
 * Batch contents
 * ──────────────
 *   1.  fixtures/{fixtureId}                  — status: 'Completed'
 *   2.  match_results/{fixtureId}             — full result document
 *   3.  opponents/{opponentId}                — stats counters via increment()
 *   4.  seasons/{seasonId}                    — completedFixtureCount += 1
 *
 * Outcome derivation (W/L/D) is from OUR perspective:
 *   scoreHome > scoreAway → 'W'
 *   scoreHome < scoreAway → 'L'
 *   equal                 → 'D'
 *
 * Opponent stats interpretation (per LeagueSchema.OpponentStats):
 *   `wins` / `losses` are stored from OUR perspective (our wins, our losses).
 *   `goalsFor` are the goals WE scored against them.
 *   `goalsAgainst` are the goals THEY scored against us.
 */
export async function commitMatchResult(
	payload: MatchCompletionPayload,
): Promise<BatchWriteResult> {
	const batchId = nextBatchId('match');
	const db = getActiveDb();
	const batch = writeBatch(db);

	const outcome: 'W' | 'L' | 'D' =
		payload.scoreHome > payload.scoreAway
			? 'W'
			: payload.scoreHome < payload.scoreAway
				? 'L'
				: 'D';

	batch.update(doc(db, PATHS.fixtures, payload.fixtureId), {
		status: 'Completed',
		completedAt: serverTimestamp(),
		completedBatchId: batchId,
	});

	batch.set(
		doc(db, PATHS.matchResults, payload.fixtureId),
		{
			fixtureId: payload.fixtureId,
			tenantId: payload.tenantId,
			scoreHome: payload.scoreHome,
			scoreAway: payload.scoreAway,
			outcome,
			playerStats: payload.playerStats,
			coachNotes: payload.coachNotes ?? '',
			highlights: payload.highlights ?? '',
			recordedBy: payload.recordedBy ?? null,
			recordedAt: serverTimestamp(),
			batchId,
		},
		{ merge: true },
	);

	batch.set(
		doc(db, PATHS.opponents, payload.opponentId),
		{
			stats: {
				totalGames: increment(1),
				wins: increment(outcome === 'W' ? 1 : 0),
				draws: increment(outcome === 'D' ? 1 : 0),
				losses: increment(outcome === 'L' ? 1 : 0),
				goalsFor: increment(payload.scoreHome),
				goalsAgainst: increment(payload.scoreAway),
			},
		},
		{ merge: true },
	);

	batch.set(
		doc(db, PATHS.seasons, payload.seasonId),
		{
			completedFixtureCount: increment(1),
		},
		{ merge: true },
	);

	return runBatch(batch, batchId);
}
