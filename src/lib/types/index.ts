/**
 * src/lib/types/index.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Phase 0 — Core domain interfaces for the Soccer Skills Tracker SaaS.
 *
 * All interfaces are derived from the Firestore data structures observed in:
 *   • legacy/app.js       — runtime shape of user, team, club, workout objects
 *   • data.js             — workout seed data (name + type tuples)
 *   • legacy/modules/     — schedule, assignment, stats log patterns
 *
 * Naming conventions
 * ───────────────────
 *   - Exported types use PascalCase nouns mirroring their Firestore collection.
 *   - `id` is always optional (absent on new documents before `addDoc`).
 *   - Deprecated legacy field aliases are marked `@deprecated` so linters warn.
 *   - Timestamp fields accept both `Timestamp` (from Firestore) and `Date`
 *     (from local construction) to avoid forced serialization at boundaries.
 */

import type { Timestamp } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// § 1  User & Auth System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical role hierarchy (ascending privilege):
 *
 *   guest → player → parent → tutor → registrar → recruiter
 *         → coach → director → global_admin → super_admin
 *
 * Sources:
 *   • legacy/app.js `getAppContext()` and `checkRoles()`
 *   • src/lib/stores/auth.svelte.js role-derived booleans
 *   • src/lib/auth/authRouter.ts `getRoleDestination()`
 *   • src/lib/auth/loginRouting.js `getLoginWaterfallDestination()`
 */
export type UserRole =
	| 'super_admin'     // Platform-level SaaS admin (cross-tenant)
	| 'global_admin'    // Alias for super_admin from JWT claims
	| 'director'        // Club/tenant owner (single org)
	| 'coach'           // Team coach (single or multiple teams)
	| 'registrar'       // Club-scoped compliance & roster staff
	| 'recruiter'       // Talent-feed viewer (PII gated)
	| 'parent'          // Household guardian (links to player accounts)
	| 'player'          // Athlete (may be a child account under a parent)
	| 'tutor'           // Academic tutor (read-only records)
	| 'guest';          // Unauthenticated / pre-login state

/**
 * Firestore document: `users/{email}`
 *
 * The document key is the user's lowercase email address. All read/write
 * operations must normalise email to lowercase before using it as a doc ID.
 */
export interface UserProfile {
	/** Display name shown throughout the application UI. */
	playerName: string;
	/** The team this user belongs to (or `"admin"` for elevated roles). */
	teamId: string;
	/** The club this user belongs to. Optional on initial profile creation. */
	clubId?: string;
	/** Role as resolved from Firebase Custom Claims — source of truth for access control. */
	role: UserRole;
	/** ISO timestamp of when the user first completed profile setup. */
	joinedAt?: Timestamp | Date;

	/** @deprecated Legacy alias for `playerName` — present on old documents. */
	name?: string;
	/** @deprecated Legacy alias for `playerName` — present on very old documents. */
	player?: string;
}

/**
 * Firestore document: `player_lookup/{email}`
 *
 * Written by coaches when manually adding a player to a roster. Acts as an
 * invitation — when the player first authenticates, this document is read and
 * promoted into the `users` collection.
 *
 * Source: legacy/app.js `onAuthStateChanged` → `inviteRef` lookup
 */
export interface PlayerLookup {
	teamId: string;
	playerName: string;
	clubId?: string;
}

/**
 * Snapshot of the active user's contextual access — derived at runtime from
 * `UserProfile` and the current coach team selection.
 *
 * Source: legacy/app.js `window.getAppContext()`
 */
