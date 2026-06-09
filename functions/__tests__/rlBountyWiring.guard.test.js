/**
 * rlBountyWiring.guard.test.js — T1-13
 *
 * Source-scan regression guard: asserts that the RL transition recorder
 * (onWorkoutLogCreated) is wired to call evaluateActiveBountiesForPlayer
 * after writing an rl_transitions document.
 *
 * Without this wiring, any bounty that gates on reps_count,
 * workout_volume_kj, or streak_length will never advance for workouts
 * that came through the adaptive-policy (RL) flow — even though the
 * normal submitWorkoutRep path (grantTrainingXpAfterRepCreated) does
 * call the same evaluator.
 *
 * Run: node --test functions/__tests__/rlBountyWiring.guard.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const {join} = require('node:path');

const FUNCTIONS_ROOT = join(__dirname, '..');
const TRANSITION_RECORDER = join(FUNCTIONS_ROOT, 'src/ml/transitionRecorder.js');
const BOUNTY_VERIFICATION  = join(FUNCTIONS_ROOT, 'bountyVerification.js');
const GAMIFICATION_XP      = join(FUNCTIONS_ROOT, 'gamificationWorkoutXp.js');

describe('T1-13 RL bounty wiring — transitionRecorder imports evaluator', () => {
  it('transitionRecorder.js imports evaluateActiveBountiesForPlayer from bountyVerification', () => {
    assert.ok(existsSync(TRANSITION_RECORDER), 'transitionRecorder.js must exist');
    const src = readFileSync(TRANSITION_RECORDER, 'utf-8');
    assert.match(
        src,
        /require\(['"]\.\.\/\.\.\/bountyVerification['"]\)/,
        'must require ../../bountyVerification',
    );
    assert.match(
        src,
        /evaluateActiveBountiesForPlayer/,
        'must reference evaluateActiveBountiesForPlayer',
    );
  });

  it('transitionRecorder.js calls evaluateActiveBountiesForPlayer inside onWorkoutLogCreated', () => {
    const src = readFileSync(TRANSITION_RECORDER, 'utf-8');
    // The call must appear after the rl_transitions write (i.e. after tidRef.set).
    const transitionWriteIdx = src.indexOf("collection('rl_transitions')");
    const bountyCallIdx      = src.indexOf('evaluateActiveBountiesForPlayer(db()');
    assert.ok(transitionWriteIdx >= 0, "rl_transitions write must be present");
    assert.ok(bountyCallIdx >= 0,      'evaluateActiveBountiesForPlayer call must be present');
    assert.ok(
        bountyCallIdx > transitionWriteIdx,
        'bounty eval call must appear after rl_transitions write',
    );
  });

  it('transitionRecorder.js passes triggerSource with workout_logs prefix', () => {
    const src = readFileSync(TRANSITION_RECORDER, 'utf-8');
    assert.match(src, /triggerSource:.*workout_logs/, 'triggerSource must reference workout_logs');
  });

  it('transitionRecorder.js guards bounty call with playerEmail @ check', () => {
    const src = readFileSync(TRANSITION_RECORDER, 'utf-8');
    assert.match(
        src,
        /playerEmail.*includes\(['"]@['"]\)/,
        'must guard bounty call with email @ check',
    );
  });

  it('transitionRecorder.js wraps bounty call in try/catch to isolate failures', () => {
    const src = readFileSync(TRANSITION_RECORDER, 'utf-8');
    // Expect a try block containing the bounty call
    const tryIdx   = src.lastIndexOf('try {', src.indexOf('evaluateActiveBountiesForPlayer(db()'));
    const catchIdx = src.indexOf('bountyErr', src.indexOf('evaluateActiveBountiesForPlayer(db()'));
    assert.ok(tryIdx >= 0,   'bounty call must be inside a try block');
    assert.ok(catchIdx >= 0, 'bounty call must have a catch for bountyErr');
  });
});

describe('T1-13 RL bounty wiring — bountyVerification exports evaluator', () => {
  it('bountyVerification.js exports evaluateActiveBountiesForPlayer', () => {
    assert.ok(existsSync(BOUNTY_VERIFICATION), 'bountyVerification.js must exist');
    const src = readFileSync(BOUNTY_VERIFICATION, 'utf-8');
    assert.match(
        src,
        /evaluateActiveBountiesForPlayer/,
        'must define evaluateActiveBountiesForPlayer',
    );
    assert.match(
        src,
        /module\.exports.*evaluateActiveBountiesForPlayer/s,
        'must export evaluateActiveBountiesForPlayer',
    );
  });
});

describe('T1-13 RL bounty wiring — training path parity', () => {
  it('gamificationWorkoutXp.js also calls evaluateActiveBountiesForPlayer (training-path reference)', () => {
    assert.ok(existsSync(GAMIFICATION_XP), 'gamificationWorkoutXp.js must exist');
    const src = readFileSync(GAMIFICATION_XP, 'utf-8');
    assert.match(
        src,
        /evaluateActiveBountiesForPlayer/,
        'training path must also call evaluateActiveBountiesForPlayer (parity check)',
    );
  });

  it('both call sites pass triggerSource in the event context', () => {
    const trSrc  = readFileSync(TRANSITION_RECORDER, 'utf-8');
    const gamSrc = readFileSync(GAMIFICATION_XP, 'utf-8');
    assert.match(trSrc,  /triggerSource:/, 'transitionRecorder must pass triggerSource');
    assert.match(gamSrc, /triggerSource:/, 'gamificationWorkoutXp must pass triggerSource');
  });
});
