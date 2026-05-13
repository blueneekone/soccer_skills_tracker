/**
 * trajectory.ts
 * ──────────────
 * Phase 3, Epic 6 — Vertical Comparison & Trajectory Tracking
 *
 * Shared type contracts for Time-Lapse Memory Capsules and the Growth
 * Velocity Index.  Imported by:
 *   • src/lib/states/TrajectoryEngine.svelte.ts  (Brain)
 *   • src/lib/components/player/trajectory/*.svelte  (Glass + HUD)
 *
 * Firestore paths:
 *   users/{email}/memory_capsules/{capsuleId}
 *   users/{email}/trajectory_months/{YYYY-MM}
 *   users/{email}.trajectory  (map field — aggregated GVI + month counters)
 */

import type { FirestoreTimestamp } from '$lib/types/tenant.js';

// ── Scout's Six snapshot ──────────────────────────────────────────────────────

/**
 * A point-in-time snapshot of the Scout's Six athletic metrics.
 * All values are strings (units vary: mph, seconds, levels, inches).
 */
export interface ScoutsSixSnapshot {
	PAC: string;
	ACC: string;
	AGI: string;
	STM: string;
	POW: string;
	VAN: string;
}

// ── Capsule snapshot ──────────────────────────────────────────────────────────

/**
 * A single telemetry snapshot stored inside a Memory Capsule.
 * Represents the player's state at a specific calendar date.
 */
export interface CapsuleSnapshot {
	/** Accumulated XP at capture time. */
	totalXp: number;
	/** Training level at capture time. */
	level: number;
	/** Active streak days at capture time. */
	streakDays: number;
	/** Scout's Six at capture time. */
	scoutsSix: ScoutsSixSnapshot;
	/** UTC calendar month key ('YYYY-MM') for bucketing. */
	monthBucket: string;
	/** ISO-8601 date string (YYYY-MM-DD) when the snapshot was taken. */
	capturedAt: string;
}

// ── Delta summary ─────────────────────────────────────────────────────────────

/**
 * Human-readable diff between baseline and current snapshots.
 * Surfaced in the MemoryCapsuleHUD copy ("X days ago you couldn't…").
 */
export interface CapsuleDeltaSummary {
	/** XP earned between baseline and current. */
	xpGained: number;
	/** Level delta (can be negative if decay occurred). */
	levelDelta: number;
	/** Streak delta. */
	streakDelta: number;
	/** Number of calendar days between baseline and current capture. */
	daySpan: number;
}

// ── Memory Capsule document ───────────────────────────────────────────────────

/**
 * Firestore document shape for `users/{email}/memory_capsules/{capsuleId}`.
 *
 * Doc ID convention: `cap_{isoWeekKey}` (e.g. `cap_2026-W20`).
 * This deterministic ID prevents the plateau detector from writing more
 * than one capsule per player per calendar week.
 *
 * Write: Cloud Function only (plateau detector).
 * Read:  player (self) or parent (household-scoped).
 * Update: `acknowledged` field only, by the owning player.
 */
export interface MemoryCapsuleDoc {
	/** Matches the Firestore document ID. */
	capsuleId: string;
	/** ISO-8601 UTC date when the capsule was surfaced to the player. */
	surfacedAt: string;
	/** UTC date of the baseline (start of lookback window). */
	baselineDate: string;
	/** Telemetry snapshot at the baseline date (historical). */
	baselineSnapshot: CapsuleSnapshot;
	/** Telemetry snapshot at the time the capsule was created (current). */
	currentSnapshot: CapsuleSnapshot;
	/** Pre-computed diff for the HUD display. */
	deltaSummary: CapsuleDeltaSummary;
	/**
	 * False until the player dismisses the capsule.
	 * Mutated by `TrajectoryEngine.acknowledgeCapsule()` via a narrow
	 * Firestore `updateDoc` that only touches this field.
	 */
	acknowledged: boolean;
	/** Firestore server timestamp — set by the plateau detector CF. */
	createdAt?: FirestoreTimestamp;
}

// ── Trajectory month document ─────────────────────────────────────────────────

/**
 * Firestore document shape for `users/{email}/trajectory_months/{YYYY-MM}`.
 *
 * Written hourly by `trajectoryMonthlyAggregator`.
 * Never written by the client — read-only from the frontend.
 */
export interface TrajectoryMonthDoc {
	/** 'YYYY-MM' calendar month key. */
	monthKey: string;
	/** Total XP earned within this calendar month. */
	totalXp: number;
	/** Total reps logged within this month (best-effort from xpHistory reasons). */
	repsTotal: number;
	/** Total intense minutes within this month. */
	minutesTotal: number;
	/** Growth Velocity Index for this month relative to the previous month. */
	gvi: number | null;
	/** ISO-8601 UTC timestamp when this bucket was last computed. */
	computedAt: string;
}

// ── Trajectory summary (map field on users/{email}) ───────────────────────────

/**
 * The `trajectory` map field on `users/{email}`.
 * Maintained by `trajectoryMonthlyAggregator`.
 */
export interface TrajectoryField {
	/** Most recent GVI value. null = not enough data. */
	gvi: number | null;
	/** ISO-8601 date when GVI was last computed. */
	lastComputedAt: string;
	/** Number of distinct calendar months the player has been active. */
	monthsActive: number;
	/** XP earned in the current calendar month. */
	currentMonthXp: number;
	/** XP earned in the previous calendar month. */
	lastMonthXp: number;
}

// ── GVI tier ──────────────────────────────────────────────────────────────────

/**
 * Display tier derived from the raw GVI value.
 *
 *   IGNITING  — no data yet (null GVI) or first 14 days of activity
 *   CLIMBING  — steady positive growth  (GVI ≥ 0.05)
 *   BREAKOUT  — rapid growth            (GVI ≥ 0.50)
 *   PLATEAU   — flat or declining       (GVI < 0.05)
 */
export type GviTier = 'IGNITING' | 'CLIMBING' | 'BREAKOUT' | 'PLATEAU';
