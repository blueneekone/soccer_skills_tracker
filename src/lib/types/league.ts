/**
 * league.ts
 * ─────────
 * LeagueSchema namespace — canonical TypeScript types for all league-related
 * Firestore collections in the Nexus Command platform.
 *
 * SCHEMA ENFORCEMENT RULES
 * ─────────────────────────
 * 1.  Every document interface MUST include `tenantId` at the root level.
 *     This is the Zero-Trust partition key enforced by Firestore security rules:
 *       allow read: if request.auth.token.tenantId == resource.data.tenantId;
 *
 * 2.  Every service function that reads or writes these collections MUST
 *     accept `tenantId` as a parameter sourced from `authStore.tenantId`
 *     (which itself comes from the verified JWT claim, not client input).
 *
 * 3.  All queries MUST include `.where('tenantId', '==', tenantId)` as the
 *     first constraint.  Never query without this filter.
 *
 * Firestore collection map
 * ──────────────────────────────────────────────────────────────────────────
 *   seasons/{seasonId}                — per-club, per-team season records
 *   opponents/{opponentId}            — club-wide scouting directory
 *   fixtures/{fixtureId}              — individual match scheduling
 *   match_results/{fixtureId}         — doc ID = fixtureId for direct lookup
 *
 * Composite Firestore indexes required
 * ──────────────────────────────────────────────────────────────────────────
 *   seasons:       tenantId ASC + teamId ASC + startDate DESC
 *   fixtures:      tenantId ASC + teamId ASC + dateTime ASC
 *   fixtures:      tenantId ASC + opponentId ASC + status ASC
 *   match_results: tenantId ASC + (no additional — queried by doc ID)
 */

import type { FirestoreTimestamp } from './tenant';
import { formatFixtureDate as _fmtFixtureDate } from '../utils/time';

// Re-export for convenience
export type { FirestoreTimestamp };

// ── Shared primitives ──────────────────────────────────────────────────────

/** Any value that can be interpreted as a date. */
export type AnyDate = Date | FirestoreTimestamp | string | number;

// ═══════════════════════════════════════════════════════════════════════════
// LeagueSchema namespace
// ═══════════════════════════════════════════════════════════════════════════

export namespace LeagueSchema {
	// ── Discriminated unions ─────────────────────────────────────────────────

	/** Match type — determines which standings / cup this fixture counts toward. */
	export type FixtureType = 'League' | 'Tournament' | 'Friendly';

	/** Match lifecycle state. */
	export type FixtureStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Postponed';

	/** Computed threat assessment for an opponent based on head-to-head history. */
	export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

	// ── seasons/{seasonId} ───────────────────────────────────────────────────

	/**
	 * A competitive season for a club or specific team.
	 *
	 * Invariant: at most ONE season per teamId (or per tenantId if teamId is
	 * absent) should have `isActive: true` at any time.  The `archiveSeason()`
	 * service method enforces this by setting `isActive: false` before creating
	 * a new active season.
	 */
	export interface Season {
		/** Firestore document ID. */
		id: string;
		/** Tenant partition key — REQUIRED. */
		tenantId: string;
		/**
		 * Optional team scope.  If absent, the season applies to the entire club.
		 * If present, only that team's fixtures belong to this season.
		 */
		teamId?: string;
		/** Human-readable label, e.g. "2025-2026". */
		name: string;
		startDate: AnyDate;
		endDate: AnyDate;
		/**
		 * Only one season per teamId (or per tenantId) should be `true`.
		 * Archived seasons are `false`.
		 */
		isActive: boolean;
		/** ISO-8601 creation timestamp. */
		createdAt?: FirestoreTimestamp;
		/** Set when a director archives the season. */
		archivedAt?: FirestoreTimestamp;
	}

	// ── opponents/{opponentId} ───────────────────────────────────────────────

	/**
	 * A recurring rival in the club's scouting directory.
	 *
	 * This is club-scoped (tenantId only — no teamId), so scouts from all teams
	 * share the same directory.  `stats` is denormalized from `match_results`
	 * for fast display without aggregation queries.
	 */
	export interface Opponent {
		id: string;
		/** Tenant partition key — REQUIRED. */
		tenantId: string;
		/** Full opponent team name (e.g. "Riverside United"). */
		name: string;
		/** Parent club name if different from the team name (e.g. "Riverside FC"). */
		clubName?: string;
		/** Hex brand color for opponent badge (e.g. "#c0392b"). */
		primaryColor?: string;
		/**
		 * Coaching staff's scouting notes array — each entry is a timestamped
		 * observation added by a coach/scout (e.g. "2025-10-12 | Weak left side").
		 */
		scoutNotes?: string[];
		/**
		 * Denormalized head-to-head record.
		 * Updated by `recordMatchResult()` after each completed fixture.
		 * Enables threat level calculation without aggregation queries.
		 */
		stats?: OpponentStats;
		createdAt?: FirestoreTimestamp;
	}

	export interface OpponentStats {
		totalGames: number;
		wins: number;       // our wins against this opponent
		draws: number;
		losses: number;     // our losses (their wins)
		goalsFor: number;   // total goals we scored against them
		goalsAgainst: number;
		lastPlayed?: AnyDate;
	}

	// ── fixtures/{fixtureId} ─────────────────────────────────────────────────

