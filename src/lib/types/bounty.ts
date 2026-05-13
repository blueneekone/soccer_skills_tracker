/**
 * bounty.ts
 * ──────────
 * Canonical TypeScript interfaces for the Parent Co-Op & Automated Escrow
 * Bounty system (Phase 3, Epic 5.4).
 *
 * Architecture:
 *   - Parents fund real-world rewards via Tremendous (pay-as-you-go bank link).
 *   - Bounties encode OBJECTIVE, deterministic completion criteria only — no
 *     human sign-off required.  The server evaluates criteria via Cloud Function
 *     triggers on existing telemetry collections.
 *   - No money moves at creation.  The Tremendous order is placed only when the
 *     CF verifies completion (issueBountyReward).
 *
 * Tenant isolation:
 *   Every document MUST carry `tenantId` + `householdId` so Firestore rules
 *   can scope reads without cross-tenant leakage.
 *
 * Firestore collection map:
 *   bounties/{bountyId}
 *   bounty_completions/{bountyId}
 *   bounty_audit/{auditId}
 *   households/{householdId}.coOp.tremendous  ← embedded sub-map
 *   users/{uid}/telemetry_boosts/{boostId}
 */

import type { FirestoreTimestamp } from './tenant';

// ── Criterion variants ────────────────────────────────────────────────────────

/**
 * A player must log this many total reps (across any drills) within the
 * bounty window.  Evaluated on every `reps` document creation by the
 * bountyVerification Cloud Function.
 */
export interface RepsCountCriterion {
	type: 'reps_count';
	/** Total reps required (e.g. 500). */
	targetReps: number;
	/** Optional: only count reps from drills matching this name fragment. */
	drillNameFilter?: string;
}

/**
 * Player must accumulate this many kilojoules of training volume (sum of
 * intense_minutes * metabolic coefficient) across the window.
 */
export interface WorkoutVolumeKjCriterion {
	type: 'workout_volume_kj';
	targetKj: number;
}

/**
 * Player must unlock/master a named skill-tree node.
 * Evaluated on `users/{uid}/skill_tree_nodes/{nodeId}` write.
 */
export interface MasteryNodeUnlockCriterion {
	type: 'mastery_node_unlock';
	/** Firestore document ID of the skill-tree node. */
	nodeId: string;
	/** Human label shown in the UI (denormalized). */
	nodeLabel: string;
	/** Required status: 'unlocked' | 'mastered'. Default 'unlocked'. */
	requiredStatus?: 'unlocked' | 'mastered';
}

/**
 * Player must maintain a training streak for at least this many consecutive
 * days.  Evaluated after `resolveStreak` updates `player_stats`.
 */
export interface StreakLengthCriterion {
	type: 'streak_length';
	targetDays: number;
}

/**
 * Player's current GPA (from `academic_records`) must reach this threshold.
 * Evaluated on `users/{uid}/academic_records` write.
 */
export interface GpaThresholdCriterion {
	type: 'gpa_threshold';
	minimumGpa: number;
}

/**
 * Computer-vision verified drill completion.
 * Schema slot only in v1 — completion path is deferred behind
 * `feature_cv_bounty_enabled` Remote Config flag.
 *
 * Future sub-epic: client captures video → Cloud Storage → CF MediaPipe
 * inference → emits `cv_drill_verifications/{id}` → bountyVerification handler.
 */
export interface CvVerifiedDrillCriterion {
	type: 'cv_verified_drill';
	/** Drill slug or ID the CV model will match against. */
	drillSlug: string;
	/** Minimum confidence score (0-1) required to accept completion. */
	minConfidence: number;
	/** Number of successful reps required. */
	requiredReps: number;
}

/**
 * Discriminated union of all supported criterion variants.
 * Add new variants here; the server-side handler registry in
 * `functions/bountyVerification.js` maps `type` → handler function.
 */
