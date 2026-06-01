/**
 * gamificationWorkoutXp.test.js — Sprint XP-verify (server parity)
 * Authority: functions/gamificationWorkoutXp.js
 *
 * calculateTrainingSessionEarnedXp fixtures MUST stay aligned with
 * src/lib/gamification/level.js and src/lib/gamification/__tests__/levelXp.test.ts
 *
 * Run: node --test functions/__tests__/gamificationWorkoutXp.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');

const {calculateTrainingSessionEarnedXp} = require('../gamificationWorkoutXp');

/** Same fixtures as levelXp.test.ts — update both files together */
const TRAINING_SESSION_FIXTURES = [
  {duration: 30, reps: 50, intensity: 'low', expected: 400},
  {duration: 45, reps: 100, intensity: 'medium', expected: 747},
  {duration: 60, reps: 200, intensity: 'high', expected: 1350},
];

describe('calculateTrainingSessionEarnedXp — server parity with level.js', () => {
  for (const {duration, reps, intensity, expected} of TRAINING_SESSION_FIXTURES) {
    it(`${intensity} intensity — duration=${duration}, reps=${reps} → ${expected} XP`, () => {
      assert.equal(
          calculateTrainingSessionEarnedXp({duration, reps, intensity}),
          expected,
      );
    });
  }
});
