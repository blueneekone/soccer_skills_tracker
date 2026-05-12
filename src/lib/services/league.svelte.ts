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
	limit,
	startAfter,
	type DocumentSnapshot,
	type QueryConstraint,
} from 'firebase/firestore';
import {
	computeThreatAssessment,
	toTimestampMs,
	type LeagueSchema,
} from '$lib/types/league';
import { commitMatchResult } from '$lib/services/writes.svelte';

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

	/** Whether more historical (completed) fixtures exist beyond the current page. */
	fixturesHasMore = $state(false);
	fixturesLoadingMore = $state(false);

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
	private _fixtureLastDoc: DocumentSnapshot | null = null;

	static readonly FIXTURE_PAGE_SIZE = 20;

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

		// ── Fixtures (paginated onSnapshot — first page only) ─────────────────
		//
		// We subscribe to the most-recent FIXTURE_PAGE_SIZE fixtures in real-time
		// so the UI always reflects adds/updates without polling.  Older (completed)
		// fixtures can be loaded on demand via loadMoreFixtures().
		const fixtureConstraints: QueryConstraint[] = [
			where('tenantId', '==', tenantId),
			orderBy('dateTime', 'desc'), // newest first → slice gives most-recent N
			limit(LeagueManager.FIXTURE_PAGE_SIZE + 1), // +1 to detect hasMore
		];
		if (this._teamId) fixtureConstraints.push(where('teamId', '==', this._teamId));

		this._fixtureLastDoc = null;
		this.fixturesHasMore = false;

		this._unsubs.push(
			onSnapshot(
				query(collection(db, 'fixtures'), ...fixtureConstraints),
				(snap) => {
					this.fixturesHasMore = snap.docs.length > LeagueManager.FIXTURE_PAGE_SIZE;
					const pageDocs = snap.docs.slice(0, LeagueManager.FIXTURE_PAGE_SIZE);
					this._fixtureLastDoc = pageDocs.at(-1) ?? null;
					// Re-sort ascending for display (earliest first)
					this.fixtures = pageDocs
						.map((d) => ({ id: d.id, ...d.data() }) as LeagueSchema.Fixture)
						.sort((a, b) => toTimestampMs(a.dateTime) - toTimestampMs(b.dateTime));
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

	// ── loadMoreFixtures ──────────────────────────────────────────────────────

	/**
	 * Append the next page of fixtures to `this.fixtures`.
	 *
	 * Uses `getDocs` (one-shot) rather than `onSnapshot` to avoid creating a
	 * second live listener.  The loaded items are merged into the reactive
	 * `fixtures` array so all derived views (enrichedUpcoming, etc.) update.
	 *
	 * Call this when the user scrolls past the "Load More" sentinel or clicks
	 * the load-more button in `FixtureList`.
	 */
	async loadMoreFixtures(): Promise<void> {
		if (!this.fixturesHasMore || this.fixturesLoadingMore || !this._fixtureLastDoc || !this._tenantId) return;

		this.fixturesLoadingMore = true;
		try {
			const constraints: QueryConstraint[] = [
				where('tenantId', '==', this._tenantId),
				orderBy('dateTime', 'desc'),
				startAfter(this._fixtureLastDoc),
				limit(LeagueManager.FIXTURE_PAGE_SIZE + 1),
			];
			if (this._teamId) constraints.push(where('teamId', '==', this._teamId));

			const snap = await getDocs(query(collection(db, 'fixtures'), ...constraints));
			this.fixturesHasMore = snap.docs.length > LeagueManager.FIXTURE_PAGE_SIZE;
			const pageDocs = snap.docs.slice(0, LeagueManager.FIXTURE_PAGE_SIZE);
			this._fixtureLastDoc = pageDocs.at(-1) ?? this._fixtureLastDoc;

			const newItems = pageDocs.map((d) => ({ id: d.id, ...d.data() }) as LeagueSchema.Fixture);
			// Merge + de-dupe by id, then sort ascending
			const merged = [...this.fixtures, ...newItems];
			const seen = new Set<string>();
			this.fixtures = merged
				.filter((f) => { if (seen.has(f.id)) return false; seen.add(f.id); return true; })
				.sort((a, b) => toTimestampMs(a.dateTime) - toTimestampMs(b.dateTime));
		} catch (err) {
			console.warn('[LeagueManager] loadMoreFixtures error:', err);
		} finally {
			this.fixturesLoadingMore = false;
		}
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
	 * Atomically record a match result by delegating to the write facade.
	 *
	 * Single batch — all four writes either land or all retry:
	 *   1. fixtures/{fixtureId}                  → status: 'Completed'
	 *   2. match_results/{fixtureId}             → full result document
	 *   3. opponents/{opponentId}                → stats counters (increment)
	 *   4. seasons/{seasonId}                    → completedFixtureCount += 1
	 *
	 * Phase 1, Epic 1 hardening: all counter updates use `increment()` so
	 * concurrent offline coaches recording matches against the same
	 * opponent accumulate correctly on reconnect.
	 *
	 * @param fixtureId   Firestore document ID of the completed fixture.
	 * @param results     Score, playerStats, coachNotes, optional highlights.
	 */
	async completeMatch(fixtureId: string, results: CompleteMatchInput): Promise<void> {
		if (!this._tenantId) throw new Error('[LeagueManager] Not connected — no tenantId.');

		// Resolve the parent fixture so we know which opponent and season
		// to update.  Skipping these would leave threat assessment stale.
		const fixture = this.fixtures.find((f) => f.id === fixtureId);
		if (!fixture) {
			throw new Error(
				`[LeagueManager] Fixture "${fixtureId}" not loaded — cannot derive opponentId / seasonId.`,
			);
		}

		await commitMatchResult({
			fixtureId,
			opponentId: fixture.opponentId,
			seasonId: fixture.seasonId,
			tenantId: this._tenantId,
			scoreHome: results.scoreHome,
			scoreAway: results.scoreAway,
			playerStats: results.playerStats ?? {},
			coachNotes: results.coachNotes,
			highlights: results.highlights,
			recordedBy: results.recordedBy,
		});

		const outcome: 'W' | 'L' | 'D' =
			results.scoreHome > results.scoreAway
				? 'W'
				: results.scoreHome < results.scoreAway
					? 'L'
					: 'D';

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