export type BountyCriterion =
	| RepsCountCriterion
	| WorkoutVolumeKjCriterion
	| MasteryNodeUnlockCriterion
	| StreakLengthCriterion
	| GpaThresholdCriterion
	| CvVerifiedDrillCriterion;

// ── Bounty lifecycle ──────────────────────────────────────────────────────────

/**
 * Bounty status lifecycle:
 *
 *   draft → active → verified → paid
 *                  ↘ voided
 *   active → expired (nightly sweep)
 *   active → voided  (parent cancels)
 */
export type BountyStatus =
	| 'draft'
	| 'active'
	| 'verified'
	| 'paid'
	| 'expired'
	| 'voided'
	| 'failed';

// ── Primary document ──────────────────────────────────────────────────────────

/**
 * `bounties/{bountyId}` — the primary escrow record.
 *
 * Written by `createBountyEscrow` callable (CF only).
 * Read by parent (household-scoped) and player (email-scoped) via Firestore rules.
 * Never written from the client.
 */
export interface BountyDoc {
	/** Firestore document ID (auto-generated). */
	id?: string;

	// ── Tenant / household isolation (required for Firestore rules) ──────────
	/** REQUIRED — tenant partition key (= clubId). */
	tenantId: string;
	/** Legacy alias = tenantId. */
	clubId: string;
	/** Household document ID — scopes read access to the parent. */
	householdId: string;

	// ── Principals ───────────────────────────────────────────────────────────
	/** Lowercase email of the parent who created the bounty. */
	parentEmail: string;
	/** Lowercase email-key of the child player who must complete the goal. */
	playerEmail: string;

	// ── Reward definition ────────────────────────────────────────────────────
	/** Human-readable bounty title (e.g. "500 reps this week!"). */
	title: string;
	/** Optional longer description shown to the child. */
	description?: string;
	/** Objective completion criterion — drives the server-side handler. */
	criterion: BountyCriterion;
	/** Reward amount in the smallest currency unit (cents for USD). */
	rewardCents: number;
	/** ISO 4217 currency code (default 'USD'). */
	currency: string;

	// ── Lifecycle ────────────────────────────────────────────────────────────
	status: BountyStatus;
	/** ISO-8601 timestamp when the bounty goes live (default: createdAt). */
	startsAt?: string;
	/** ISO-8601 timestamp after which the bounty expires if uncompleted. */
	expiresAt: string;

	// ── Tremendous integration ───────────────────────────────────────────────
	/** Tremendous funding source ID linked to the household. */
	fundingSourceId?: string;
	/** Tremendous order ID — populated by `issueBountyReward`. */
	tremendousOrderId?: string;
	/** Tremendous recipient ID — populated by `issueBountyReward`. */
	tremendousRecipientId?: string;

	// ── Progress tracking (denormalized for client display) ──────────────────
	/** Current progress value (e.g. reps logged so far). */
	progressCurrent?: number;
	/** Target value matching the criterion (denormalized for display). */
	progressTarget?: number;
	/** Progress unit label (e.g. "reps", "days", "KJ"). */
	progressUnit?: string;

	// ── Audit ────────────────────────────────────────────────────────────────
	createdAt?: FirestoreTimestamp;
	verifiedAt?: string;
	paidAt?: string;
	voidedAt?: string;
	voidedBy?: string;
	/** ISO-8601 timestamp of the last progress update. */
	lastProgressUpdateAt?: string;
}

// ── Completion record ─────────────────────────────────────────────────────────

/**
 * `bounty_completions/{bountyId}` — immutable verification record.
 * Written by the bountyVerification CF when criteria are satisfied.
 * Doc ID = bountyId for easy join.
 */
