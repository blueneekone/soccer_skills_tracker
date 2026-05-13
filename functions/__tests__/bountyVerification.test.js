/**
 * bountyVerification.test.js
 * ───────────────────────────
 * Unit tests for Phase 3, Epic 5.4 — Objective Bounty Verification
 * pure-logic helpers.
 *
 * Tests cover:
 *   1. reps_count criterion — satisfied, not satisfied, drill filter edge cases
 *   2. workout_volume_kj criterion — KJ calculation correctness
 *   3. streak_length criterion — threshold comparison
 *   4. gpa_threshold criterion — boundary values
 *   5. mastery_node_unlock criterion — status ordering
 *   6. cv_verified_drill handler — always returns false (no pipeline)
 *
 * Run: node functions/__tests__/bountyVerification.test.js
 *
 * No Firebase Admin SDK required — the CRITERION_HANDLERS are exported as
 * pure async functions that accept (bountyDoc, eventContext).
 * We mock the Firestore call inside reps_count by patching admin.firestore().
 */

'use strict';

const assert = require('assert');

// ── Minimal admin mock (prevents SDK init errors on import) ───────────────────
const admin = require('firebase-admin');
// If admin is not yet initialised, initialise with a dummy app.
if (!admin.apps.length) {
  try {
    // Using the credential-less path — sufficient for pure logic tests.
    const app = admin.initializeApp({projectId: 'test-project'});
    // Override firestore() to return a mock that handles the cv query.
    app.firestore = () => ({
      collection: () => ({
        where: () => ({
          where: () => ({
            where: () => ({
              get: async () => ({docs: []}),
            }),
          }),
          get: async () => ({docs: [], empty: true}),
        }),
      }),
    });
  } catch (_) {
    // Already initialised.
  }
}

// Patch admin.firestore() for the cv handler query.
const originalFirestore = admin.firestore.bind(admin);
admin.firestore = () => ({
  collection: (coll) => {
    // Return mock for cv_drill_verifications.
    if (coll === 'cv_drill_verifications') {
      return {
        where: () => ({
          where: () => ({
            where: () => ({
              get: async () => ({docs: []}),
            }),
          }),
        }),
      };
    }
    // Also mock reps collection for the reps_count drillFilter path.
    if (coll === 'reps') {
      return {
        where: () => ({
          where: () => ({
            get: async () => ({
              docs: [
                {
                  data: () => ({
                    playerEmail: 'player@test.com',
                    gamificationXpGranted: true,
                    drills: [
                      {name: 'Cone Drill', sets: 3, reps: 10},
                      {name: 'Sprint', sets: 2, reps: 5},
                    ],
                  }),
                },
              ],
            }),
          }),
        }),
      };
    }
    return {};
  },
});

const {CRITERION_HANDLERS} = require('../bountyVerification');

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  Promise.resolve()
      .then(() => fn())
      .then(() => {
        console.log(`  ✓  ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ✗  ${name}`);
        console.error(`     ${err.message}`);
        failed++;
      });
}

function makeBounty(criterionOverride, overrides = {}) {
  return {
    playerEmail: 'player@test.com',
    parentEmail: 'parent@test.com',
    householdId: 'hh-123',
    tenantId: 'club-abc',
    title: 'Test Bounty',
    status: 'active',
    expiresAt: new Date(Date.now() + 86_400_000 * 30).toISOString(),
    rewardCents: 500,
    currency: 'USD',
    criterion: criterionOverride,
    startsAt: new Date(Date.now() - 86_400_000).toISOString(),
    ...overrides,
  };
}

// ── 1. reps_count ─────────────────────────────────────────────────────────────

test('reps_count: satisfied when totalReps >= target', async () => {
  const bounty = makeBounty({type: 'reps_count', targetReps: 100});
  const result = await CRITERION_HANDLERS.reps_count(bounty, {totalReps: 150});
  assert.strictEqual(result.satisfied, true);
  assert.strictEqual(result.currentValue, 150);
});

test('reps_count: not satisfied when totalReps < target', async () => {
  const bounty = makeBounty({type: 'reps_count', targetReps: 200});
  const result = await CRITERION_HANDLERS.reps_count(bounty, {totalReps: 50});
  assert.strictEqual(result.satisfied, false);
  assert.strictEqual(result.currentValue, 50);
});

test('reps_count: exactly at threshold is satisfied', async () => {
  const bounty = makeBounty({type: 'reps_count', targetReps: 100});
  const result = await CRITERION_HANDLERS.reps_count(bounty, {totalReps: 100});
  assert.strictEqual(result.satisfied, true);
});