export interface AppContext {
	/** Active team ID (null if not yet selected or not applicable). */
	tid: string | null;
	/** Active club ID (null if not yet resolved). */
	cid: string | null;
	role: UserRole;
	playerName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 1b  Auth Routing (Sprint 1.2 — Vanguard Routing Interceptor)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of the role-based routing waterfall.
 * Produced by `getRoleDestination()` in `src/lib/auth/authRouter.ts`.
 */
export interface AuthRoutingDestination {
	/** SvelteKit route path for `goto()`. */
	path: string;
	/** Workspace context key for the sidebar switcher store. */
	context: string;
	/** Unique pivot key for the workspace context store. */
	pivotKey: string;
}

/**
 * Magic link dispatch state — tracks the lifecycle of a
 * `sendSignInLinkToEmail` call in the login UI.
 */
export type MagicLinkPhase = 'idle' | 'sending' | 'sent' | 'error';

/**
 * WebAuthn passkey authentication phases — mirrors the
 * `loginWithPasskey()` flow in `LoginEngine.svelte.ts`.
 */
export type PasskeyPhase = 'idle' | 'prompting' | 'verifying' | 'success' | 'error';

/**
 * Aggregate auth flow state for the login page.
 * All fields are reactive `$state` bindings in `+page.svelte`.
 */
export interface LoginPageState {
	email: string;
	busy: boolean;
	error: string;
	magicLinkPhase: MagicLinkPhase;
	passkeyPhase: PasskeyPhase;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 2  Club System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Firestore collection: `clubs`
 *
 * Source: legacy/app.js `window.globalClubs`, `modules/branding.js`
 */
export interface Club {
	/** Firestore document ID — used as `clubId` on related documents. */
	id: string;
	/** Human-readable club name shown in dropdowns and headers. */
	name?: string;
	/** URL-safe slug for the club's public landing page (`/club/{slug}`). */
	slug?: string;
	/** Full URL to the club logo image used in the app header and medals. */
	logoUrl?: string;
	/** Hex colour string for the club's primary brand colour. */
	primaryColor?: string;
	/** Hex colour string for the club's secondary brand colour. */
	secondaryColor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 3  Team System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Firestore collection: `teams`
 *
 * Source: legacy/app.js `globalTeams`, `checkRoles()`, `initCoachDropdown()`
 */
export interface Team {
	/** Firestore document ID — canonical team identifier. */
	id: string;
	/** Human-readable team name (e.g., "U12 Boys A"). */
	name?: string;
	/**
	 * The club this team belongs to.
	 * Required for all new teams; may be absent on legacy documents.
	 */
	clubId?: string;
	/** Email of the head coach. Used for role-based access gating. */
	coachEmail?: string;
	/**
	 * Array of assistant coach email addresses.
	 * Access check: `(t.assistants || []).some(a => a.toLowerCase() === email)`
	 */
	assistants?: string[];
	/** Sport identifier (e.g., "soccer", "basketball"). */
	sport?: string;
	/** Age group / division label (e.g., "U14", "Varsity"). */
	ageGroup?: string;