export interface BountyCompletionDoc {
	bountyId: string;
	householdId: string;
	tenantId: string;
	parentEmail: string;
	playerEmail: string;
	criterionType: BountyCriterion['type'];
	/** Final measured value that satisfied the criterion. */
	finalValue: number;
	/** ISO-8601 timestamp when criteria were detected as satisfied. */
	verifiedAt: string;
	/** Firestore document ID / collection that triggered verification. */
	triggerSource: string;
	createdAt?: FirestoreTimestamp;
}

// ── Audit trail ───────────────────────────────────────────────────────────────

/**
 * `bounty_audit/{auditId}` — immutable event per status transition.
 * Provides the COPPA / zero-liability paper trail for all money-adjacent events.
 */
export interface BountyAuditDoc {
	bountyId: string;
	householdId: string;
	tenantId: string;
	fromStatus: BountyStatus | null;
	toStatus: BountyStatus;
	/** Machine actor (e.g. 'bountyVerification', 'tremendousWebhook'). */
	actor: string;
	/** Human-readable transition reason. */
	reason?: string;
	/** Tremendous event type from webhook (if applicable). */
	tremendousEvent?: string;
	occurredAt: string;
	createdAt?: FirestoreTimestamp;
}

// ── Tremendous funding source ─────────────────────────────────────────────────

/**
 * Stored under `households/{householdId}.coOp.tremendous` as an embedded
 * sub-map (not a separate collection) to keep household reads atomic.
 */
export interface TremendousFundingSourceDoc {
	/** Tremendous funding source ID (e.g. "FUNDINGSOURCE_XXXX"). */
	fundingSourceId: string;
	/** Human-readable label returned by Tremendous (e.g. "Chase Checking ••4321"). */
	label?: string;
	/** Method type returned by Tremendous (e.g. "ACH", "CREDIT_CARD"). */
	method?: string;
	/** ISO-8601 timestamp when the parent linked this source. */
	linkedAt: string;
	/** Email of the parent who linked (for audit). */
	linkedByEmail: string;
}

// ── Telemetry boost ───────────────────────────────────────────────────────────

/**
 * `users/{playerEmail}/telemetry_boosts/{boostId}`
 *
 * A time-bounded XP multiplier sponsored by a parent via the Co-Op console.
 * V1 boosts are free (engagement lever only); the XP grant transaction reads
 * active boost docs and applies the highest multiplier to the earned XP.
 */
export interface TelemetryBoostDoc {
	/** Firestore document ID (auto-generated). */
	id?: string;
	/** Email-key of the player receiving the boost. */
	playerEmail: string;
	/** Household ID for audit / access control. */
	householdId: string;
	/** Lowercase email of the parent who activated the boost. */
	sponsoredByParentEmail: string;
	/**
	 * Multiplier applied to all XP earned during the window.
	 * E.g. 1.5 = 50 % bonus.  Capped at 3.0 server-side.
	 */
	multiplier: number;
	/** ISO-8601 timestamp when the boost expires. */
	expiresAt: string;
	/** ISO-8601 timestamp when the boost was activated. */
	activatedAt: string;
	/** Human label shown in the UI (e.g. "2× for 30 min"). */
	label: string;
	createdAt?: FirestoreTimestamp;
}

// ── Preset boost options (shared between client and Cloud Function) ────────────

export interface BoostPreset {
	/** Stable ID used as key (e.g. "1_5x_60m"). */
	id: string;
	/** Display label. */
	label: string;
	multiplier: number;
	/** Window in minutes. */
	windowMinutes: number;
}

export const BOOST_PRESETS: readonly BoostPreset[] = [
	{ id: '1_5x_60m', label: '1.5× for 60 min', multiplier: 1.5, windowMinutes: 60 },
	{ id: '2x_30m',   label: '2× for 30 min',   multiplier: 2.0, windowMinutes: 30 },
	{ id: '3x_15m',   label: '3× for 15 min',   multiplier: 3.0, windowMinutes: 15 },
] as const;

/** Server-enforced maximum multiplier value (prevents manipulation). */
export const MAX_BOOST_MULTIPLIER = 3.0;
