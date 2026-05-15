/**
 * tenant.ts
 * ─────────
 * Canonical TypeScript interfaces for the Nexus Command multi-tenant schema.
 *
 * Naming convention
 * ─────────────────
 * The roadmap uses `tenantId` as the canonical tenant key.  The existing
 * codebase stores this value as `clubId` in Firestore documents AND in
 * Firebase Auth JWT custom claims.  Both names refer to the same identifier:
 * the Firestore document ID inside the `clubs` collection.
 *
 * Going forward:
 *   • TypeScript interfaces use `tenantId`.
 *   • Firestore writes include BOTH `tenantId` and `clubId` for backward
 *     compatibility with existing security rules and Cloud Functions.
 *   • Auth store exposes `.tenantId` mapped from `profile.clubId`.
 *
 * Firestore collection map
 * ──────────────────────────────────────────────────────────────────────────
 *   clubs/{tenantId}                 ← organizations (canonical: "clubs")
 *   teams/{teamId}                   ← clubId field = tenantId
 *   users/{emailKey}                 ← clubId field = tenantId
 *   invites/{inviteId}               ← NEW: time-limited invite codes
 *   active_missions/{missionId}      ← coach-deployed drills (CommandCenter)
 *
 * Custom JWT claims (set by assignTenantClaims Cloud Function)
 * ──────────────────────────────────────────────────────────────────────────
 *   {
 *     clubId:  string,   // tenantId
 *     role:    TenantRole,
 *     teamId?: string,
 *   }
 *
 * Firestore Security Rule pattern (Task 5.1)
 * ──────────────────────────────────────────────────────────────────────────
 *   allow read: if request.auth.token.clubId == resource.data.clubId;
 */

// ── Role registry ─────────────────────────────────────────────────────────

/**
 * Every principal that can hold an Auth token.  Ordered by privilege
 * (highest to lowest) for reference; enforcement is done in Firestore rules
 * and Cloud Function guards — not here.
 */
export type TenantRole =
	| 'global_admin'    // platform operator — cross-tenant
	| 'super_admin'     // legacy alias for global_admin
	| 'director'        // club director — manages coaches + rosters
	| 'registrar'       // club staff — roster admin, no coaching
	| 'coach'           // team coach — deploys missions, grades players
	| 'parent'          // guardian — visibility into child's data only
	| 'player'          // athlete — self-service data entry
	| 'recruiter'       // external scout — read-only recruit profiles
	| 'guest';          // unauthenticated / unknown

// ── Organization (Club) ────────────────────────────────────────────────────

/**
 * `clubs/{tenantId}` — the top-level tenant document.
 *
 * The collection is named `clubs` for backward compat; conceptually this is
 * the "organization" record for the multi-tenant system.
 */
export interface OrganizationDoc {
	/** Firestore document ID — also the `clubId` / `tenantId` foreign key. */
	id: string;
	/** Club display name (e.g. "Aggies FC"). */
	name: string;
	/** Sport slug (e.g. "soccer"). */
	sport?: string;
	/** Public logo URL (Firebase Storage). */
	logoUrl?: string;
	/** Hex brand colour (e.g. "#14b8a6"). */
	primaryColor?: string;
	/** Subscription / entitlement tier (e.g. "team", "club", "infinite"). */
	plan?: string;
	/** ISO-8601 creation timestamp. */
	createdAt?: FirestoreTimestamp;
	/** Email of the director / primary owner. */
	ownerEmail?: string;
}

// ── Team ──────────────────────────────────────────────────────────────────

/**
 * `teams/{teamId}` — a squad inside an organization.
 *
 * IMPORTANT: always filter by `clubId` in Firestore queries to avoid
 * cross-tenant leakage.
 */
export interface TenantTeam {
	id: string;
	name: string;
	/** Foreign key → `clubs/{clubId}`. Equals `tenantId`. */
	clubId: string;
	/** Primary coach email. */
	coachEmail?: string;
	/** Additional coach emails. */
	assistants?: string[];
	/** Age group label (e.g. "U14", "U16"). */
	ageGroup?: string;
	/** Season identifier (e.g. "2025-2026"). */
	season?: string;
	/** Player count (denormalized for quick display). */
	playerCount?: number;
	createdAt?: FirestoreTimestamp;
}

