/**
 * intent.ts
 * ─────────
 * Phase 3, Epic 8 — Intent-Based Homework Triggers
 *
 * TypeScript types for the coach intent / homework-trigger pipeline:
 *   • team_assignments/{intentId} document shape (extended schema v1)
 *   • Callable I/O for secureDeployIntent / secureCancelIntent / secureExtendIntent
 *   • Lifecycle event types (fulfilment, expiry)
 *   • Lazy-migration defaults (read-repair: any missing field resolves to these)
 *
 * No PII stored beyond Firebase Auth UID. tenantId + clubId are always required
 * for strict cross-tenant isolation (per .cursorrules §2).
 */

import type { FirestoreTimestamp } from '$lib/types/tenant.js';

type AnyTimestamp = FirestoreTimestamp | Date | string | null;

// ── Enumerations ──────────────────────────────────────────────────────────────

/**
 * Whether this intent targets the whole team roster or a specific player subset.
 * Read-repair default: 'team' (backwards-compatible with pre-Epic-8 documents).
 */
export type IntentScope = 'team' | 'players';

/**
 * Lifecycle state of a team_assignment intent document.
 * Read-repair default: 'active'.
 */
export type IntentStatus = 'active' | 'fulfilled' | 'expired' | 'cancelled';

/**
 * One drill entry inside a bundle prescription (B3 multi-drill bundles).
 * Mirrors top-level IntentPrescription fields except no `cadence` or nested `drills`.
 */
export interface PrescriptionDrillEntry {
	/** teams/{teamId}/drills/{id} when referencing team library drill */
	teamDrillId?: string;
	/** clubs/{clubId}/shared_drills/{id} when referencing club-wide drill */
	clubDrillId?: string;
	/** @deprecated RL catalog only — prefer teamDrillId */
	drillId?: string;
	drillTitle?: string;
	/** Required: integer 1–99 */
	sets: number;
	repsPerSet?: number;
	bilateral?: boolean;
	targetDurationMin?: number;
	targetRpe?: number;
	videoUrl?: string;
	cues?: string;
}

/**
 * Optional coach drill prescription on team_assignments (PRESCRIPTION-schema).
 * Omit `repsPerSet` for time-only homework. `bilateral` doubles rep count for XP math.
 */
export interface IntentPrescription {
	/** teams/{teamId}/drills/{id} when coach assigns team library drill */
	teamDrillId?: string;
	/** clubs/{clubId}/shared_drills/{id} when director publishes club-wide */
	clubDrillId?: string;
	/** @deprecated RL catalog only — prefer teamDrillId for coach assigns */
	drillId?: string;
	drillTitle?: string;
	/** Read-repair default: 1 */
	sets: number;
	/** Omit = time-only homework (no rep-based XP multiplier from prescription). */
	repsPerSet?: number;
	/** Read-repair default: false — repsPerSet applies per side (hand/foot). */
	bilateral: boolean;
	targetDurationMin?: number;
	/** Coach target RPE 1–10 */
	targetRpe?: number;
	/** Demo video URL from the drill library — shown on the player's Train page. */
	videoUrl?: string;
	/** Coaching cues / description from the drill library — shown on the player's Train page. */
	cues?: string;
	/**
	 * Optional per-assignment cadence: X sessions per rolling window.
	 * Absent = one-shot intent (unchanged behaviour).
	 * sessionsPerWindow: 1–21; windowDays: 1–30.
	 */
	cadence?: { sessionsPerWindow: number; windowDays: number };
	/**
	 * B3 multi-drill bundle: ordered array of mini-prescriptions (1–8 entries).
	 * When present and non-empty, the assignment is a BUNDLE and the player runs
	 * drills in sequence. Top-level drill reference fields (drillId, drillTitle, etc.)
	 * are superseded by the per-entry fields. Top-level `targetDurationMin`,
	 * `targetRpe`, and `cadence` still apply to the bundle session as a whole.
	 * One-shot behaviour (no `drills`) is 100% unchanged.
	 */
	drills?: PrescriptionDrillEntry[];
	/**
	 * B4a — coach opt-in (per intent). When true, players see an optional
	 * "Send proof to your parent" affordance after logging the session.
	 * Verification is ADVISORY: XP/fulfillment is awarded immediately regardless.
	 * Absent (undefined) = off. Coerced to strict boolean on read-repair.
	 */
	requiresParentVerification?: boolean;
}