	/**
	 * A scheduled or completed match.
	 *
	 * The fixture document holds scheduling data.  Score and player stats live
	 * in `match_results/{fixtureId}` to keep this document lean and frequently
	 * readable by the schedule view.
	 */
	export interface Fixture {
		id: string;
		/** Tenant partition key — REQUIRED. */
		tenantId: string;
		/** Parent season. */
		seasonId: string;
		/** Our team. */
		teamId: string;
		/** Reference to opponents/{opponentId}. */
		opponentId: string;
		/**
		 * Kick-off date and time.
		 * ALWAYS stored as a UTC Firestore Timestamp — Cloud Function
		 * `createFixture` enforces this on write; never trust a raw
		 * client-supplied string or number here without conversion.
		 */
		dateTime: AnyDate;
		/** Venue label, e.g. "Home — Lakeside Park". */
		location: string;
		type: FixtureType;
		status: FixtureStatus;
		/**
		 * IANA timezone of the physical venue (e.g. "America/New_York").
		 * Set when the fixture is linked to a `facilities` document that
		 * carries its own timezone. Used by FixtureList to render local
		 * kickoff time and warn when it differs from the viewer's browser zone.
		 */
		facilityTimezone?: string;
		/** Reference to facilities/{facilityId}, if booked via the scheduler. */
		facilityId?: string;
		createdAt?: FirestoreTimestamp;
		/** Set by recordMatchResult(). */
		completedAt?: FirestoreTimestamp;
	}

	// ── match_results/{fixtureId} ────────────────────────────────────────────

	/**
	 * Result data for a completed match.
	 *
	 * Document ID = fixtureId — enables a direct lookup by `doc(db, 'match_results', fixtureId)`
	 * without a query, and guarantees a 1:1 relationship.
	 *
	 * `playerStats` is a Map keyed by player email (the app's user document key).
	 * Using a Firestore map field avoids sub-collections and allows a single
	 * document read to return all player stats for the match.
	 */
	export interface MatchResult {
		/**
		 * Firestore document ID = fixtureId.
		 * Optional on the interface (not present before the doc is written).
		 */
		id?: string;
		/** Foreign key → fixtures/{fixtureId}. Also the document ID. */
		fixtureId: string;
		/** Tenant partition key — REQUIRED. */
		tenantId: string;
		/** Our team's goals. */
		scoreHome: number;
		/** Opponent's goals. */
		scoreAway: number;
		/** Match outcome from our perspective. */
		outcome?: 'W' | 'L' | 'D';
		/** Post-match notes, video links, or highlight timestamps. */
		highlights?: string;
		/** General coaching notes for the post-match debrief. */
		coachNotes?: string;
		/**
		 * Per-player performance data.
		 * Key = player email (lowercase) or player Firestore doc ID.
		 */
		playerStats: Record<string, PlayerMatchStats>;
		/** Server timestamp of when the result was recorded. */
		recordedAt?: FirestoreTimestamp;
		/** Email or UID of the coach who submitted the result. */
		recordedBy?: string;
	}

	export interface PlayerMatchStats {
		/** Minutes on the pitch. */
		minutesPlayed?: number;
		goals?: number;
		assists?: number;
		yellowCards?: number;
		redCards?: number;
		/** Coach's 1–10 performance rating. */
		rating?: number;
		/** Individual player match notes. */
		notes?: string;
	}

	// ── Computed / UI types ──────────────────────────────────────────────────

	/**
	 * Fixture enriched with resolved opponent data.
	 * Produced by the LeagueService for component consumption.
	 */
	export interface EnrichedFixture extends Fixture {
		opponent: Opponent | null;
		result?: MatchResult;
	}

	/**
	 * Vanguard Threat Assessment — computed from the opponent's head-to-head
	 * record against this club.
	 *
	 * Scale (based on our win rate against them):
	 *   ≥ 60% wins  → LOW THREAT   (we dominate)
	 *   40–59% wins → MEDIUM THREAT (contested rivalry)
	 *   < 40% wins  → HIGH THREAT   (they have our number)
	 *   no data      → UNKNOWN
	 */
	export interface ThreatAssessment {
		level: ThreatLevel;
		/** Threat score 0–100. Higher = more dangerous for us. */
		score: number;
		/** Human-readable hex accent color for the UI. */
		color: string;
		/** Our win rate 0–1. */
		winRate: number;
	}
}

// ── Utility functions ──────────────────────────────────────────────────────

/** Convert any date-like value to a JS timestamp (ms). */
export function toTimestampMs(val: AnyDate | undefined | null): number {
	if (!val) return 0;
	if (val instanceof Date) return val.getTime();
	if (typeof val === 'number') return val;
	if (typeof val === 'string') return new Date(val).getTime();
	if (typeof val === 'object' && typeof (val as FirestoreTimestamp).toDate === 'function') {
		return (val as FirestoreTimestamp).toDate().getTime();
	}
	return 0;
}

/** Compute the Vanguard Threat Assessment for an opponent. */
export function computeThreatAssessment(
	stats: LeagueSchema.OpponentStats | undefined,
): LeagueSchema.ThreatAssessment {
	if (!stats || stats.totalGames === 0) {
		return { level: 'UNKNOWN', score: 50, color: '#475569', winRate: 0 };
	}

	const winRate = stats.wins / stats.totalGames;
	const threatScore = Math.round((1 - winRate) * 100); // inverse: high win rate = low threat

	if (winRate >= 0.6) {
		return { level: 'LOW', score: threatScore, color: '#22c55e', winRate };
	}
	if (winRate >= 0.4) {
		return { level: 'MEDIUM', score: threatScore, color: '#f59e0b', winRate };
	}
	return { level: 'HIGH', score: threatScore, color: '#ef4444', winRate };
}

/** Format a match date for display (e.g. "SAT 14 JUN · 15:00"). */
export function formatFixtureDate(val: AnyDate | undefined | null, facilityTimezone?: string): string {
	return _fmtFixtureDate(val, facilityTimezone);
}