// ── User ──────────────────────────────────────────────────────────────────

/**
 * `users/{emailKey}` — a principal with a Firestore profile.
 *
 * Key is the lower-cased email address (not UID).  Contains ALL gamification
 * fields, VPC consent, household data, and the `armory` sub-map written by
 * ArmoryEngine.
 */
export interface TenantUser {
	/** Firestore document ID = email.toLowerCase(). */
	id: string;
	/** Display name (legacy `playerName` field). */
	playerName?: string;
	/** Role stored in Firestore (may lag JWT claims). */
	role?: TenantRole;
	/** Foreign key → `clubs/{clubId}`. */
	clubId?: string;
	/** Foreign key → `teams/{teamId}`. */
	teamId?: string;
	/** Playing position label (e.g. "FORWARD"). */
	position?: string;
	/** Account status (`'suspended'` triggers auto-sign-out). */
	status?: 'active' | 'suspended';
	/** YYYY-MM-DD string or Firestore Timestamp. */
	lastActivityDate?: string | FirestoreTimestamp;
	/** Vanguard Armory sub-document written by ArmoryEngine. */
	armory?: {
		totalXP?: number;
		stats?: Partial<Record<string, string>>;
		xpHistory?: XpHistoryEntry[];
		/** ISO-8601 date of the most recent XP-earning event (set server-side). */
		lastActiveUtc?: string;
		/** Rolling decay diagnostics — written by enforceLossAvoidance Cloud Function. */
		decayState?: DecayStateDoc;
		/** Weekly streak freeze entitlement. */
		streakFreeze?: StreakFreezeDoc;
	};
}

// ── Invite ────────────────────────────────────────────────────────────────

/**
 * `invites/{inviteId}` — a time-limited join code.
 *
 * Flow:
 *   1. Coach / director calls `generateInviteCode(role, tenantId, teamId?, usageLimit?)`.
 *      → Writes this document with status = 'pending'.
 *   2. Recipient enters the 6-char code in the app.
 *      → `consumeInviteCode(code)` delegates to the server CF.
 *   3. CF atomically validates expiry, increments currentUsage, writes user
 *      doc (triggering syncUserClaims), and sets JWT custom claims.
 *
 * Multi-use codes:
 *   Set `usageLimit > 1` to create a code that multiple operatives can share
 *   (e.g. a coach sharing one code with a whole squad).
 *   `currentUsage` increments per redemption; `status` flips to 'consumed'
 *   once `currentUsage >= usageLimit`.
 *
 * Idempotency:
 *   `consumedByUids[]` tracks which UIDs have already redeemed.
 *   Same user retrying is safe; counter is NOT incremented again.
 *
 * Firestore index required: code (ASC) — single-field (auto-created).
 */
export interface InviteDoc {
	/** Firestore document ID (auto-generated). */
	id?: string;
	/** 6-character alphanumeric code (uppercase, no ambiguous chars). */
	code: string;
	/** Canonical tenant ID. */
	tenantId: string;
	/** Legacy alias = tenantId (for backward-compat with older rules). */
	clubId: string;
	/** Optional target team. */
	teamId?: string;
	/** Role that will be assigned to the consumer. */
	targetRole: TenantRole;
	/** Email (or UID) of the coach / director who generated this code. */
	createdBy: string;
	/** Hard expiry (default: 48 h after creation). */
	expiresAt: Date | FirestoreTimestamp;
	/** Maximum number of times this code can be redeemed. Default: 1. */
	usageLimit: number;
	/**
	 * Current redemption count.  Starts at 0; atomically incremented per
	 * unique user inside the `consumeInviteCode` Cloud Function transaction.
	 * Field name: `usageCount` (matches the directive spec).
	 */
	usageCount: number;
	/** Array of UIDs that have already redeemed — used for idempotency. */
	consumedByUids: string[];
	status: 'pending' | 'consumed' | 'expired';
	createdAt?: FirestoreTimestamp;
}

// ── Active Mission ─────────────────────────────────────────────────────────

/**
 * `active_missions/{missionId}` — a drill assignment pushed by a coach.
 *
 * Written by CommandCenter.svelte; read by ProvingGrounds.svelte when the
 * athlete opens their terminal (future Epic 3.3 — Mission Log).
 */
