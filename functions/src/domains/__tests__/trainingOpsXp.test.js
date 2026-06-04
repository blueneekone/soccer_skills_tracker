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

/** Mirrors subjectiveRpe normalization in trainingOps.js logDoc builder */
function parseSubjectiveRpe(data) {
  return Number.isFinite(Number(data.subjectiveRpe)) &&
      Number(data.subjectiveRpe) >= 1 &&
      Number(data.subjectiveRpe) <= 10 ?
    Math.round(Number(data.subjectiveRpe)) :
    null;
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

  it('prescription bilateral volume (3×10 both sides → 60 reps) passes earned guard', () => {
    const reps = 3 * 10 * 2;
    const payload = {duration: 20, reps, intensity: 'medium'};
    assert.ok(calculateTrainingSessionEarnedXp(payload) >= 1);
    assert.equal(wouldRejectZeroEarned(payload), false);
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

describe('logTrainingSession subjectiveRpe guard', () => {
  it('accepts Borg RPE integers 1–10 for logDoc persistence', () => {
    assert.equal(parseSubjectiveRpe({subjectiveRpe: 1}), 1);
    assert.equal(parseSubjectiveRpe({subjectiveRpe: 7}), 7);
    assert.equal(parseSubjectiveRpe({subjectiveRpe: 10}), 10);
    assert.equal(parseSubjectiveRpe({subjectiveRpe: 6.4}), 6);
  });

  it('stores null when subjectiveRpe is missing or out of range', () => {
    assert.equal(parseSubjectiveRpe({}), null);
    assert.equal(parseSubjectiveRpe({subjectiveRpe: 0}), null);
    assert.equal(parseSubjectiveRpe({subjectiveRpe: 11}), null);
    assert.equal(parseSubjectiveRpe({subjectiveRpe: 'hard'}), null);
  });
});
