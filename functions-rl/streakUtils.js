/* eslint-disable quotes */
/**
 * streakUtils.js — Shared streak computation helpers
 * ────────────────────────────────────────────────────
 * Phase 3, Epic 5 — Loss Avoidance (Core Drive 8).
 *
 * This module is the SINGLE SOURCE OF TRUTH for streak date math.
 * Both `gamificationWorkoutXp.js` (on workout log) and
 * `lossAvoidance.js` (nightly sweep) MUST use these helpers so the
 * streak counter is always computed identically regardless of the
 * code path that triggered the update.
 *
 * Design invariants
 * ─────────────────
 * • Dates are always ISO-8601 strings in UTC: "YYYY-MM-DD".
 * • "Today" and "yesterday" are computed from a caller-supplied `nowMs`
 *   timestamp so tests can inject arbitrary dates without mocking globals.
 * • All functions are pure — no Firestore I/O, no side effects.
 */

'use strict';

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Format a millisecond epoch as an ISO-8601 UTC date string "YYYY-MM-DD".
 * @param {number} ms
 * @returns {string}
 */
function utcDateStr(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
exports.utcDateStr = utcDateStr;

/**
 * Return the ISO week key for a millisecond epoch, e.g. "2026-W19".
 * Week 1 is the week that contains Thursday (ISO 8601).
 * @param {number} ms
 * @returns {string}
 */
function isoWeekKey(ms) {
  const d = new Date(ms);
  // Copy to avoid mutation
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1 .. Sun=7)
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86_400_000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
exports.isoWeekKey = isoWeekKey;

/**
 * Number of whole UTC days between two ISO-8601 "YYYY-MM-DD" strings.
 * Returns a positive integer when `laterStr > earlierStr`.
 * Returns 0 if they are the same day.
 * @param {string} earlierStr
 * @param {string} laterStr
 * @returns {number}
 */
function daysBetween(earlierStr, laterStr) {
  if (!earlierStr || !laterStr) return Infinity;
  const msPerDay = 86_400_000;
  return Math.round((Date.parse(laterStr) - Date.parse(earlierStr)) / msPerDay);
}
exports.daysBetween = daysBetween;

// ── Core streak resolver ──────────────────────────────────────────────────────

/**
 * @typedef {Object} StreakInput
 * @property {string} lastTrainingUtc   - ISO "YYYY-MM-DD" of the player's last
 *                                        logged workout ("" if never trained).
 * @property {number} prevStreakDays    - streak_days value from player_stats.
 * @property {string} streakStatus     - 'active' | 'frozen' | 'broken' | ''
 * @property {number} freezeAvailable  - streak freezes remaining this week.
 * @property {boolean} workoutLoggedToday - true if triggered by a new workout.
 * @property {number} nowMs             - epoch ms to treat as "now" (test shim).
 * @property {boolean} enforcementEnabled - streakEnforcementEnabled Remote Config flag.
 */

/**
 * @typedef {Object} StreakResult
 * @property {number}  newStreakDays     - Updated streak_days to write.
 * @property {string}  newStreakStatus   - 'active' | 'frozen' | 'broken'
 * @property {boolean} freezeConsumed   - True if a freeze was used.
 * @property {string}  alertKind        - '' | 'streak_warning' | 'streak_lost'
 * @property {number}  missedDays       - Consecutive days without training.
 */

/**
 * Deterministically resolve the new streak state given current inputs.
 *
 * Rules (streak enforcement must be enabled):
 *   • workoutLoggedToday = true → advance streak (always)
 *   • missedDays == 0 (trained today already) → no change
 *   • missedDays == 1 → "at_risk" warning; no reset
 *   • missedDays >= 2 AND freezeAvailable > 0 → consume freeze, status = 'frozen'
 *   • missedDays >= 2 AND no freeze → streak = 0, status = 'broken'
 *
 * When enforcement is disabled, only the workout-advancement path runs;
 * streak can never break or freeze.
 *
 * @param {StreakInput} input
 * @returns {StreakResult}
 */
function resolveStreak(input) {
  const {
    lastTrainingUtc,
    prevStreakDays,
    streakStatus,
    freezeAvailable,
    workoutLoggedToday,
    nowMs,
    enforcementEnabled,
  } = input;

  const todayStr     = utcDateStr(nowMs);
  const yesterdayStr = utcDateStr(nowMs - 86_400_000);

  // ── Path 1: workout logged today ─────────────────────────────────────────
  if (workoutLoggedToday) {
    let newDays;
    if (lastTrainingUtc === todayStr) {
      // Already counted this calendar day — no change.
      newDays = Math.max(1, prevStreakDays);
    } else if (lastTrainingUtc === yesterdayStr) {
      newDays = Math.max(1, prevStreakDays + 1);
    } else if (streakStatus === 'frozen') {
      // The freeze bridged the gap; now continue from where it left off.
      newDays = Math.max(1, prevStreakDays + 1);
    } else {
      // Gap > 1 day without freeze protection → restart.
      newDays = 1;
    }
    return {
      newStreakDays: newDays,
      newStreakStatus: 'active',
      freezeConsumed: false,
      alertKind: '',
      missedDays: 0,
    };
  }

  // ── Path 2: nightly enforcement sweep ────────────────────────────────────
  if (!enforcementEnabled) {
    // Enforcement off — streak neither breaks nor freezes.
    return {
      newStreakDays: Math.max(0, prevStreakDays),
      newStreakStatus: streakStatus || 'active',
      freezeConsumed: false,
      alertKind: '',
      missedDays: 0,
    };
  }

  const missedDays = lastTrainingUtc ? daysBetween(lastTrainingUtc, todayStr) : Infinity;

  if (missedDays <= 0) {
    // Trained today — sweep is a no-op.
    return {
      newStreakDays: Math.max(1, prevStreakDays),
      newStreakStatus: 'active',
      freezeConsumed: false,
      alertKind: '',
      missedDays: 0,
    };
  }

  if (missedDays === 1) {
    // Yesterday was the last training — issue a warning but preserve streak.
    return {
      newStreakDays: Math.max(0, prevStreakDays),
      newStreakStatus: 'active',
      freezeConsumed: false,
      alertKind: 'streak_warning',
      missedDays: 1,
    };
  }

  // missedDays >= 2
  if (freezeAvailable > 0 && streakStatus !== 'broken') {
    return {
      newStreakDays: Math.max(0, prevStreakDays),
      newStreakStatus: 'frozen',
      freezeConsumed: true,
      alertKind: 'streak_warning',
      missedDays,
    };
  }

  // No freeze available — break the streak.
  return {
    newStreakDays: 0,
    newStreakStatus: 'broken',
    freezeConsumed: false,
    alertKind: 'streak_lost',
    missedDays,
  };
}
exports.resolveStreak = resolveStreak;

// ── Tier floor helpers (mirrors TIER_DEFINITIONS in ArmoryEngine.svelte.ts) ──

/**
 * Tier definitions kept in sync with `src/lib/states/ArmoryEngine.svelte.ts`.
 * Updated here ONLY when the client-side tiers change.
 */
const TIER_DEFINITIONS = [
  {id: 'ROOKIE',   floor: 0},
  {id: 'PRO',      floor: 1_000},
  {id: 'ELITE',    floor: 5_000},
  {id: 'VANGUARD', floor: 10_000},
];

/**
 * Return the XP floor of the tier the player is currently in.
 * Prevents decay from demoting a player across a tier boundary in one sweep.
 * @param {number} totalXp
 * @returns {number}
 */
function currentTierFloor(totalXp) {
  const xp = Math.max(0, totalXp);
  for (let i = TIER_DEFINITIONS.length - 1; i >= 0; i--) {
    if (xp >= TIER_DEFINITIONS[i].floor) return TIER_DEFINITIONS[i].floor;
  }
  return 0;
}
exports.currentTierFloor = currentTierFloor;

/**
 * Compute the XP to drain for a given idle day count.
 *
 * Formula:
 *   idleDays  = floor((nowMs - lastActiveMs) / 24h) - graceDays
 *   decayPct  = clamp(idleDays * pctPerDay, 0, maxPct)
 *   rawDrain  = floor(totalXp * decayPct)
 *   safeDrain = min(rawDrain, totalXp - tierFloor)   ← never demote
 *
 * @param {object} p
 * @param {number} p.totalXp
 * @param {string} p.lastActiveUtc  - ISO "YYYY-MM-DD"
 * @param {number} p.nowMs          - epoch ms
 * @param {number} p.graceDays      - from Remote Config
 * @param {number} p.pctPerDay      - from Remote Config
 * @param {number} p.maxPct         - from Remote Config (0-1)
 * @returns {{ decayXp: number, idleDays: number, decayPct: number }}
 */
function computeDecay({totalXp, lastActiveUtc, nowMs, graceDays, pctPerDay, maxPct}) {
  if (!lastActiveUtc || totalXp <= 0) {
    return {decayXp: 0, idleDays: 0, decayPct: 0};
  }
  const todayStr = utcDateStr(nowMs);
  const rawIdleDays = daysBetween(lastActiveUtc, todayStr);
  const idleDays = Math.max(0, rawIdleDays - graceDays);
  if (idleDays <= 0) return {decayXp: 0, idleDays: 0, decayPct: 0};

  const decayPct = Math.min(idleDays * pctPerDay, maxPct);
  const floor = currentTierFloor(totalXp);
  const rawDrain = Math.floor(totalXp * decayPct);
  const safeDrain = Math.min(rawDrain, Math.max(0, totalXp - floor));

  return {decayXp: safeDrain, idleDays, decayPct};
}
exports.computeDecay = computeDecay;