export interface ActiveMissionDoc {
	id?: string;
	drillId: string;
	drillLabel: string;
	drillStatKey: string;
	coachId: string;
	/** Foreign key → `clubs/{clubId}`. */
	tenantId: string;
	clubId: string;
	teamId?: string;
	/** 'all' | 'position' | 'specific' */
	targetMode: string;
	/** Array of user email-keys. */
	targetPlayerIds: string[];
	deadline: Date | FirestoreTimestamp;
	status: 'active' | 'completed' | 'expired';
	createdAt?: FirestoreTimestamp;
}

// ── JWT Custom Claims ──────────────────────────────────────────────────────

/**
 * VanguardClaims — the canonical shape of Firebase Auth JWT custom claims
 * for the Nexus Command platform.
 *
 * Written ONLY by server-side Cloud Functions:
 *   • `syncUserClaims`    — Firestore trigger on users/{emailKey}
 *   • `consumeInviteCode` — explicit setCustomUserClaims after transaction
 *
 * NEVER written from the client.  The frontend reads these via:
 *   `user.getIdTokenResult().then(r => r.claims as VanguardClaims)`
 *
 * Claim names:
 *   `tenantId`  — canonical identifier (new rules should check this)
 *   `clubId`    — legacy alias (= tenantId) kept for backward compat with
 *                 existing Firestore security rules and `licenseEntitlement.svelte.js`
 *
 * Absent vs. empty string:
 *   A MISSING `tenantId` means the user has not joined any org yet.
 *   An EMPTY STRING would also indicate no org, but the revocation path in
 *   `syncUserClaims` deletes the key entirely rather than setting it to ''.
 */
export interface VanguardClaims {
	/** Canonical tenant identifier. Present iff the user belongs to a club. */
	tenantId?: string;
	/** Legacy alias = tenantId.  Kept for backward-compat with existing rules. */
	clubId?: string;
	/** Role at the token level — always synced with Firestore by syncUserClaims. */
	role?: TenantRole;
	/** Team scope for coaches and players. */
	teamId?: string;
	/** True for platform-level operators (cross-tenant access). */
	isGlobalAdmin?: boolean;
	isSuperAdmin?: boolean;
}

/**
 * @deprecated Use `VanguardClaims` — this alias is kept for backward compat.
 */
export type TenantClaims = VanguardClaims;

// ── League Management (Task 4.3) ───────────────────────────────────────────
//
// SCHEMA HARDENING RULE: every document in any new collection MUST contain a
// `tenantId` field at the root level.  This enables the Zero-Trust Firestore
// security rule pattern:
//   allow read, write: if request.auth.token.tenantId == resource.data.tenantId;
//
// `clubId` is included as a backward-compat alias for rules written before the
// `tenantId` canonical name was established.

/**
 * `seasons/{seasonId}` — a competitive season for a club.
 *
 * Scope: one club can have multiple seasons; queries MUST filter by tenantId.
 *
 * Example:
 *   { tenantId: 'aggies-fc', clubId: 'aggies-fc', name: '2025-2026', status: 'active' }
 */
export interface SeasonDoc {
	/** Firestore document ID. */
	id?: string;
	/** REQUIRED — tenant isolation key. */
	tenantId: string;
	/** Backward-compat alias = tenantId. */
	clubId: string;
	/** Human-readable label (e.g. "2025-2026"). */
	name: string;
	startDate: Date | FirestoreTimestamp;
	endDate: Date | FirestoreTimestamp;
	status: 'upcoming' | 'active' | 'archived';
	/** IDs of teams participating in this season. */
	teamIds?: string[];
	createdAt?: FirestoreTimestamp;
}

/**
 * `fixtures/{fixtureId}` — a scheduled or completed match.
 *
 * Scope: filtered by tenantId + optionally seasonId or teamId.
 * Result sub-doc is written after the match completes.
 */