// ── Core document ─────────────────────────────────────────────────────────────

/**
 * Firestore document at `team_assignments/{intentId}`.
 *
 * All fields added in Epic 8 are marked with @since 1.
 * When reading a pre-v1 document, apply INTENT_MIGRATION_DEFAULTS to patch
 * missing fields in memory before rendering or using in logic — then issue a
 * non-blocking `setDoc(..., { merge: true })` to persist the repair.
 */
export interface IntentDoc {
  // ── Original fields (schema v0, backwards-compatible) ────────────────────
  teamId: string;
  assignedByUid: string;
  targetAttributeId: string;
  requiredXp: number;
  expiresAt: AnyTimestamp;
  createdAt: AnyTimestamp;

  // ── Epic 8 additions (schema v1) ─────────────────────────────────────────

  /** @since 1 Firestore document ID — stored as denormalised field for query convenience. */
  intentId?: string;

  /**
   * @since 1
   * 'team' = applies to every player on the team.
   * 'players' = applies only to uids listed in targetUids.
   * Read-repair default: 'team'.
   */
  scope: IntentScope;

  /**
   * @since 1
   * UID list when scope === 'players'. Empty array when scope === 'team'.
   * Read-repair default: [].
   */
  targetUids: string[];

  /**
   * @since 1
   * Coach-tunable priority. Lower numbers = higher priority surfaced first to
   * the RL feature builder and player queue. Read-repair default: 100.
   */
  priority: number;

  /**
   * @since 1
   * Lifecycle status. Read-repair default: 'active'.
   */
  status: IntentStatus;

  /**
   * @since 1
   * UIDs of players who have crossed requiredXp for targetAttributeId.
   * Appended by the onUserXpUpdate trigger. Read-repair default: [].
   */
  fulfilledByUids: string[];

  /**
   * @since 1
   * Schema version stamp. Absent on pre-v1 documents; read-repair writes 1.
   */
  intentVersion: 1;

  /**
   * @since 1 Required for strict tenant isolation.
   * Must equal the caller's Firebase Auth custom claim `tenantId`.
   */
  tenantId: string;

  /** @since 1 Club identifier for row-level security. */
  clubId: string;

  /** @since 1 UID of the coach who last cancelled or extended this intent. */
  lastModifiedByUid?: string;
  /** @since 1 Timestamp of the most recent status mutation. */
  updatedAt?: AnyTimestamp;

  /**
   * @since 1 (PRESCRIPTION-schema)
   * Optional structured drill prescription from coach deploy.
   * Absent on legacy intents; use repairIntentPrescription on read.
   */
  prescription?: IntentPrescription;
}

/**
 * In-memory defaults applied during lazy read-repair of pre-v1 documents.
 * Never write these to the DB without a real value available; they are
 * conservative safe-defaults only.
 */
export const INTENT_MIGRATION_DEFAULTS: Partial<IntentDoc> = {
  scope: 'team',
  targetUids: [],
  priority: 100,
  status: 'active',
  fulfilledByUids: [],
  intentVersion: 1,
};

/**
 * Repair a single bundle drill entry (B3). Same per-field guards as the
 * top-level prescription — sets required int 1–99; other fields optional.
 * Returns undefined when `raw` is null/non-object (entry is silently dropped
 * on the client; server throws instead).
 */