	/**
	 * @deprecated Legacy alias — value mirrors `id` on old documents.
	 * New code must use `id` directly.
	 */
	teamId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 4  Workout & Training System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical workout categories.
 *
 * Source: data.js seed data; `buildCoachDropdowns()` filter logic in app.js
 *   - 'cardio'       → warmup drills (distance + time inputs)
 *   - 'core'         → core strength (sets × reps)
 *   - 'ball_mastery' → technical ball work (sets × reps)
 *   - 'basics'       → fundamental skills — rendered in UI as "Basics"
 *   - 'foundation'   → alias used in `populate("selectBasics", "foundation")`
 */
export type WorkoutCategory =
	| 'cardio'
	| 'core'
	| 'ball_mastery'
	| 'basics'
	| 'foundation';

/**
 * Firestore collection: `team_workouts`
 *
 * Represents a single drill/exercise available for a team to assign or log.
 * Source: legacy/app.js `window.fetchWorkouts()`, data.js `window.dbData.workouts`
 */
export interface Workout {
	/** Firestore document ID — absent on new documents before `addDoc`. */
	id?: string;
	/** Display name of the drill (e.g., "Sole Rolls", "Juggling"). */
	name: string;
	/** Category bucket — drives which input fields are shown in the tracker. */
	type: WorkoutCategory;
	/** The team this workout belongs to. Null for global/seed workouts. */
	teamId?: string;
}

/**
 * A single drill entry within a workout session or homework assignment.
 * Supports both numeric and string values to handle legacy form data.
 *
 * Source: legacy/app.js `addDrillToSession()`, `assignHwBtn` handler
 */
export interface DrillItem {
	name: string;
	/** Number of sets. Stored as string from form inputs; coerce on read. */
	sets: number | string;
	/** Number of reps / duration. Coerce on read. */
	reps: number | string;
}

/**
 * Firestore collection: `stats_logs`
 *
 * A completed workout session submitted by a player.
 * Source: legacy/modules/tracker.js `handleWorkoutSubmit()`
 */
export interface WorkoutSession {
	id?: string;
	teamId: string;
	/** Player display name — matches `UserProfile.playerName`. */
	player: string;
	/** ISO date string (YYYY-MM-DD). */
	date: string;
	drills: DrillItem[];
	/** Match result logged alongside the workout. */
	outcome?: 'W' | 'L' | 'T';
	notes?: string;
	submittedAt?: Timestamp | Date;
	/** XP awarded for this session by the gamification engine. */
	xpEarned?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5  Schedule & Assignments
// ─────────────────────────────────────────────────────────────────────────────

/** Schedule event type — open string allows custom values beyond presets. */
export type ScheduleEventType = 'Practice' | 'Game' | 'Tournament' | 'Meeting' | (string & {});

/**
 * Firestore collection: `schedules`
 *
 * Source: legacy/app.js `addScheduleBtn` handler, `loadHomeDashboard()`
 */
export interface ScheduleEvent {
	id?: string;
	teamId: string;
	/** ISO date string (YYYY-MM-DD). Sorted lexicographically for display. */
	date: string;
	/** 24-hour time string (HH:MM). */
	time: string;
	type: ScheduleEventType;
	location: string;
}

export type AssignmentStatus = 'active' | 'completed';

/**
 * Firestore collection: `assignments`
 *
 * Homework assigned by a coach to a specific player.
 * Source: legacy/app.js `assignHwBtn` handler, `loadHomeDashboard()`
 */
export interface Assignment {
	id?: string;
	teamId: string;
	/** Recipient player's display name — matches `UserProfile.playerName`. */
	player: string;
	/** ISO date string (YYYY-MM-DD) by which the homework must be completed. */
	dueDate: string;
	status: AssignmentStatus;
	/**
	 * @deprecated Legacy single-drill format — use `drills[]` for new documents.
	 * Present on documents created before the multi-drill homework builder.
	 */
	drill?: string;
	/** Multi-drill homework list — canonical format for new documents. */
	drills?: DrillItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// § 6  Gamification & Stats
// ─────────────────────────────────────────────────────────────────────────────

/** Player rank tiers in ascending order of experience. */
export type PlayerRank = 'Rookie' | 'Starter' | 'Veteran' | 'Pro' | 'Legend';

/**
 * XP thresholds per rank level.
 * Keep in sync with the gamification engine in `$lib/gamification/`.
 */
export const RANK_XP_THRESHOLDS: Record<PlayerRank, number> = {
	Rookie:  0,
	Starter: 500,
	Veteran: 1_500,
	Pro:     3_500,
	Legend:  7_500,
};

/**
 * Aggregated stats record per player.
 * Source: legacy/modules/stats.js `loadStatsDashboard()`
 */
export interface PlayerStats {
	totalSessions: number;
	totalDrills: number;
	currentXP: number;
	rank: PlayerRank;
	/** Streak in consecutive days with logged sessions. */
	currentStreak: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 7  Trial / Challenge System
// ─────────────────────────────────────────────────────────────────────────────

export type TrialCategory = 'Passing' | 'Shooting' | 'Time';

/**
 * Firestore collection: `trial_scores`
 *
 * A single trial score entry submitted from Challenge Mode.
 * Source: legacy/modules/challenges.js `submitTrialScore()`
 */
export interface TrialScore {
	id?: string;
	teamId: string;
	player: string;
	category: TrialCategory;
	score: number;
	submittedAt: Timestamp | Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 8  Utility Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic Firestore document shape — a typed data payload plus its doc ID.
 * Use when `getDocs` results need to be merged with their Firestore ID.
 *
 * @example
 * const teams: WithId<Team>[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
 */
export type WithId<T> = T & { id: string };

/**
 * Partial update helper — all fields optional except the document ID.
 * Use with `updateDoc` to enforce that `id` is always provided.
 */
export type PartialUpdate<T> = Partial<Omit<T, 'id'>> & { id: string };
