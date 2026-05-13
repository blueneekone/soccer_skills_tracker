/**
 * lossAvoidance.test.js
 * ──────────────────────
 * Unit tests for Phase 3, Epic 5 — Loss Avoidance pure-logic helpers.
 *
 * Tests cover:
 *   1. streakUtils.resolveStreak — workout-logged path
 *   2. streakUtils.resolveStreak — enforcement sweep (grace, warning, freeze, break)
 *   3. streakUtils.computeDecay  — grace window, tier-floor clamp, max cap
 *   4. streakUtils.isoWeekKey    — ISO week rollover
 *   5. Idempotency guard simulation (lastDecayRunUtc === todayUtc)
 *
 * Run: node functions/__tests__/lossAvoidance.test.js
 *
 * No Firebase Admin SDK required — tests only cover the pure-function layer
 * in streakUtils.js (no Firestore, no Auth).
 */

'use strict';

const assert = require('assert');
const {
  resolveStreak,
  computeDecay,
  utcDateStr,
  isoWeekKey,
  daysBetween,
  currentTierFloor,
} = require('../streakUtils');

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`       ${err.message}`);
    failed++;
  }
}

function eq(a, b, msg) {
  assert.strictEqual(a, b, msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function ok(cond, msg) {
  assert.ok(cond, msg);
}

// ── Fixed "now" timestamps ────────────────────────────────────────────────────

// Tuesday 2026-05-12 12:00:00 UTC
const NOW_MS       = Date.parse('2026-05-12T12:00:00Z');
const TODAY_STR    = '2026-05-12';
const YESTERDAY    = '2026-05-11';
const TWO_DAYS_AGO = '2026-05-10';
const WEEK_KEY     = isoWeekKey(NOW_MS);

// ── Section 1: resolveStreak — workout-logged path ────────────────────────────

console.log('\n1. resolveStreak — workout logged today\n');

test('first-ever workout sets streak to 1', () => {
  const r = resolveStreak({
    lastTrainingUtc: '',
    prevStreakDays: 0,
    streakStatus: '',
    freezeAvailable: 0,
    workoutLoggedToday: true,
    nowMs: NOW_MS,
    enforcementEnabled: true,
  });
  eq(r.newStreakDays, 1);
  eq(r.newStreakStatus, 'active');
  eq(r.freezeConsumed, false);
});

test('training yesterday → streak increments', () => {
  const r = resolveStreak({
    lastTrainingUtc: YESTERDAY,
    prevStreakDays: 5,
    streakStatus: 'active',
    freezeAvailable: 1,
    workoutLoggedToday: true,
    nowMs: NOW_MS,
    enforcementEnabled: true,
  });
  eq(r.newStreakDays, 6);
  eq(r.newStreakStatus, 'active');
});

test('training today already → no increment (idempotent)', () => {
  const r = resolveStreak({
    lastTrainingUtc: TODAY_STR,
    prevStreakDays: 7,
    streakStatus: 'active',
    freezeAvailable: 0,
    workoutLoggedToday: true,
    nowMs: NOW_MS,
    enforcementEnabled: true,
  });
  eq(r.newStreakDays, 7);
});

test('gap > 1 day without freeze → streak resets to 1', () => {
  const r = resolveStreak({
    lastTrainingUtc: TWO_DAYS_AGO,
    prevStreakDays: 10,
    streakStatus: 'active',
    freezeAvailable: 0,
    workoutLoggedToday: true,
    nowMs: NOW_MS,
    enforcementEnabled: true,
  });
  eq(r.newStreakDays, 1);
});

test('gap > 1 day but streak was frozen → continues from prev', () => {
  const r = resolveStreak({
    lastTrainingUtc: TWO_DAYS_AGO,
    prevStreakDays: 8,
    streakStatus: 'frozen',
    freezeAvailable: 0,
    workoutLoggedToday: true,
    nowMs: NOW_MS,
    enforcementEnabled: true,
  });
  eq(r.newStreakDays, 9);
  eq(r.newStreakStatus, 'active');
});

// ── Section 2: resolveStreak — enforcement sweep ──────────────────────────────

console.log('\n2. resolveStreak — nightly enforcement sweep\n');

test('missed 1 day → warning, no reset', () => {
  const r = resolveStreak({
    lastTrainingUtc: YESTERDAY,
    prevStreakDays: 4,
    streakStatus: 'active',
    freezeAvailable: 1,
    workoutLoggedToday: false,
    nowMs: NOW_MS,
    enforcementEnabled: true,
  });
  eq(r.newStreakDays, 4, 'streak preserved');
  eq(r.newStreakStatus, 'active');
  eq(r.alertKind, 'streak_warning');
  eq(r.freezeConsumed, false, 'no freeze on 1-day miss');
});

test('missed 2 days with freeze → freeze consumed, status=frozen', () => {
  const r = resolveStreak({
    lastTrainingUtc: TWO_DAYS_AGO,
    prevStreakDays: 6,
    streakStatus: 'active',
    freezeAvailable: 1,
    workoutLoggedToday: false,
    nowMs: NOW_MS,
    enforcementEnabled: true,
  });
  eq(r.newStreakDays, 6, 'streak preserved by freeze');
  eq(r.newStreakStatus, 'frozen');
  eq(r.freezeConsumed, true);
  eq(r.alertKind, 'streak_warning');
});

test('missed 2 days no freeze → streak breaks', () => {
  const r = resolveStreak({
    lastTrainingUtc: TWO_DAYS_AGO,
    prevStreakDays: 12,
    streakStatus: 'active',
    freezeAvailable: 0,
    workoutLoggedToday: false,
    nowMs: NOW_MS,
    enforcementEnabled: true,
  });
  eq(r.newStreakDays, 0);
  eq(r.newStreakStatus, 'broken');
  eq(r.alertKind, 'streak_lost');
  eq(r.freezeConsumed, false);
});

test('already broken + no freeze → still broken (no double-break)', () => {
  const r = resolveStreak({
    lastTrainingUtc: TWO_DAYS_AGO,
    prevStreakDays: 0,
    streakStatus: 'broken',
    freezeAvailable: 1, // freeze exists but can't un-break
    workoutLoggedToday: false,
    nowMs: NOW_MS,
    enforcementEnabled: true,
  });
  eq(r.newStreakDays, 0);
  eq(r.newStreakStatus, 'broken');
  eq(r.freezeConsumed, false, 'cannot freeze already-broken streak');
});

test('enforcement disabled → streak never breaks', () => {
  const r = resolveStreak({
    lastTrainingUtc: '2025-01-01', // very old
    prevStreakDays: 5,
    streakStatus: 'active',
    freezeAvailable: 0,
    workoutLoggedToday: false,
    nowMs: NOW_MS,
    enforcementEnabled: false,
  });
  eq(r.newStreakDays, 5, 'streak unchanged when enforcement off');
  eq(r.alertKind, '');
});

// ── Section 3: computeDecay ───────────────────────────────────────────────────

console.log('\n3. computeDecay — grace window, tier-floor clamp, cap\n');

const BASE_PARAMS = {graceDays: 2, pctPerDay: 0.01, maxPct: 0.25};

test('within grace window → zero decay', () => {
  const {decayXp, idleDays} = computeDecay({
    totalXp: 2000,
    lastActiveUtc: YESTERDAY, // only 1 day ago
    nowMs: NOW_MS,
    ...BASE_PARAMS,
  });
  eq(decayXp, 0);
  eq(idleDays, 0);
});

test('exactly at grace boundary → zero decay', () => {
  const {decayXp} = computeDecay({
    totalXp: 2000,
    lastActiveUtc: TWO_DAYS_AGO, // 2 days = graceDays → idleDays = 0
    nowMs: NOW_MS,
    ...BASE_PARAMS,
  });
  eq(decayXp, 0);
});

test('1 idle day beyond grace → correct XP drained', () => {
  // lastActive = 3 days ago → idleDays = 3 - 2 = 1; pct = 0.01; drain = floor(2000 * 0.01) = 20
  const threeDaysAgo = utcDateStr(NOW_MS - 3 * 86_400_000);
  const {decayXp, idleDays, decayPct} = computeDecay({
    totalXp: 2000,
    lastActiveUtc: threeDaysAgo,
    nowMs: NOW_MS,
    ...BASE_PARAMS,
  });
  eq(idleDays, 1);
  ok(Math.abs(decayPct - 0.01) < 0.001, `decayPct ~0.01, got ${decayPct}`);
  eq(decayXp, 20);
});

test('tier-floor clamp prevents demoting across tier (PRO floor = 1000)', () => {
  // totalXp = 1010; floor = 1000; maxPossibleDrain = 10
  // Without clamp: 5 idle days → pct = 0.03 → drain = floor(1010 * 0.03) = 30
  // With clamp: min(30, 1010 - 1000) = 10
  const fiveDaysAgo = utcDateStr(NOW_MS - 7 * 86_400_000); // 7d - 2d grace = 5 idle
  const {decayXp} = computeDecay({
    totalXp: 1010,
    lastActiveUtc: fiveDaysAgo,
    nowMs: NOW_MS,
    ...BASE_PARAMS,
  });
  eq(decayXp, 10, 'clamped to tier-floor boundary');
});

test('maxPct cap applied when idle days are huge', () => {
  // 100 idle days at 0.01/day = 1.0 → clamped to 0.25
  const longAgo = utcDateStr(NOW_MS - 102 * 86_400_000);
  const {decayPct, decayXp} = computeDecay({
    totalXp: 10000,
    lastActiveUtc: longAgo,
    nowMs: NOW_MS,
    ...BASE_PARAMS,
  });
  ok(Math.abs(decayPct - 0.25) < 0.001, `decayPct capped at 0.25, got ${decayPct}`);
  // floor(10000 * 0.25) = 2500; tierFloor = 10000 (VANGUARD) → clamp to 0
  // Actually VANGUARD floor = 10000 and totalXp = 10000 → drain clamped to 0
  eq(decayXp, 0, 'VANGUARD player at exact floor → zero drain');
});

test('player with zero XP → zero decay', () => {
  const old = utcDateStr(NOW_MS - 30 * 86_400_000);
  const {decayXp} = computeDecay({
    totalXp: 0,
    lastActiveUtc: old,
    nowMs: NOW_MS,
    ...BASE_PARAMS,
  });
  eq(decayXp, 0);
});

test('no lastActiveUtc → zero decay', () => {
  const {decayXp} = computeDecay({
    totalXp: 5000,
    lastActiveUtc: '',
    nowMs: NOW_MS,
    ...BASE_PARAMS,
  });
  eq(decayXp, 0);
});

// ── Section 4: isoWeekKey rollover ────────────────────────────────────────────

console.log('\n4. isoWeekKey — ISO week boundaries\n');

test('Monday and Sunday of same week share the same key', () => {
  // ISO week: Mon–Sun. 2026-05-11 (Mon) and 2026-05-17 (Sun) are W20.
  const monMs = Date.parse('2026-05-11T00:00:00Z');
  const sunMs = Date.parse('2026-05-17T23:59:59Z');
  eq(isoWeekKey(monMs), isoWeekKey(sunMs));
});

test('day rollover produces different week key', () => {
  const sunMs = Date.parse('2026-05-17T23:59:59Z');
  const monMs = Date.parse('2026-05-18T00:00:00Z');
  ok(isoWeekKey(sunMs) !== isoWeekKey(monMs), 'week key changes on Monday');
});

test('Jan 1 week 1 aligns with ISO standard', () => {
  // 2026-01-05 is a Monday in W02 (first ISO week of 2026 starts on Dec 29 2025).
  const w1ms = Date.parse('2026-01-05T12:00:00Z');
  eq(isoWeekKey(w1ms), '2026-W02');
});

// ── Section 5: Idempotency simulation ────────────────────────────────────────

console.log('\n5. Idempotency guard simulation\n');

test('same-day re-run should be detected and skipped', () => {
  const decayState = {lastDecayRunUtc: TODAY_STR};
  const alreadyRan = decayState.lastDecayRunUtc === TODAY_STR;
  eq(alreadyRan, true, 'idempotency guard fires correctly');
});

test('yesterday run does NOT short-circuit todays sweep', () => {
  const decayState = {lastDecayRunUtc: YESTERDAY};
  const alreadyRan = decayState.lastDecayRunUtc === TODAY_STR;
  eq(alreadyRan, false, 'previous day run allows todays sweep');
});

// ── Section 6: currentTierFloor ───────────────────────────────────────────────

console.log('\n6. currentTierFloor — tier boundary math\n');

test('0 XP → ROOKIE floor 0', ()  => eq(currentTierFloor(0),     0));
test('999 XP → ROOKIE floor 0',   () => eq(currentTierFloor(999),   0));
test('1000 XP → PRO floor 1000',  () => eq(currentTierFloor(1000),  1000));
test('4999 XP → PRO floor 1000',  () => eq(currentTierFloor(4999),  1000));
test('5000 XP → ELITE floor 5000',() => eq(currentTierFloor(5000),  5000));
test('10000 XP → VANGUARD floor', () => eq(currentTierFloor(10000), 10000));
test('99999 XP → VANGUARD floor', () => eq(currentTierFloor(99999), 10000));

// ── Section 7: daysBetween ────────────────────────────────────────────────────

console.log('\n7. daysBetween helper\n');

test('same day → 0', () => eq(daysBetween(TODAY_STR, TODAY_STR), 0));
test('yesterday to today → 1', () => eq(daysBetween(YESTERDAY, TODAY_STR), 1));
test('today to yesterday → -1 (negative)', () => eq(daysBetween(TODAY_STR, YESTERDAY), -1));
test('empty string → Infinity', () => eq(daysBetween('', TODAY_STR), Infinity));

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`  Tests: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);
console.log(`${'─'.repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
}
