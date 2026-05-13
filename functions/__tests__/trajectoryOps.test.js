/**
 * trajectoryOps.test.js
 * ──────────────────────
 * Unit tests for Phase 3, Epic 6 — Trajectory pure-logic helpers.
 *
 * Coverage:
 *   1. computeMonthBucketKey   — UTC month rollover, various input types
 *   2. computePreviousMonthBucketKey — cross-year rollover (Jan → Dec prev year)
 *   3. computeGvi              — floor guard, regression, null on empty, clamping
 *   4. gviTierFromValue        — tier bucket mapping
 *   5. isoWeekKey              — ISO week rollover (Sun/Mon boundary, Jan)
 *   6. detectPlateau           — flat window, active recovery, brand-new player guard
 *   7. buildCapsuleSnapshot    — field mapping, safe defaults for missing fields
 *
 * Run: node functions/__tests__/trajectoryOps.test.js
 *
 * No Firebase Admin SDK or network required.
 */

'use strict';

const assert = require('assert');
const {
  computeMonthBucketKey,
  computePreviousMonthBucketKey,
  computeGvi,
  gviTierFromValue,
  isoWeekKey,
  detectPlateau,
  buildCapsuleSnapshot,
} = require('../trajectoryOps');

// ── Test harness ─────────────────────────────────────────────────────────────

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

function ok(v, msg) {
  assert.ok(v, msg || `Expected truthy, got ${JSON.stringify(v)}`);
}

function deepEq(a, b, msg) {
  assert.deepStrictEqual(a, b, msg);
}

// ── 1. computeMonthBucketKey ─────────────────────────────────────────────────

console.log('\n── computeMonthBucketKey ──');

test('Date object → YYYY-MM', () => {
  eq(computeMonthBucketKey(new Date('2026-05-12T00:00:00Z')), '2026-05');
});

test('Timestamp number → YYYY-MM', () => {
  eq(computeMonthBucketKey(Date.UTC(2026, 11, 31)), '2026-12');
});

test('ISO string → YYYY-MM', () => {
  eq(computeMonthBucketKey('2025-01-01T12:00:00Z'), '2025-01');
});

test('Single-digit month is zero-padded', () => {
  eq(computeMonthBucketKey(new Date('2026-03-15T00:00:00Z')), '2026-03');
});

// ── 2. computePreviousMonthBucketKey ─────────────────────────────────────────

console.log('\n── computePreviousMonthBucketKey ──');

test('May 2026 → 2026-04', () => {
  eq(computePreviousMonthBucketKey(new Date('2026-05-12T00:00:00Z')), '2026-04');
});

test('January → previous year December', () => {
  eq(computePreviousMonthBucketKey(new Date('2026-01-15T00:00:00Z')), '2025-12');
});

test('March → 2026-02', () => {
  eq(computePreviousMonthBucketKey(new Date('2026-03-01T00:00:00Z')), '2026-02');
});

// ── 3. computeGvi ────────────────────────────────────────────────────────────

console.log('\n── computeGvi ──');

test('Null when both months are zero (no activity)', () => {
  eq(computeGvi(0, 0, 200), null);
});

test('Floor guard: 0 → 200 XP yields GVI 1.0 (100% growth vs floor)', () => {
  eq(computeGvi(200, 0, 200), 1.0);
});

test('Floor guard: 0 → 400 XP yields GVI 2.0', () => {
  eq(computeGvi(400, 0, 200), 2.0);
});

test('Equal months (no growth) → 0', () => {
  eq(computeGvi(500, 500, 200), 0);
});

test('Regression: earned less this month than last', () => {
  const gvi = computeGvi(100, 500, 200);
  ok(gvi < 0, `Expected negative GVI for regression, got ${gvi}`);
  eq(gvi, -0.8);
});

test('Veteran player: large denominator dominates floor', () => {
  // lastMonth=2000, floor=200 → denominator=2000
  // thisMonth=3000 → (3000-2000)/2000 = 0.5
  eq(computeGvi(3000, 2000, 200), 0.5);
});