export function repairDrillEntry(raw: unknown): PrescriptionDrillEntry | undefined {
	if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
	const p = raw as Record<string, unknown>;
	const sets =
		typeof p.sets === 'number' && Number.isFinite(p.sets) && p.sets >= 1
			? Math.floor(p.sets)
			: 1;
	const entry: PrescriptionDrillEntry = { sets };
	if (typeof p.teamDrillId === 'string' && p.teamDrillId.trim()) {
		entry.teamDrillId = p.teamDrillId.trim();
	}
	if (typeof p.clubDrillId === 'string' && p.clubDrillId.trim()) {
		entry.clubDrillId = p.clubDrillId.trim();
	}
	if (typeof p.drillId === 'string' && p.drillId.trim()) {
		entry.drillId = p.drillId.trim();
	}
	if (typeof p.drillTitle === 'string' && p.drillTitle.trim()) {
		entry.drillTitle = p.drillTitle.trim();
	}
	if (typeof p.repsPerSet === 'number' && Number.isFinite(p.repsPerSet) && p.repsPerSet >= 1) {
		entry.repsPerSet = Math.floor(p.repsPerSet);
	}
	if (p.bilateral === true) entry.bilateral = true;
	if (
		typeof p.targetDurationMin === 'number' &&
		Number.isFinite(p.targetDurationMin) &&
		p.targetDurationMin >= 1
	) {
		entry.targetDurationMin = Math.floor(p.targetDurationMin);
	}
	if (
		typeof p.targetRpe === 'number' &&
		Number.isFinite(p.targetRpe) &&
		p.targetRpe >= 1 &&
		p.targetRpe <= 10
	) {
		entry.targetRpe = Math.round(p.targetRpe);
	}
	if (typeof p.videoUrl === 'string' && p.videoUrl.trim()) {
		entry.videoUrl = p.videoUrl.trim();
	}
	if (typeof p.cues === 'string' && p.cues.trim()) {
		entry.cues = p.cues.trim();
	}
	return entry;
}

/**
 * Lazy read-repair for optional prescription sub-object (no Firestore backfill).
 */
export function repairIntentPrescription(raw: unknown): IntentPrescription | undefined {
	if (raw == null || typeof raw !== 'object') return undefined;
	const p = raw as Record<string, unknown>;
	const sets =
		typeof p.sets === 'number' && Number.isFinite(p.sets) && p.sets >= 1
			? Math.floor(p.sets)
			: 1;
	const repaired: IntentPrescription = {
		sets,
		bilateral: p.bilateral === true,
	};
	if (typeof p.teamDrillId === 'string' && p.teamDrillId.trim()) {
		repaired.teamDrillId = p.teamDrillId.trim();
	}
	if (typeof p.clubDrillId === 'string' && p.clubDrillId.trim()) {
		repaired.clubDrillId = p.clubDrillId.trim();
	}
	if (typeof p.drillId === 'string' && p.drillId.trim()) {
		repaired.drillId = p.drillId.trim();
	}
	if (typeof p.drillTitle === 'string' && p.drillTitle.trim()) {
		repaired.drillTitle = p.drillTitle.trim();
	}
	if (typeof p.repsPerSet === 'number' && Number.isFinite(p.repsPerSet) && p.repsPerSet >= 1) {
		repaired.repsPerSet = Math.floor(p.repsPerSet);
	}
	if (
		typeof p.targetDurationMin === 'number' &&
		Number.isFinite(p.targetDurationMin) &&
		p.targetDurationMin >= 1
	) {
		repaired.targetDurationMin = Math.floor(p.targetDurationMin);
	}
	if (
		typeof p.targetRpe === 'number' &&
		Number.isFinite(p.targetRpe) &&
		p.targetRpe >= 1 &&
		p.targetRpe <= 10
	) {
		repaired.targetRpe = Math.round(p.targetRpe);
	}
	if (typeof p.videoUrl === 'string' && p.videoUrl.trim()) {
		repaired.videoUrl = p.videoUrl.trim();
	}
	if (typeof p.cues === 'string' && p.cues.trim()) {
		repaired.cues = p.cues.trim();
	}
	if (p.cadence != null && typeof p.cadence === 'object' && !Array.isArray(p.cadence)) {
		const c = p.cadence as Record<string, unknown>;
		const spw =
			typeof c.sessionsPerWindow === 'number' && Number.isFinite(c.sessionsPerWindow)
				? Math.floor(c.sessionsPerWindow)
				: 0;
		const wd =
			typeof c.windowDays === 'number' && Number.isFinite(c.windowDays)
				? Math.floor(c.windowDays)
				: 0;
		if (spw >= 1 && spw <= 21 && wd >= 1 && wd <= 30) {
			repaired.cadence = { sessionsPerWindow: spw, windowDays: wd };
		}
	}
	// B3: repair drills[] — each entry repaired with the same per-field guards.
	// Silently drops null/invalid entries; caps at 8; omits field when empty.
	if (Array.isArray(p.drills)) {
		const repairedDrills: PrescriptionDrillEntry[] = p.drills
			.map(repairDrillEntry)
			.filter((e): e is PrescriptionDrillEntry => e !== undefined)
			.slice(0, 8);
		if (repairedDrills.length > 0) {
			repaired.drills = repairedDrills;
		}
	}
	// B4a: coerce requiresParentVerification to strict boolean; omit when falsy.
	if (p.requiresParentVerification === true) {
		repaired.requiresParentVerification = true;
	}
	return repaired;
}

