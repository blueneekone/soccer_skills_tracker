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
