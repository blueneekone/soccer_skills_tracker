/**
 * league.svelte.ts
 * ─────────────────
 * LeagueManager — Svelte 5 reactive engine for season and fixture management.
 *
 * Trinity role: ENGINE  (logic only — no HTML)
 *
 * Key design decisions
 * ─────────────────────
 * 1. AUTH SELF-WIRING: The manager pulls `tenantId` directly from `authStore`
 *    (JWT custom claims) via `$effect.root()`.  This means the UI never needs
 *    to thread tenantId as a prop — the manager is self-contained.
 *
 * 2. ZERO-TRUST: `tenantId` always comes from the verified JWT claim held in
 *    `authStore`, never from a URL param or client payload.
 *
 * 3. STRICT PARTITIONING: Every Firestore query includes
 *    `.where('tenantId', '==', tenantId)` as the first constraint.
 *
 * Minimal usage in a component:
 *
 *   import { LeagueManager } from '$lib/services/league.svelte';
 *   import { onDestroy } from 'svelte';
 *
 *   const league = new LeagueManager();
 *   // LeagueManager auto-connects when authStore.tenantId becomes available.
 *
 *   onDestroy(() => league.destroy());
 *
 * Optional explicit team scope:
 *
 *   const league = new LeagueManager({ teamId: 'team_abc' });
 */

import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import {
	addDoc,
	collection,
	doc,
	getDocs,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	updateDoc,
	where,
	writeBatch,
	type QueryConstraint,
} from 'firebase/firestore';
import {
	computeThreatAssessment,
	toTimestampMs,
	type LeagueSchema,
} from '$lib/types/league';

// ── Types ──────────────────────────────────────────────────────────────────

type UnsubFn = () => void;

export type CompleteMatchInput = Omit<
	LeagueSchema.MatchResult,
	'id' | 'fixtureId' | 'tenantId' | 'recordedAt' | 'outcome'
>;

export type CreateFixtureInput = Omit<
	LeagueSchema.Fixture,
	'id' | 'tenantId' | 'createdAt' | 'completedAt'
>;

interface LeagueManagerOptions {
	/** Restrict fixture subscriptions to a specific team. */
	teamId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// LeagueManager
// ═══════════════════════════════════════════════════════════════════════════

export class LeagueManager {
	// ── Reactive state ────────────────────────────────────────────────────────

	/** All seasons for this tenant/team scope, newest first. */
	seasons = $state<LeagueSchema.Season[]>([]);

	/** All fixtures for this tenant/team scope, sorted by kick-off ascending. */
	fixtures = $state<LeagueSchema.Fixture[]>([]);

	/** Club-wide scouting directory, sorted A-Z. */
	opponents = $state<LeagueSchema.Opponent[]>([]);

	/** Match results loaded on-demand (keyed by fixtureId). */
	matchResults = $state<Record<string, LeagueSchema.MatchResult>>({});

	loading = $state(true);
	error = $state('');

	// ── Derived views ─────────────────────────────────────────────────────────

	/**
	 * The single active season for the current scope (team or club).
	 * `null` when the club is between seasons.
	 */
	readonly activeSeason = $derived(this.seasons.find((s) => s.isActive) ?? null);

	/** Upcoming fixtures, earliest first. */
	readonly upcomingFixtures = $derived(
		[...this.fixtures]
			.filter((f) => f.status === 'Scheduled')
			.sort((a, b) => toTimestampMs(a.dateTime) - toTimestampMs(b.dateTime)),
	);

	/** Completed fixtures, most recent first. */
	readonly completedFixtures = $derived(
		[...this.fixtures]
			.filter((f) => f.status === 'Completed')
			.sort((a, b) => toTimestampMs(b.dateTime) - toTimestampMs(a.dateTime)),
	);

	/** Fast opponent lookup map (id → opponent). */
	readonly opponentMap = $derived(
		Object.fromEntries(this.opponents.map((o) => [o.id, o])),
	);

	/**
	 * Upcoming fixtures enriched with resolved opponent data.
	 * Components consume this instead of doing their own lookups.
	 */
	readonly enrichedUpcoming = $derived(
		this.upcomingFixtures.map((f) => ({
			...f,
			opponent: this.opponentMap[f.opponentId] ?? null,
			result: this.matchResults[f.id] ?? null,
		})),
	);

	/** Completed fixtures enriched with opponent and score data. */
	readonly enrichedCompleted = $derived(
		this.completedFixtures.map((f) => ({
			...f,
			opponent: this.opponentMap[f.opponentId] ?? null,
			result: this.matchResults[f.id] ?? null,
		})),
	);