test('Clamp upper bound: absurdly large growth caps at 10', () => {
  const gvi = computeGvi(1_000_000, 0, 200);
  eq(gvi, 10);
});

test('Clamp lower bound: total regression (0 XP this month) yields -1.0', () => {
  // Minimum GVI from the formula: (0 - prev) / max(prev, floor) = -1 when prev >> floor.
  // -2 clamp only fires if some future formula change produces rawGvi < -2.
  const gvi = computeGvi(0, 1_000_000, 200);
  eq(gvi, -1);
});

test('Fractional XP inputs are floored', () => {
  eq(computeGvi(200.9, 0.4, 200), 1.0);
});

// ── 4. gviTierFromValue ──────────────────────────────────────────────────────

console.log('\n── gviTierFromValue ──');

test('null → IGNITING', () => eq(gviTierFromValue(null), 'IGNITING'));
test('0.6 → BREAKOUT',   () => eq(gviTierFromValue(0.6), 'BREAKOUT'));
test('0.5 → BREAKOUT (inclusive boundary)', () => eq(gviTierFromValue(0.5), 'BREAKOUT'));
test('0.3 → CLIMBING',  () => eq(gviTierFromValue(0.3), 'CLIMBING'));
test('0.05 → CLIMBING (inclusive boundary)', () => eq(gviTierFromValue(0.05), 'CLIMBING'));
test('0.0 → PLATEAU',   () => eq(gviTierFromValue(0.0), 'PLATEAU'));
test('-0.04 → PLATEAU', () => eq(gviTierFromValue(-0.04), 'PLATEAU'));
test('-0.5 → PLATEAU (negative still plateau)', () => eq(gviTierFromValue(-0.5), 'PLATEAU'));

// ── 5. isoWeekKey ────────────────────────────────────────────────────────────

console.log('\n── isoWeekKey ──');

test('2026-01-05 (Monday) → 2026-W02', () => {
  eq(isoWeekKey(new Date('2026-01-05T00:00:00Z')), '2026-W02');
});

test('2026-05-12 (Tuesday) → 2026-W20', () => {
  eq(isoWeekKey(new Date('2026-05-12T00:00:00Z')), '2026-W20');
});

test('2026-01-01 (Thursday) → 2026-W01', () => {
  eq(isoWeekKey(new Date('2026-01-01T00:00:00Z')), '2026-W01');
});

test('2025-12-29 (Monday) → 2026-W01 (ISO week belongs to 2026)', () => {
  // Dec 29 2025 is Monday of the week whose Thursday is Jan 1 2026 → W01 of 2026.
  eq(isoWeekKey(new Date('2025-12-29T00:00:00Z')), '2026-W01');
});

test('Week number is zero-padded', () => {
  const k = isoWeekKey(new Date('2026-01-05T00:00:00Z'));
  ok(k.includes('W0'), `Expected zero-padded week, got ${k}`);
});

// ── 6. detectPlateau ─────────────────────────────────────────────────────────

console.log('\n── detectPlateau ──');