/**
 * Effective rep count for XP math: sets × repsPerSet × (bilateral ? 2 : 1).
 * Returns 0 when repsPerSet is omitted (time-only prescription).
 */
export function effectivePrescriptionReps(prescription: IntentPrescription | undefined): number {
	if (!prescription?.repsPerSet || prescription.repsPerSet < 1) return 0;
	const sideMultiplier = prescription.bilateral ? 2 : 1;
	return prescription.sets * prescription.repsPerSet * sideMultiplier;
}

// ── Callable I/O ──────────────────────────────────────────────────────────────

export interface DeployIntentInput {
  teamId: string;
  tenantId: string;
  clubId: string;
  targetAttributeId: string;
  requiredXp: number;
  /** Days until the intent expires (1–90). */
  durationDays: number;
  scope: IntentScope;
  /** Required when scope === 'players'. Must be non-empty. */
  targetUids?: string[];
  /** Optional priority override. Defaults to 100. */
  priority?: number;
  /** Optional structured drill prescription (validated server-side on deploy). */
  prescription?: IntentPrescription;
}

export interface DeployIntentResult {
  intentId: string;
  status: 'active';
  expiresAt: string;
  targetCount: number;
}

export interface CancelIntentInput {
  intentId: string;
  teamId: string;
  tenantId: string;
}

export interface CancelIntentResult {
  intentId: string;
  status: 'cancelled';
}

export interface ExtendIntentInput {
  intentId: string;
  teamId: string;
  tenantId: string;
  /** Additional days to add to the current expiresAt. */
  additionalDays: number;
}

export interface ExtendIntentResult {
  intentId: string;
  newExpiresAt: string;
}

// ── Lifecycle event payloads (used by onUserXpUpdate trigger) ─────────────────

export interface IntentFulfilmentEvent {
  intentId: string;
  teamId: string;
  tenantId: string;
  fulfilledByUid: string;
  targetAttributeId: string;
  xpReached: number;
  requiredXp: number;
  /** True when ALL targeted players have fulfilled the intent. */
  intentCompleted: boolean;
  fulfilledAt: AnyTimestamp;
}

// ── Client-side enriched view model ──────────────────────────────────────────

/** Enriched player row used in the IntentArena fulfilment heat-map. */
export interface IntentRosterRow {
  uid: string;
  playerName: string;
  email: string;
  currentXp: number;
  progressPct: number;
  fulfilled: boolean;
}

/** Full enriched intent used by IntentEngine.svelte.ts $derived views. */
export interface EnrichedIntent extends IntentDoc {
  intentId: string;
  attributeName: string;
  attributeHexColor: string;
  rosterRows: IntentRosterRow[];
  fulfilledCount: number;
  targetCount: number;
  overallProgressPct: number;
  daysRemaining: number;
  isExpired: boolean;
}
