/**
 * trainingOpsXp.test.js — Sprint XP-verify (logTrainingSession earned guard)
 * Authority: functions/src/domains/trainingOps.js · calculateTrainingSessionEarnedXp
 *
 * logTrainingSession rejects when earned < 1 before opening a transaction.
 * Run: node --test functions/src/domains/__tests__/trainingOpsXp.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');

const {calculateTrainingSessionEarnedXp} = require('../../../gamificationWorkoutXp');

/** Mirrors logTrainingSession guard at trainingOps.js earned check */
function wouldRejectZeroEarned(input) {
  const earned = calculateTrainingSessionEarnedXp(input);
  return earned < 1;
}

describe('logTrainingSession earned >= 1 guard', () => {
  it('minimum valid callable payload (duration=1, reps=0, low) earns >= 1', () => {
    const earned = calculateTrainingSessionEarnedXp({
      duration: 1,
      reps: 0,
      intensity: 'low',
    });
    assert.ok(earned >= 1);
    assert.equal(earned, 10);
    assert.equal(wouldRejectZeroEarned({duration: 1, reps: 0, intensity: 'low'}), false);
  });

  it('zero volume pre-validation edge would fail earned guard', () => {
    assert.equal(
        calculateTrainingSessionEarnedXp({duration: 0, reps: 0, intensity: 'low'}),
        0,
    );
    assert.equal(wouldRejectZeroEarned({duration: 0, reps: 0, intensity: 'low'}), true);
  });

  it('standard session fixtures pass earned guard', () => {
    const payloads = [
      {duration: 30, reps: 50, intensity: 'low'},
      {duration: 45, reps: 100, intensity: 'medium'},
      {duration: 60, reps: 200, intensity: 'high'},
    ];
    for (const p of payloads) {
      assert.ok(calculateTrainingSessionEarnedXp(p) >= 1);
      assert.equal(wouldRejectZeroEarned(p), false);
    }
  });
});