/** Build a synthetic XP history slice for testing. */
function makeHistory(events) {
  // events: [{ daysAgo, amount }]
  let running = 0;
  return events
    .sort((a, b) => b.daysAgo - a.daysAgo)
    .map(({daysAgo, amount}) => {
      running += amount;
      const d = new Date(Date.now() - daysAgo * 86_400_000);
      return {
        date: d.toISOString().slice(0, 10),
        amount,
        runningTotal: running,
      };
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

test('Empty history → not plateauing', () => {
  const r = detectPlateau([], 14, 0.05);
  eq(r.isPlateauing, false);
});

test('Brand-new player (base < 50 XP) → not plateauing (safety guard)', () => {
  // Player earned 30 XP total, then nothing for 14 days.
  const h = makeHistory([{daysAgo: 20, amount: 30}]);
  const r = detectPlateau(h, 14, 0.05);
  eq(r.isPlateauing, false, 'Guard should prevent plateau detection for tiny base');
});

test('Active player with zero window XP → plateauing', () => {
  // 1000 XP base set 20 days ago, nothing in the last 14 days.
  const h = makeHistory([{daysAgo: 20, amount: 1000}]);
  const r = detectPlateau(h, 14, 0.05);
  eq(r.isPlateauing, true);
  eq(r.deltaXp, 0);
});

test('Active player with adequate window XP → not plateauing', () => {
  // 1000 XP base, 200 XP earned in window (20% > 5% threshold).
  const h = makeHistory([
    {daysAgo: 20, amount: 1000},
    {daysAgo: 7, amount: 200},
  ]);
  const r = detectPlateau(h, 14, 0.05);
  eq(r.isPlateauing, false);
  eq(r.deltaXp, 200);
});

test('Player right at threshold boundary → plateauing (< not <=)', () => {
  // base=1000, threshold=0.05 → need deltaXp < 50 to plateau.
  // Earned exactly 49 in window → should plateau.
  const h = makeHistory([
    {daysAgo: 20, amount: 1000},
    {daysAgo: 5, amount: 49},
  ]);
  const r = detectPlateau(h, 14, 0.05);
  eq(r.isPlateauing, true);
});

test('currentTotalXp reflects most recent runningTotal', () => {
  const h = makeHistory([
    {daysAgo: 20, amount: 500},
    {daysAgo: 10, amount: 300},
  ]);
  const r = detectPlateau(h, 14, 0.05);
  eq(r.currentTotalXp, 800);
});

// ── 7. buildCapsuleSnapshot ──────────────────────────────────────────────────

console.log('\n── buildCapsuleSnapshot ──');

test('Extracts totalXp, level, streakDays from playerStats', () => {
  const ps = {total_xp: 3500, current_level: 12, streak_days: 7};
  const snap = buildCapsuleSnapshot(ps, {}, '2026-05');
  eq(snap.totalXp, 3500);
  eq(snap.level, 12);
  eq(snap.streakDays, 7);
});

test('Falls back to armory.totalXP when player_stats missing total_xp', () => {
  const ps = {current_level: 5, streak_days: 2};
  const armory = {totalXP: 1200, stats: {}};
  const snap = buildCapsuleSnapshot(ps, armory, '2026-05');
  eq(snap.totalXp, 1200);
});

test('Extracts Scout\'s Six from armory.stats', () => {
  const armory = {stats: {PAC: '22.1 MPH', ACC: '1.52s', AGI: '4.12s', STM: 'Lvl 18', POW: '32 in', VAN: '95'}};
  const snap = buildCapsuleSnapshot({}, armory, '2026-05');
  deepEq(snap.scoutsSix, {PAC: '22.1 MPH', ACC: '1.52s', AGI: '4.12s', STM: 'Lvl 18', POW: '32 in', VAN: '95'});
});

test('Defaults Scout\'s Six to dashes when armory.stats missing', () => {
  const snap = buildCapsuleSnapshot({}, {}, '2026-05');
  deepEq(snap.scoutsSix, {PAC: '—', ACC: '—', AGI: '—', STM: '—', POW: '—', VAN: '—'});
});

test('monthBucket is preserved on snapshot', () => {
  const snap = buildCapsuleSnapshot({}, {}, '2025-11');
  eq(snap.monthBucket, '2025-11');
});

test('capturedAt is a YYYY-MM-DD string', () => {
  const snap = buildCapsuleSnapshot({}, {}, '2026-05');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(snap.capturedAt), `capturedAt should be YYYY-MM-DD, got ${snap.capturedAt}`);
});

test('Handles null / undefined inputs gracefully', () => {
  const snap = buildCapsuleSnapshot(null, null, null);
  eq(snap.totalXp, 0);
  eq(snap.level, 1);
  eq(snap.streakDays, 0);
  ok(/^\d{4}-\d{2}$/.test(snap.monthBucket));
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);

if (failed > 0) {
  process.exit(1);
}