	/** Opponents sorted by threat score descending — highest danger first. */
	readonly opponentsWithThreat = $derived(
		this.opponents
			.map((o) => ({ ...o, threat: computeThreatAssessment(o.stats) }))
			.sort((a, b) => b.threat.score - a.threat.score),
	);

	// ── Private ───────────────────────────────────────────────────────────────

	private _tenantId = '';
	private _teamId: string | undefined;
	private _unsubs: UnsubFn[] = [];
	private _effectCleanup: (() => void) | null = null;

	// ── Constructor ───────────────────────────────────────────────────────────

	constructor(options?: LeagueManagerOptions) {
		this._teamId = options?.teamId;

		if (!browser) return;

		// Auto-connect when authStore.tenantId becomes available or changes.
		// $effect.root() creates an isolated effect scope that survives outside
		// the component tree — required for class-level effects.
		this._effectCleanup = $effect.root(() => {
			$effect(() => {
				const tid = authStore.tenantId || authStore.currentTenantId;
				if (tid) {
					this.connect(tid);
				} else {
					this._detach();
					this.loading = false;
				}
				// Re-detach if the effect re-runs due to tenantId changing.
				return () => this._detach();
			});
		});
	}

	// ── connect ───────────────────────────────────────────────────────────────

	/**
	 * Start Firestore subscriptions.  Called automatically from the constructor
	 * via the auth effect.  Can also be called manually for explicit control.
	 *
	 * @param tenantId  MUST come from authStore — never from client input.
	 * @param teamId    Override the team scope set at construction time.
	 */
	connect(tenantId: string, teamId?: string) {
		if (!browser || !tenantId || tenantId === this._tenantId) return;

		this._tenantId = tenantId;
		if (teamId !== undefined) this._teamId = teamId;
		this._detach();

		this.loading = true;
		this.error = '';

		// ── Seasons ───────────────────────────────────────────────────────────
		const seasonConstraints: QueryConstraint[] = [
			where('tenantId', '==', tenantId),
			orderBy('startDate', 'desc'),
		];
		if (this._teamId) seasonConstraints.push(where('teamId', '==', this._teamId));

		this._unsubs.push(
			onSnapshot(
				query(collection(db, 'seasons'), ...seasonConstraints),
				(snap) => {
					this.seasons = snap.docs.map((d) => ({
						id: d.id,
						...d.data(),
					})) as LeagueSchema.Season[];
					this.loading = false;
				},
				(err) => {
					console.warn('[LeagueManager] seasons error:', err);
					this.error = 'Failed to load seasons.';
					this.loading = false;
				},
			),
		);

		// ── Fixtures ──────────────────────────────────────────────────────────
		const fixtureConstraints: QueryConstraint[] = [
			where('tenantId', '==', tenantId),
			orderBy('dateTime', 'asc'),
		];
		if (this._teamId) fixtureConstraints.push(where('teamId', '==', this._teamId));

		this._unsubs.push(
			onSnapshot(
				query(collection(db, 'fixtures'), ...fixtureConstraints),
				(snap) => {
					this.fixtures = snap.docs.map((d) => ({
						id: d.id,
						...d.data(),
					})) as LeagueSchema.Fixture[];
				},
				(err) => console.warn('[LeagueManager] fixtures error:', err),
			),
		);

		// ── Opponents (club-wide — no teamId filter) ──────────────────────────
		this._unsubs.push(
			onSnapshot(
				query(
					collection(db, 'opponents'),
					where('tenantId', '==', tenantId),
					orderBy('name', 'asc'),
				),
				(snap) => {
					this.opponents = snap.docs.map((d) => ({
						id: d.id,
						...d.data(),
					})) as LeagueSchema.Opponent[];
				},
				(err) => console.warn('[LeagueManager] opponents error:', err),
			),
		);
	}

	// ── createFixture ─────────────────────────────────────────────────────────

	/**
	 * Create a new fixture after validating the input.
	 *
	 * Validates:
	 *  - `dateTime` resolves to a non-zero timestamp.
	 *  - The referenced `seasonId` exists in the loaded seasons list.
	 *  - The season is `isActive` (you can't schedule into an archived season).
	 *
	 * @param fixtureData  Everything except `id`, `tenantId`, and timestamps.
	 * @returns            Firestore document ID of the new fixture.
	 */
	async createFixture(fixtureData: CreateFixtureInput): Promise<string> {
		if (!this._tenantId) throw new Error('[LeagueManager] Not connected — no tenantId.');

		// ── Validate dateTime ─────────────────────────────────────────────────
		const dtMs = toTimestampMs(fixtureData.dateTime);
		if (!dtMs) throw new Error('[LeagueManager] Invalid dateTime on fixture.');

		// ── Validate season ───────────────────────────────────────────────────
		const season = this.seasons.find((s) => s.id === fixtureData.seasonId);
		if (!season) {
			throw new Error(
				`[LeagueManager] Season "${fixtureData.seasonId}" not found in loaded seasons.`,
			);
		}
		if (!season.isActive) {
			throw new Error(
				`[LeagueManager] Season "${season.name}" is archived. Create a new active season first.`,
			);
		}

		const ref = await addDoc(collection(db, 'fixtures'), {
			...fixtureData,
			tenantId: this._tenantId,
			status: fixtureData.status ?? 'Scheduled',
			createdAt: serverTimestamp(),
		});

		return ref.id;
	}