test('reps_count: zero totalReps context returns false', async () => {
  const bounty = makeBounty({type: 'reps_count', targetReps: 50});
  const result = await CRITERION_HANDLERS.reps_count(bounty, {});
  assert.strictEqual(result.satisfied, false);
  assert.strictEqual(result.currentValue, 0);
});

test('reps_count: drill filter path — Cone Drill matches (30 reps)', async () => {
  // The mock above returns 1 rep doc with Cone Drill: 3 sets × 10 = 30 reps.
  const bounty = makeBounty({
    type: 'reps_count',
    targetReps: 20,
    drillNameFilter: 'cone',
  });
  const result = await CRITERION_HANDLERS.reps_count(bounty, {totalReps: 0});
  // 3 sets × 10 reps = 30 → satisfied
  assert.strictEqual(result.satisfied, true);
  assert.strictEqual(result.currentValue, 30);
});

test('reps_count: drill filter — target higher than filtered reps not satisfied', async () => {
  const bounty = makeBounty({
    type: 'reps_count',
    targetReps: 100,
    drillNameFilter: 'cone',
  });
  const result = await CRITERION_HANDLERS.reps_count(bounty, {totalReps: 0});
  assert.strictEqual(result.satisfied, false);
});

// ── 2. workout_volume_kj ──────────────────────────────────────────────────────

test('workout_volume_kj: satisfied when KJ >= target', async () => {
  // 200 minutes × 0.75 = 150 KJ
  const bounty = makeBounty({type: 'workout_volume_kj', targetKj: 100});
  const result = await CRITERION_HANDLERS.workout_volume_kj(bounty, {totalMinutes: 200});
  assert.strictEqual(result.satisfied, true);
  assert.strictEqual(result.currentValue, 150);
});

test('workout_volume_kj: not satisfied when KJ < target', async () => {
  // 100 minutes × 0.75 = 75 KJ < 100
  const bounty = makeBounty({type: 'workout_volume_kj', targetKj: 100});
  const result = await CRITERION_HANDLERS.workout_volume_kj(bounty, {totalMinutes: 100});
  assert.strictEqual(result.satisfied, false);
  assert.strictEqual(result.currentValue, 75);
});

test('workout_volume_kj: zero minutes returns currentValue 0', async () => {
  const bounty = makeBounty({type: 'workout_volume_kj', targetKj: 10});
  const result = await CRITERION_HANDLERS.workout_volume_kj(bounty, {totalMinutes: 0});
  assert.strictEqual(result.satisfied, false);
  assert.strictEqual(result.currentValue, 0);
});

test('workout_volume_kj: missing context returns currentValue 0', async () => {
  const bounty = makeBounty({type: 'workout_volume_kj', targetKj: 10});
  const result = await CRITERION_HANDLERS.workout_volume_kj(bounty, {});
  assert.strictEqual(result.currentValue, 0);
  assert.strictEqual(result.satisfied, false);
});

// ── 3. streak_length ──────────────────────────────────────────────────────────

test('streak_length: satisfied when streakDays >= targetDays', async () => {
  const bounty = makeBounty({type: 'streak_length', targetDays: 7});
  const result = await CRITERION_HANDLERS.streak_length(bounty, {streakDays: 10});
  assert.strictEqual(result.satisfied, true);
  assert.strictEqual(result.currentValue, 10);
});

test('streak_length: exactly at target is satisfied', async () => {
  const bounty = makeBounty({type: 'streak_length', targetDays: 7});
  const result = await CRITERION_HANDLERS.streak_length(bounty, {streakDays: 7});
  assert.strictEqual(result.satisfied, true);
});

test('streak_length: not satisfied when streakDays < targetDays', async () => {
  const bounty = makeBounty({type: 'streak_length', targetDays: 14});
  const result = await CRITERION_HANDLERS.streak_length(bounty, {streakDays: 5});
  assert.strictEqual(result.satisfied, false);
});

test('streak_length: missing context defaults to 0', async () => {
  const bounty = makeBounty({type: 'streak_length', targetDays: 3});
  const result = await CRITERION_HANDLERS.streak_length(bounty, {});
  assert.strictEqual(result.satisfied, false);
  assert.strictEqual(result.currentValue, 0);
});

// ── 4. gpa_threshold ─────────────────────────────────────────────────────────

test('gpa_threshold: satisfied when gpa >= minimumGpa', async () => {
  const bounty = makeBounty({type: 'gpa_threshold', minimumGpa: 3.5});
  const result = await CRITERION_HANDLERS.gpa_threshold(bounty, {gpa: 3.8});
  assert.strictEqual(result.satisfied, true);
  assert.strictEqual(result.currentValue, 3.8);
});

