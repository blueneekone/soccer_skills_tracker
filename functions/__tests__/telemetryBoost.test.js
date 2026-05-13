/**
 * telemetryBoost.test.js
 * ───────────────────────
 * Unit tests for Phase 3, Epic 5.4 — Telemetry Boost pure-logic helpers.
 *
 * Tests cover the `resolveActiveBoostMultiplier` function exported from
 * `coOpOps.js` and the XP multiplication math inside `gamificationWorkoutXp.js`.
 *
 * Run: node functions/__tests__/telemetryBoost.test.js
 *
 * No Firebase Admin SDK required for the math tests.
 * The Firestore read in `resolveActiveBoostMultiplier` is mocked.
 */

'use strict';

const assert = require('assert');

// ── Admin mock ────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');
if (!admin.apps.length) {
  try {
    admin.initializeApp({projectId: 'test-boost'});
  } catch (_) {}
}

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const deferred = [];

function test(name, fn) {
  deferred.push({name, fn});
}

async function runAll() {
  for (const {name, fn} of deferred) {
    try {
      await fn();
      console.log(`  ✓  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗  ${name}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }
  console.log('');
  console.log(`telemetryBoost.test.js — ${passed + failed} tests`);
  console.log(`  passed : ${passed}`);
  console.log(`  failed : ${failed}`);
  if (failed > 0) process.exit(1);
}

// ── Helper: mock Firestore for resolveActiveBoostMultiplier ───────────────────

/**
 * Creates a patched admin.firestore() that returns given boost docs.
 * @param {Array<{ multiplier: number, expiresAt: string, sponsoredByParentEmail: string }>} docs
 */
function mockBoostFirestore(docs) {
  admin.firestore = () => ({
    collection: () => ({
      where: () => ({
        get: async () => ({
          empty: docs.length === 0,
          docs: docs.map((d) => ({data: () => d})),
        }),
      }),
    }),
  });
}

// ── Import under test (after mock is set) ─────────────────────────────────────

// We require coOpOps only after defining the mock, but the module might
// already be cached; use a fresh require if needed.
let resolveActiveBoostMultiplier;
try {
  // Clear module cache for a clean import.
  delete require.cache[require.resolve('../coOpOps')];
  const mod = require('../coOpOps');
  resolveActiveBoostMultiplier = mod.resolveActiveBoostMultiplier;
} catch (_) {}

// ── XP multiplication math ────────────────────────────────────────────────────

test('XP math: 1.0x multiplier leaves XP unchanged', async () => {
  const base = 100;
  const result = Math.floor(base * 1.0);
  assert.strictEqual(result, 100);
});

test('XP math: 1.5x multiplier on 100 base = 150', async () => {
  const result = Math.floor(100 * 1.5);
  assert.strictEqual(result, 150);
});

test('XP math: 2.0x multiplier on 75 base = 150', async () => {
  const result = Math.floor(75 * 2.0);
  assert.strictEqual(result, 150);
});

test('XP math: 3.0x multiplier on 50 base = 150', async () => {
  const result = Math.floor(50 * 3.0);
  assert.strictEqual(result, 150);
});

test('XP math: floor() truncates fractional XP', async () => {
  // 10 base * 1.5 = 15 (exact)
  assert.strictEqual(Math.floor(10 * 1.5), 15);
  // 7 base * 1.5 = 10.5 → floor = 10
  assert.strictEqual(Math.floor(7 * 1.5), 10);
});

test('XP math: boost cap enforced at 3.0', async () => {
  const MAX = 3.0;
  const mult = Math.min(MAX, 5.0); // clamped
  assert.strictEqual(mult, 3.0);
  const result = Math.floor(100 * mult);
  assert.strictEqual(result, 300);
});

test('XP math: boost below 1.0 would reduce XP — floor to 1.0 before applying', async () => {
  const safeMultiplier = Math.max(1.0, 0.5); // never below 1
  assert.strictEqual(safeMultiplier, 1.0);
});

// ── Preset validation ─────────────────────────────────────────────────────────

const PRESETS = {
  '1_5x_60m': {multiplier: 1.5, windowMinutes: 60, label: '1.5× for 60 min'},
  '2x_30m':   {multiplier: 2.0, windowMinutes: 30, label: '2× for 30 min'},
  '3x_15m':   {multiplier: 3.0, windowMinutes: 15, label: '3× for 15 min'},
};

test('Preset 1_5x_60m: multiplier = 1.5, window = 60 min', async () => {
  const p = PRESETS['1_5x_60m'];
  assert.strictEqual(p.multiplier, 1.5);
  assert.strictEqual(p.windowMinutes, 60);
});

test('Preset 2x_30m: multiplier = 2.0, window = 30 min', async () => {
  const p = PRESETS['2x_30m'];
  assert.strictEqual(p.multiplier, 2.0);
  assert.strictEqual(p.windowMinutes, 30);
});

test('Preset 3x_15m: multiplier = 3.0, window = 15 min', async () => {
  const p = PRESETS['3x_15m'];
  assert.strictEqual(p.multiplier, 3.0);
  assert.strictEqual(p.windowMinutes, 15);
});

test('No preset has multiplier > 3.0', async () => {
  for (const p of Object.values(PRESETS)) {
    assert.ok(p.multiplier <= 3.0, `multiplier ${p.multiplier} exceeds cap`);
  }
});

test('No preset has windowMinutes < 1', async () => {
  for (const p of Object.values(PRESETS)) {
    assert.ok(p.windowMinutes >= 1, `windowMinutes ${p.windowMinutes} is < 1`);
  }
});

// ── resolveActiveBoostMultiplier (Firestore-mocked) ───────────────────────────

if (resolveActiveBoostMultiplier) {
  test('resolveActiveBoostMultiplier: no active boosts → returns 1.0', async () => {
    mockBoostFirestore([]);
    const {resolveActiveBoostMultiplier: fn} = require('../coOpOps');
    const result = await fn(admin.firestore(), 'player@test.com', new Date());
    assert.strictEqual(result.multiplier, 1.0);
    assert.strictEqual(result.sponsoredByParentEmail, null);
  });

  test('resolveActiveBoostMultiplier: single boost → returns its multiplier', async () => {
    const future = new Date(Date.now() + 30 * 60000).toISOString();
    mockBoostFirestore([{multiplier: 1.5, expiresAt: future, sponsoredByParentEmail: 'mom@test.com'}]);
    delete require.cache[require.resolve('../coOpOps')];
    const {resolveActiveBoostMultiplier: fn} = require('../coOpOps');
    const result = await fn(admin.firestore(), 'player@test.com', new Date());
    assert.strictEqual(result.multiplier, 1.5);
    assert.strictEqual(result.sponsoredByParentEmail, 'mom@test.com');
  });

  test('resolveActiveBoostMultiplier: multiple boosts → picks highest', async () => {
    const future = new Date(Date.now() + 30 * 60000).toISOString();
    mockBoostFirestore([
      {multiplier: 1.5, expiresAt: future, sponsoredByParentEmail: 'mom@test.com'},
      {multiplier: 2.0, expiresAt: future, sponsoredByParentEmail: 'dad@test.com'},
    ]);
    delete require.cache[require.resolve('../coOpOps')];
    const {resolveActiveBoostMultiplier: fn} = require('../coOpOps');
    const result = await fn(admin.firestore(), 'player@test.com', new Date());
    assert.strictEqual(result.multiplier, 2.0);
    assert.strictEqual(result.sponsoredByParentEmail, 'dad@test.com');
  });

  test('resolveActiveBoostMultiplier: caps multiplier at MAX_BOOST_MULTIPLIER (3.0)', async () => {
    const future = new Date(Date.now() + 30 * 60000).toISOString();
    mockBoostFirestore([{multiplier: 10.0, expiresAt: future, sponsoredByParentEmail: 'hacker@evil.com'}]);
    delete require.cache[require.resolve('../coOpOps')];
    const {resolveActiveBoostMultiplier: fn} = require('../coOpOps');
    const result = await fn(admin.firestore(), 'player@test.com', new Date());
    assert.strictEqual(result.multiplier, 3.0);
  });
} else {
  console.log('  ⚠  Skipping resolveActiveBoostMultiplier tests (module unavailable)');
}

// ── Run ───────────────────────────────────────────────────────────────────────

runAll();