	// ── completeMatch ─────────────────────────────────────────────────────────

	/**
	 * Atomically record a match result.
	 *
	 * Uses a Firestore batch write to:
	 *   1. Update `fixtures/{fixtureId}` → `status: 'Completed'`
	 *   2. Write `match_results/{fixtureId}` (doc ID = fixtureId for O(1) lookup)
	 *
	 * Computes `outcome` ('W' | 'L' | 'D') from the scores.
	 *
	 * @param fixtureId   Firestore document ID of the completed fixture.
	 * @param results     Score, playerStats, coachNotes, optional highlights.
	 */
	async completeMatch(fixtureId: string, results: CompleteMatchInput): Promise<void> {
		if (!this._tenantId) throw new Error('[LeagueManager] Not connected — no tenantId.');

		const outcome: 'W' | 'L' | 'D' =
			results.scoreHome > results.scoreAway
				? 'W'
				: results.scoreHome < results.scoreAway
					? 'L'
					: 'D';

		const batch = writeBatch(db);

		// 1. Mark fixture complete
		batch.update(doc(db, 'fixtures', fixtureId), {
			status: 'Completed',
			completedAt: serverTimestamp(),
		});

		// 2. Write match result (doc ID = fixtureId; merge: true allows corrections)
		batch.set(
			doc(db, 'match_results', fixtureId),
			{
				fixtureId,
				tenantId: this._tenantId,
				...results,
				outcome,
				recordedAt: serverTimestamp(),
			},
			{ merge: true },
		);

		await batch.commit();

		// Optimistically update local matchResults cache for instant UI feedback.
		this.matchResults = {
			...this.matchResults,
			[fixtureId]: {
				id: fixtureId,
				fixtureId,
				tenantId: this._tenantId,
				...results,
				outcome,
				playerStats: results.playerStats ?? {},
			},
		};
	}

	// ── archiveSeason ─────────────────────────────────────────────────────────

	/**
	 * Archive a season: set `isActive: false`.
	 * Fixtures remain linked to the archived season by `seasonId`.
	 */
	async archiveSeason(seasonId: string): Promise<void> {
		await updateDoc(doc(db, 'seasons', seasonId), {
			isActive: false,
			archivedAt: serverTimestamp(),
		});
	}

	// ── getOpponentHistory ────────────────────────────────────────────────────

	/**
	 * Aggregate all historical match results against a specific opponent across
	 * all seasons for scouting analysis.
	 *
	 * Queries completed fixtures by `opponentId`, then loads the corresponding
	 * `match_results` documents in parallel via their fixture IDs.
	 *
	 * @param opponentId  Firestore document ID of the opponent.
	 * @returns           Array of match results, most recent first.
	 */
	async getOpponentHistory(opponentId: string): Promise<LeagueSchema.MatchResult[]> {
		if (!this._tenantId) return [];

		const fixtureSnap = await getDocs(
			query(
				collection(db, 'fixtures'),
				where('tenantId', '==', this._tenantId),
				where('opponentId', '==', opponentId),
				where('status', '==', 'Completed'),
			),
		);

		if (fixtureSnap.empty) return [];

		const { getDoc } = await import('firebase/firestore');

		const results = await Promise.all(
			fixtureSnap.docs.map(async (fd) => {
				const snap = await getDoc(doc(db, 'match_results', fd.id));
				if (!snap.exists()) return null;
				return { id: snap.id, ...snap.data() } as LeagueSchema.MatchResult;
			}),
		);

		return results
			.filter((r): r is LeagueSchema.MatchResult => r !== null)
			.sort((a, b) => toTimestampMs(b.recordedAt) - toTimestampMs(a.recordedAt));
	}

	// ── destroy ───────────────────────────────────────────────────────────────

	/** Call from `onDestroy` to tear down all subscriptions and effects. */
	destroy() {
		this._effectCleanup?.();
		this._effectCleanup = null;
		this._detach();
	}

	private _detach() {
		this._unsubs.forEach((fn) => fn());
		this._unsubs = [];
	}
}