export interface FixtureDoc {
	id?: string;
	/** REQUIRED — tenant isolation key. */
	tenantId: string;
	clubId: string;
	/** Parent season. */
	seasonId?: string;
	/** Our team's ID. */
	teamId: string;
	/** The opponent (ref to opponents/{opponentId} or inline). */
	opponentId?: string;
	opponentName: string;
	scheduledAt: Date | FirestoreTimestamp;
	/** Location label (e.g. "Home — Lakeside Park"). */
	location?: string;
	isHome: boolean;
	result?: {
		ourScore: number;
		theirScore: number;
		outcome: 'W' | 'L' | 'D';
	};
	status: 'scheduled' | 'completed' | 'cancelled' | 'postponed';
	/** Notes from coaching staff post-match. */
	coachNotes?: string;
	createdAt?: FirestoreTimestamp;
}

/**
 * `opponents/{opponentId}` — an opponent club or team for tracking.
 *
 * Scope: per-tenant opponent database for scouting / history.
 * `record` is denormalized from fixtures for quick display.
 */
export interface OpponentDoc {
	id?: string;
	/** REQUIRED — tenant isolation key. */
	tenantId: string;
	clubId: string;
	/** Club / team display name (e.g. "Riverside FC"). */
	name: string;
	shortName?: string;
	logoUrl?: string;
	primaryColor?: string;
	/** Home venue label. */
	venue?: string;
	/** Coach's scouting notes. */
	notes?: string;
	/** Aggregate head-to-head record (denormalized). */
	record?: {
		wins: number;
		losses: number;
		draws: number;
	};
	createdAt?: FirestoreTimestamp;
}

// ── Utility types ──────────────────────────────────────────────────────────

/** Firestore Timestamp duck-type (avoids importing the full firebase package). */
export interface FirestoreTimestamp {
	toDate(): Date;
	seconds: number;
	nanoseconds: number;
}

/** XP history entry (mirrors ArmoryEngine.svelte.ts). */
export interface XpHistoryEntry {
	date: string;
	amount: number;
	reason: string;
	runningTotal: number;
}

// ── Epic 5: Loss Avoidance types ───────────────────────────────────────────

/**
 * Decay diagnostics stored under `users/{uid}.armory.decayState`.
 * Written exclusively by `enforceLossAvoidance` Cloud Function.
 * Never written from the client — read-only on the frontend.
 */
export interface DecayStateDoc {
	/** ISO-8601 date of the last decay sweep that touched this player. */
	lastDecayRunUtc: string;
	/** Consecutive idle days at the time of last decay run. */
	idleDays: number;
	/** Cumulative XP drained across all decay events. */
	totalDecayedXp: number;
	/** Fraction drained in the last run (0-1). */
	lastDecayPct: number;
}

/**
 * Weekly streak-freeze entitlement stored under `users/{uid}.armory.streakFreeze`.
 * `available` is decremented when the player (or the decay job) consumes a freeze.
 * Replenished to `streak_freeze_per_week` at ISO week rollover.
 */
export interface StreakFreezeDoc {
	/** Freezes remaining this ISO week. */
	available: number;
	/** ISO week key (e.g. "2026-W19") — used to detect rollover and replenish. */
	weekKey: string;
	/** ISO-8601 timestamp of the last time a freeze was consumed. */
	consumedAt?: string;
}

/**
 * `reengagement_alerts/{uid}_{YYYYMMDD}` — one immutable event record per
 * player per calendar day.  The client HUD subscribes and acknowledges;
 * `dispatchReengagementAlerts` sets `sentAt`; the player tapping the HUD sets
 * `acknowledgedAt`.
 */
export interface ReengagementAlertDoc {
	/** Firebase Auth UID of the player this alert targets. */
	uid: string;
	/** Email-key of the player (document ID in `users`). */
	userKey: string;
	/** Tenant partition key. */
	clubId: string;
	/** Alert category. */
	kind: 'streak_warning' | 'streak_lost' | 'decay_started';
	/**
	 * Urgency level 1-3 — escalates each day the player remains inactive.
	 * Controls push notification copy and HUD colour.
	 */
	severity: 1 | 2 | 3;
	/** ISO-8601 timestamp the alert was scheduled for dispatch. */
	scheduledFor: string;
	/** ISO-8601 timestamp set by dispatch function after FCM delivery. */
	sentAt?: string;
	/** ISO-8601 timestamp set by the client when the HUD renders the alert. */
	acknowledgedAt?: string;
	/** Number of idle days at alert creation (for notification copy). */
	idleDays: number;
	/** XP lost so far (for notification copy). */
	decayedXp: number;
	createdAt?: FirestoreTimestamp;
}
