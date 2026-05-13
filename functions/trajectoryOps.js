/**
 * trajectoryOps.js
 * ─────────────────
 * Phase 3, Epic 6 — Vertical Comparison & Trajectory Tracking
 *
 * Pure-function math layer for Time-Lapse Memory Capsules and the Growth
 * Velocity Index (GVI).  This module has zero side effects — no Firestore,
 * no Admin SDK.  It exports deterministic functions that can be imported
 * from both the aggregator/detector Cloud Functions and unit tests.
 *
 * GVI FORMULA
 * ───────────
 *   GVI = (thisMonthXp − lastMonthXp) / max(lastMonthXp, FLOOR_XP)
 *
 *   FLOOR_XP (sourced from Remote Config, default 200) prevents division by
 *   near-zero so a newcomer going from 0 → 200 XP still produces a finite,
 *   meaningful score (1.0 = 100% growth relative to floor).
 *
 * PLATEAU DETECTION
 * ─────────────────
 *   A plateau is defined as: the player's total XP change over the lookback
 *   window is less than `deltaThresholdPct` percent of their total XP at the
 *   start of the window.  This surfaces meaningful historical baselines — when
 *   a player is stuck, the system surfaces proof of their past capability.
 *
 * CAPSULE SNAPSHOT
 * ────────────────
 *   A snapshot captures Scout's Six stats + XP + level + streak at a single
 *   point in time.  Two snapshots (baseline + current) form a capsule diff.
 */

'use strict';

// ── Month bucket key ──────────────────────────────────────────────────────────

/**
 * Derive the UTC calendar month key from any date.
 *
 * @param {Date | number | string} date
 * @returns {string}  'YYYY-MM'
 *
 * @example
 *   computeMonthBucketKey(new Date('2026-05-12')) // → '2026-05'
 */
function computeMonthBucketKey(date) {
  const d = date instanceof Date ? date : new Date(typeof date === 'number' ? date : Date.parse(String(date)));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Return the UTC year-month key for the calendar month immediately before
 * the supplied date.
 *
 * @param {Date | number | string} date
 * @returns {string}  'YYYY-MM'
 */
function computePreviousMonthBucketKey(date) {
  const d = date instanceof Date ? new Date(date) : new Date(typeof date === 'number' ? date : Date.parse(String(date)));
  // Move to first day of current month, then subtract 1 ms → last day of previous month.
  const firstOfMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const lastOfPrev = new Date(firstOfMonth.getTime() - 1);
  return computeMonthBucketKey(lastOfPrev);
}

// ── Growth Velocity Index ─────────────────────────────────────────────────────

/**
 * Compute the Growth Velocity Index.
 *
 * Result is a dimensionless ratio.  Values > 1 indicate more-than-100% growth
 * relative to the floor, values < 0 indicate regression.  The result is
 * clamped to [-2, 10] to prevent display overflow from degenerate data.
 *
 * @param {number} thisMonthXp   Raw XP earned in the current calendar month.
 * @param {number} lastMonthXp   Raw XP earned in the previous calendar month.
 * @param {number} [floorXp]     Lower bound on the denominator. Default: 200.
 * @returns {number | null}      null when thisMonthXp is 0 and lastMonthXp is 0
 *                               (player has no activity — avoid showing a zero score).
 */
function computeGvi(thisMonthXp, lastMonthXp, floorXp) {
  const cur = Math.max(0, Math.floor(Number(thisMonthXp) || 0));
  const prev = Math.max(0, Math.floor(Number(lastMonthXp) || 0));
  const floor = Math.max(1, Math.floor(Number(floorXp) || 200));

  // No activity yet — surface null so the UI shows "IGNITING" state.
  if (cur === 0 && prev === 0) return null;

  const denominator = Math.max(prev, floor);
  const raw = (cur - prev) / denominator;

  // Clamp to a sane display range.
  return Math.max(-2, Math.min(10, raw));
}

/**
 * Map a raw GVI value to a human-readable tier label.
 *
 * @param {number | null} gvi
 * @returns {'IGNITING' | 'CLIMBING' | 'PLATEAU' | 'BREAKOUT'}
 */
function gviTierFromValue(gvi) {
  if (gvi === null) return 'IGNITING';
  if (gvi >= 0.5)   return 'BREAKOUT';
  if (gvi >= 0.05)  return 'CLIMBING';
  if (gvi >= -0.05) return 'PLATEAU';
  // Negative — also show plateau (loss avoidance already handles decay)
  return 'PLATEAU';
}

// ── ISO week key ──────────────────────────────────────────────────────────────

/**
 * Return the ISO 8601 week key for a given date, formatted as 'YYYY-WNN'.
 * Monday is the start of the week (ISO standard).
 *
 * Used as the deterministic doc ID for memory capsules to prevent spam
 * (one capsule per player per calendar week maximum).
 *
 * @param {Date | number | string} date
 * @returns {string}  e.g. '2026-W20'
 */
function isoWeekKey(date) {
  const d = date instanceof Date ? new Date(date) : new Date(typeof date === 'number' ? date : Date.parse(String(date)));
  // Shift to ISO week: Thursday determines the week year.
  const dayOfWeek = d.getUTCDay() || 7; // Monday=1 … Sunday=7
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (4 - dayOfWeek)));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ── Plateau detection ─────────────────────────────────────────────────────────

