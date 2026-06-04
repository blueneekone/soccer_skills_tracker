/**
 * transitionRecorderReward.test.js — Sprint RL-reward-calibrate
 *
 * Guards engagementTerm expectedXP vs gamificationWorkoutXp parity.
 * Run: node --test functions/__tests__/transitionRecorderReward.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');

const {calculateTrainingSessionEarnedXp} = require('../gamificationWorkoutXp');
const {computeReward, expectedXpFromLogDoc} = require('../src/ml/transitionRecorder');

const ENGAGEMENT_WEIGHT = 0.40;

const TRAINING_SESSION_FIXTURES = [
  {duration: 30, reps: 50, intensity: 'low', expected: 400},
  {duration: 45, reps: 100, intensity: 'medium', expected: 747},
  {duration: 60, reps: 200, intensity: 'high', expected: 1350},
];

/** @param {object} logDoc */
function engagementTermFor(logDoc) {
  const earnedXP = Number(logDoc.earnedXP != null ? logDoc.earnedXP : 0);
  const expectedXP = expectedXpFromLogDoc(logDoc);
  return ENGAGEMENT_WEIGHT * Math.tanh(earnedXP / expectedXP);
}

describe('computeReward engagement term — gamificationWorkoutXp parity', () => {
  it('expectedXpFromLogDoc matches calculateTrainingSessionEarnedXp', () => {
    for (const f of TRAINING_SESSION_FIXTURES) {
      const logDoc = {
        duration: f.duration,
        reps: f.reps,
        intensity: f.intensity,
        earnedXP: f.expected,
      };
      assert.equal(expectedXpFromLogDoc(logDoc), f.expected);
    }
  });

  it('engagement term uses canonical expectedXP (not legacy duration×mult×2)', () => {
    const logDoc = {
      duration: 30,
      reps: 50,
      intensity: 'medium',
      earnedXP: 400,
    };
    const reward = computeReward(logDoc, null, {}, false);
    const expected = engagementTermFor(logDoc);
    assert.ok(Math.abs(reward.engagementTerm - expected) < 1e-12);
    assert.ok(expectedXpFromLogDoc(logDoc) > 60);
  });

  it('prescription reps change expectedXP and engagement denominator', () => {
    const base = {duration: 20, intensity: 'medium', earnedXP: 350};
    const withoutReps = {...base, reps: 0};
    const withReps = {...base, reps: 60};
    assert.ok(expectedXpFromLogDoc(withReps) > expectedXpFromLogDoc(withoutReps));
    const rewardLowReps = computeReward(withoutReps, null, {}, false);
    const rewardHighReps = computeReward(withReps, null, {}, false);
    assert.ok(rewardHighReps.engagementTerm < rewardLowReps.engagementTerm);
  });

  it('intensity low/medium/high maps to logTrainingSession bands', () => {
    const duration = 30;
    const reps = 0;
    const low = expectedXpFromLogDoc({duration, reps, intensity: 'low'});
    const medium = expectedXpFromLogDoc({duration, reps, intensity: 'medium'});
    const high = expectedXpFromLogDoc({duration, reps, intensity: 'high'});
    assert.ok(low < medium);
    assert.ok(medium < high);
  });

  it('reward weights beyond engagement unchanged (adherence + grit)', () => {
    const inferLog = {
      state: {
        vector: Array(19).fill(0).map((_, i) => (i >= 13 && i <= 18 ? 1 : 0)),
        featureNames: [],
      },
      chosenAction: {intensityBucket: 'moderate'},
    };
    const logDoc = {duration: 30, reps: 0, intensity: 'medium', earnedXP: 300};
    const base = computeReward(logDoc, null, {}, false);
    const withAdherence = computeReward(logDoc, inferLog, {}, false);
    const withGrit = computeReward(logDoc, null, {}, true);
    assert.equal(withAdherence.adherenceTerm - base.adherenceTerm, 0.25);
    assert.equal(withGrit.gritBonus - base.gritBonus, 0.10);
    assert.equal(base.adherenceTerm, 0);
    assert.equal(base.gritBonus, 0);
  });
});