test('gpa_threshold: exactly at minimum is satisfied', async () => {
  const bounty = makeBounty({type: 'gpa_threshold', minimumGpa: 3.0});
  const result = await CRITERION_HANDLERS.gpa_threshold(bounty, {gpa: 3.0});
  assert.strictEqual(result.satisfied, true);
});

test('gpa_threshold: not satisfied when gpa < minimumGpa', async () => {
  const bounty = makeBounty({type: 'gpa_threshold', minimumGpa: 3.5});
  const result = await CRITERION_HANDLERS.gpa_threshold(bounty, {gpa: 3.2});
  assert.strictEqual(result.satisfied, false);
});

test('gpa_threshold: missing gpa in context returns 0', async () => {
  const bounty = makeBounty({type: 'gpa_threshold', minimumGpa: 2.0});
  const result = await CRITERION_HANDLERS.gpa_threshold(bounty, {});
  assert.strictEqual(result.satisfied, false);
  assert.strictEqual(result.currentValue, 0);
});

// ── 5. mastery_node_unlock ────────────────────────────────────────────────────

test('mastery_node_unlock: satisfied when nodeId matches and status is unlocked', async () => {
  const bounty = makeBounty({type: 'mastery_node_unlock', nodeId: 'node-pace', nodeLabel: 'Pace', requiredStatus: 'unlocked'});
  const result = await CRITERION_HANDLERS.mastery_node_unlock(bounty, {nodeId: 'node-pace', nodeStatus: 'unlocked'});
  assert.strictEqual(result.satisfied, true);
  assert.strictEqual(result.currentValue, 1);
});

test('mastery_node_unlock: mastered satisfies unlocked requirement', async () => {
  // STATUS_ORDER: locked < fog < unlocked < mastered
  const bounty = makeBounty({type: 'mastery_node_unlock', nodeId: 'node-pace', nodeLabel: 'Pace', requiredStatus: 'unlocked'});
  const result = await CRITERION_HANDLERS.mastery_node_unlock(bounty, {nodeId: 'node-pace', nodeStatus: 'mastered'});
  assert.strictEqual(result.satisfied, true);
});

test('mastery_node_unlock: locked does NOT satisfy unlocked requirement', async () => {
  const bounty = makeBounty({type: 'mastery_node_unlock', nodeId: 'node-pace', nodeLabel: 'Pace', requiredStatus: 'unlocked'});
  const result = await CRITERION_HANDLERS.mastery_node_unlock(bounty, {nodeId: 'node-pace', nodeStatus: 'locked'});
  assert.strictEqual(result.satisfied, false);
});

test('mastery_node_unlock: wrong nodeId is not satisfied', async () => {
  const bounty = makeBounty({type: 'mastery_node_unlock', nodeId: 'node-pace', nodeLabel: 'Pace'});
  const result = await CRITERION_HANDLERS.mastery_node_unlock(bounty, {nodeId: 'node-agility', nodeStatus: 'mastered'});
  assert.strictEqual(result.satisfied, false);
  assert.strictEqual(result.currentValue, 0);
});

test('mastery_node_unlock: mastered requirement — unlocked is insufficient', async () => {
  const bounty = makeBounty({type: 'mastery_node_unlock', nodeId: 'node-pace', nodeLabel: 'Pace', requiredStatus: 'mastered'});
  const result = await CRITERION_HANDLERS.mastery_node_unlock(bounty, {nodeId: 'node-pace', nodeStatus: 'unlocked'});
  assert.strictEqual(result.satisfied, false);
});

// ── 6. cv_verified_drill (deferred sub-track) ─────────────────────────────────

test('cv_verified_drill: returns false when no verifications exist', async () => {
  const bounty = makeBounty({type: 'cv_verified_drill', drillSlug: 'pull-up', minConfidence: 0.85, requiredReps: 10});
  const result = await CRITERION_HANDLERS.cv_verified_drill(bounty, {});
  // Mock returns empty docs, so no verified reps.
  assert.strictEqual(result.satisfied, false);
  assert.strictEqual(result.currentValue, 0);
});

// ── Summary ───────────────────────────────────────────────────────────────────

setTimeout(() => {
  console.log('');
  console.log(`bountyVerification.test.js — ${passed + failed} tests`);
  console.log(`  passed : ${passed}`);
  console.log(`  failed : ${failed}`);
  if (failed > 0) process.exit(1);
}, 500);