/**
 * Detect whether a player is on a plateau given a slice of their XP history.
 *
 * Plateau criterion: total XP earned within the lookback window is less than
 * `deltaThresholdPct` percent of the XP total at the START of that window.
 * A floor of 50 XP is applied so truly new players (tiny base) don't fire
 * constant plateau alerts.
 *
 * @param {Array<{ date: string; amount: number; runningTotal: number }>} xpHistorySlice
 *   Sorted ascending by date.  Each entry is a single XP event.
 * @param {number} lookbackDays       How many calendar days to examine.  Default: 14.
 * @param {number} deltaThresholdPct  Fraction of start-total below which we call it a plateau.
 *                                    Default: 0.05 (5%).
 * @returns {{ isPlateauing: boolean; baselineDate: string | null; baselineTotalXp: number; currentTotalXp: number; deltaXp: number }}
 */
function detectPlateau(xpHistorySlice, lookbackDays, deltaThresholdPct) {
  const days = Math.max(1, Math.floor(Number(lookbackDays) || 14));
  const threshold = Math.max(0, Number(deltaThresholdPct) || 0.05);

  const entries = Array.isArray(xpHistorySlice) ? xpHistorySlice : [];
  if (entries.length === 0) {
    return {isPlateauing: false, baselineDate: null, baselineTotalXp: 0, currentTotalXp: 0, deltaXp: 0};
  }

  const nowMs = Date.now();
  const cutoffMs = nowMs - days * 86_400_000;

  // Entries within the lookback window.
  const window = entries.filter((e) => {
    const ms = typeof e.date === 'string' ? Date.parse(e.date) : 0;
    return ms >= cutoffMs;
  });

  // Most recent runningTotal across all entries (including pre-window).
  const allSorted = [...entries].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const latestEntry = allSorted[allSorted.length - 1];
  const currentTotalXp = latestEntry ? Math.max(0, Math.floor(Number(latestEntry.runningTotal) || 0)) : 0;

  // The XP total just before the window started.
  const preWindow = allSorted.filter((e) => Date.parse(e.date) < cutoffMs);
  const baselineEntry = preWindow.length > 0 ? preWindow[preWindow.length - 1] : null;
  const baselineTotalXp = baselineEntry ? Math.max(0, Math.floor(Number(baselineEntry.runningTotal) || 0)) : 0;
  const baselineDate = baselineEntry ? baselineEntry.date : (allSorted[0]?.date ?? null);

  const deltaXp = window.reduce((acc, e) => acc + Math.floor(Number(e.amount) || 0), 0);

  // Require a minimum base so brand-new accounts don't immediately trigger.
  const MIN_BASE_XP = 50;
  if (baselineTotalXp < MIN_BASE_XP) {
    return {isPlateauing: false, baselineDate, baselineTotalXp, currentTotalXp, deltaXp};
  }

  const isPlateauing = deltaXp < threshold * baselineTotalXp;
  return {isPlateauing, baselineDate, baselineTotalXp, currentTotalXp, deltaXp};
}

// ── Capsule snapshot builder ──────────────────────────────────────────────────

/**
 * Build a telemetry-only capsule snapshot from Firestore documents.
 *
 * The snapshot is intentionally flat and serializable — it is stored as a
 * plain object inside `users/{email}/memory_capsules/{capsuleId}`.
 *
 * @param {Record<string, unknown>} playerStats    `player_stats/{uid}` document data.
 * @param {Record<string, unknown>} userArmory     `users/{email}.armory` map.
 * @param {string} monthBucket                     'YYYY-MM' key for the active month.
 * @returns {{ totalXp: number; level: number; streakDays: number; scoutsSix: Record<string, string>; monthBucket: string; capturedAt: string }}
 */
function buildCapsuleSnapshot(playerStats, userArmory, monthBucket) {
  const ps = playerStats && typeof playerStats === 'object' ? playerStats : {};
  const armory = userArmory && typeof userArmory === 'object' ? userArmory : {};

  const totalXp = Math.max(0, Math.floor(Number(ps.total_xp || armory.totalXP) || 0));
  const level = Math.max(1, Math.floor(Number(ps.current_level) || 1));
  const streakDays = Math.max(0, Math.floor(Number(ps.streak_days) || 0));

  const rawStats = armory.stats && typeof armory.stats === 'object' ?
    /** @type {Record<string, unknown>} */ (armory.stats) : {};
  const scoutsSix = {
    PAC: typeof rawStats.PAC === 'string' ? rawStats.PAC : '—',
    ACC: typeof rawStats.ACC === 'string' ? rawStats.ACC : '—',
    AGI: typeof rawStats.AGI === 'string' ? rawStats.AGI : '—',
    STM: typeof rawStats.STM === 'string' ? rawStats.STM : '—',
    POW: typeof rawStats.POW === 'string' ? rawStats.POW : '—',
    VAN: typeof rawStats.VAN === 'string' ? rawStats.VAN : '—',
  };

  return {
    totalXp,
    level,
    streakDays,
    scoutsSix,
    monthBucket: typeof monthBucket === 'string' ? monthBucket : computeMonthBucketKey(new Date()),
    capturedAt: new Date().toISOString().slice(0, 10),
  };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  computeMonthBucketKey,
  computePreviousMonthBucketKey,
  computeGvi,
  gviTierFromValue,
  isoWeekKey,
  detectPlateau,
  buildCapsuleSnapshot,
};
