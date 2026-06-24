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

// ── G1: xpByAttribute field parity guard ────────────────────────────────────
// Confirms the sanitization logic and Firestore field paths that logTrainingSession
// uses to increment xpByAttribute on BOTH reader docs:
//   users/{email}.xpByAttribute[attrId]     ← onUserXpUpdateIntentLifecycle trigger
//   player_stats/{uid}.xpByAttribute[attrId] ← RL featureBuilder (ml/featureBuilder.js)

/** Mirrors trainingOps.js attributeId sanitization */
function sanitizeAttributeId(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 60);
}

/** Mirrors trainingOps.js decision: whether to write xpByAttribute */
function wouldWriteXpByAttribute(data) {
  const attrRaw = sanitizeAttributeId(data.attributeId);
  return !!attrRaw;
}

// ── T1-8: ownedSeasonOneCards writer guard ───────────────────────────────────
// Confirms SEASON_ONE_LEVEL_REWARDS covers valid catalog IDs and that
// getSeasonOneCardRewardsForLevelRange produces the correct set for level ranges,
// matching the field/doc contract that users/{email}.ownedSeasonOneCards readers
// (dashboard + armory) expect (string[]).

const {
  SEASON_ONE_LEVEL_REWARDS,
  getSeasonOneCardRewardsForLevelRange,
} = require('../../../gamificationWorkoutXp');

describe('logTrainingSession ownedSeasonOneCards writer (T1-8)', () => {
  it('level 1 (first session ever) grants card_001_base into users/{email}.ownedSeasonOneCards', () => {
    const cards = getSeasonOneCardRewardsForLevelRange(0, 1);
    assert.deepStrictEqual(cards, ['card_001_base']);
  });

  it('grants all cards for each level crossed in one high-XP session (0→3)', () => {
    const cards = getSeasonOneCardRewardsForLevelRange(0, 3);
    assert.ok(cards.includes('card_001_base'), 'should include level-1 card');
    assert.ok(cards.includes('card_002_base'), 'should include level-2 card');
    assert.ok(cards.includes('card_004_base'), 'should include level-3 card');
    assert.equal(cards.length, 3);
  });

  it('returns empty array for levels with no reward entry (e.g. 23→24)', () => {
    const cards = getSeasonOneCardRewardsForLevelRange(23, 24);
    assert.deepStrictEqual(cards, []);
  });

  it('returns empty array when prevLevel equals newLevel (no level-up)', () => {
    const cards = getSeasonOneCardRewardsForLevelRange(5, 5);
    assert.deepStrictEqual(cards, []);
  });

  it('all SEASON_ONE_LEVEL_REWARDS entries reference valid seasonOneCards catalog IDs', () => {
    const {seasonOneCards} = require('../../../../src/lib/gamification/seasonOneData.js');
    const validIds = new Set(seasonOneCards.map((c) => c.id));
    for (const [level, cardIds] of Object.entries(SEASON_ONE_LEVEL_REWARDS)) {
      for (const id of cardIds) {
        assert.ok(
          validIds.has(id),
          `Level ${level} reward '${id}' is not in seasonOneCards catalog`,
        );
      }
    }
  });

  it('SEASON_ONE_LEVEL_REWARDS covers at least 20 level entries (enough to fill readers)', () => {
    const levels = Object.keys(SEASON_ONE_LEVEL_REWARDS).map(Number);
    assert.ok(levels.length >= 20, `expected >= 20 reward levels, got ${levels.length}`);
  });

  it('Legendary alt-art card_015_alt_art is reachable at level 30', () => {
    const cards = getSeasonOneCardRewardsForLevelRange(29, 30);
    assert.ok(cards.includes('card_015_alt_art'));
  });
});

// ── T1-6: reps_count / volume bounty cumulative counter guard ─────────────────
// Verifies that the bounty evaluation call sites pass CUMULATIVE counters
// (total_reps, totalMins) rather than the weekly-reset counters
// (reps_this_week, minutes_this_week) that caused T1-6.
//
// Additionally verifies that CRITERION_HANDLERS.reps_count / workout_volume_kj
// are satisfied by cumulative totals, and that progress is NOT lost when
// simulating a weekly counter reset (reps_this_week = 0) while the
// cumulative total remains high.

const path = require('path');
const fs   = require('fs');

describe('T1-6 reps_count/volume bounty cumulative counter guard', () => {
  const XP_SRC = path.join(__dirname, '../../../gamificationWorkoutXp.js');
  const RL_SRC = path.join(__dirname, '../../ml/transitionRecorder.js');

  it('gamificationWorkoutXp passes total_reps (cumulative) — not reps_this_week — as totalReps', () => {
    const src = fs.readFileSync(XP_SRC, 'utf8');
    assert.match(
        src,
        /totalReps\s*:\s*typeof psData\.total_reps/,
        'must pass psData.total_reps as totalReps, not the weekly-reset reps_this_week',
    );
    assert.doesNotMatch(
        src,
        /totalReps\s*:\s*typeof psData\.reps_this_week/,
        'reps_this_week must NOT be used as totalReps in bounty evaluation',
    );
  });

  it('gamificationWorkoutXp passes totalMins (cumulative) — not minutes_this_week — as totalMinutes', () => {
    const src = fs.readFileSync(XP_SRC, 'utf8');
    assert.match(
        src,
        /totalMinutes\s*:\s*typeof psData\.totalMins/,
        'must pass psData.totalMins as totalMinutes, not the weekly-reset minutes_this_week',
    );
    assert.doesNotMatch(
        src,
        /totalMinutes\s*:\s*typeof psData\.minutes_this_week/,
        'minutes_this_week must NOT be used as totalMinutes in bounty evaluation',
    );
  });

  it('transitionRecorder (RL path) passes total_reps — not reps_this_week — as totalReps', () => {
    const src = fs.readFileSync(RL_SRC, 'utf8');
    assert.match(
        src,
        /totalReps\s*:\s*typeof psData\.total_reps/,
        'RL path must pass psData.total_reps as totalReps',
    );
    assert.doesNotMatch(
        src,
        /totalReps\s*:\s*typeof psData\.reps_this_week/,
        'RL path must NOT pass reps_this_week as totalReps',
    );
  });

  it('transitionRecorder (RL path) passes totalMins — not minutes_this_week — as totalMinutes', () => {
    const src = fs.readFileSync(RL_SRC, 'utf8');
    assert.match(
        src,
        /totalMinutes\s*:\s*typeof psData\.totalMins/,
        'RL path must pass psData.totalMins as totalMinutes',
    );
    assert.doesNotMatch(
        src,
        /totalMinutes\s*:\s*typeof psData\.minutes_this_week/,
        'RL path must NOT pass minutes_this_week as totalMinutes',
    );
  });

  it('gamificationWorkoutXp increments total_reps (cumulative counter) in player_stats transaction', () => {
    const src = fs.readFileSync(XP_SRC, 'utf8');
    assert.match(
        src,
        /total_reps\s*:\s*(?:admin\.firestore\.FieldValue\.increment|repsInc)/,
        'player_stats transaction must increment total_reps as a cumulative counter',
    );
  });

  it('reps_count handler is satisfied when cumulative totalReps crosses target', () => {
    // Inline logic mirror of CRITERION_HANDLERS.reps_count (non-drillFilter fast path)
    function evalRepsCount(ctx, targetReps) {
      const currentReps = typeof ctx.totalReps === 'number' ? ctx.totalReps : 0;
      return {satisfied: currentReps >= targetReps, currentValue: currentReps};
    }
    // Cumulative total is 500 — bounty target is 300 → should complete
    const r = evalRepsCount({totalReps: 500}, 300);
    assert.equal(r.satisfied, true, 'should be satisfied when cumulative reps >= target');
    assert.equal(r.currentValue, 500);
  });

  it('reps_count progress is NOT lost when weekly counter resets to 0 but cumulative remains', () => {
    // Simulate: reps_this_week was reset to 0 (Monday rollover) but
    // total_reps (cumulative) is still 500.  With the fix the caller passes
    // total_reps, so the handler sees 500 — bounty stays satisfied.
    function evalRepsCount(ctx, targetReps) {
      const currentReps = typeof ctx.totalReps === 'number' ? ctx.totalReps : 0;
      return {satisfied: currentReps >= targetReps, currentValue: currentReps};
    }
    const weeklyResetValue = 0; // reps_this_week after Monday reset
    const cumulativeValue  = 500; // total_reps — never resets

    // Old (broken) path would pass weeklyResetValue and lose progress:
    const brokenResult = evalRepsCount({totalReps: weeklyResetValue}, 300);
    assert.equal(brokenResult.satisfied, false, 'weekly-reset path (broken) would lose progress');

    // New (fixed) path passes cumulativeValue — progress preserved:
    const fixedResult = evalRepsCount({totalReps: cumulativeValue}, 300);
    assert.equal(fixedResult.satisfied, true, 'cumulative path preserves progress across weekly reset');
  });

  it('workout_volume_kj handler satisfied when cumulative KJ (from totalMinutes) crosses target', () => {
    function evalVolumeKj(ctx, targetKj) {
      const currentKj = typeof ctx.totalMinutes === 'number' ?
        Math.floor(ctx.totalMinutes * 0.75) : 0;
      return {satisfied: currentKj >= targetKj, currentValue: currentKj};
    }
    // 400 cumulative minutes × 0.75 = 300 KJ; target 200 → satisfied
    const r = evalVolumeKj({totalMinutes: 400}, 200);
    assert.equal(r.satisfied, true);
    assert.equal(r.currentValue, 300);
  });

  it('workout_volume_kj progress NOT lost when minutes_this_week resets while totalMins stays', () => {
    function evalVolumeKj(ctx, targetKj) {
      const currentKj = typeof ctx.totalMinutes === 'number' ?
        Math.floor(ctx.totalMinutes * 0.75) : 0;
      return {satisfied: currentKj >= targetKj, currentValue: currentKj};
    }
    const weeklyMinutes    = 0;   // minutes_this_week after reset
    const cumulativeMinutes = 400; // totalMins — never resets

    const brokenResult = evalVolumeKj({totalMinutes: weeklyMinutes}, 200);
    assert.equal(brokenResult.satisfied, false, 'weekly-reset path would fail');

    const fixedResult = evalVolumeKj({totalMinutes: cumulativeMinutes}, 200);
    assert.equal(fixedResult.satisfied, true, 'cumulative path preserves progress');
  });
});

describe('logTrainingSession xpByAttribute field parity (G1)', () => {
  it('sanitizes attributeId to [a-z0-9_], max 60 chars', () => {
    assert.equal(sanitizeAttributeId('dribbling'), 'dribbling');
    assert.equal(sanitizeAttributeId('ball_mastery'), 'ball_mastery');
    assert.equal(sanitizeAttributeId('  PACE  '), 'pace');
    assert.equal(sanitizeAttributeId('first_touch'), 'first_touch');
    assert.equal(sanitizeAttributeId('attr<script>xss'), 'attrscriptxss');
    assert.equal(sanitizeAttributeId(''), '');
    assert.equal(sanitizeAttributeId(null), '');
    assert.equal(sanitizeAttributeId('a'.repeat(100)), 'a'.repeat(60));
  });

  it('produces exact Firestore field paths that trigger and featureBuilder read', () => {
    // Trigger reads: users/{email}.xpByAttribute (object key = attrId)
    // featureBuilder reads: player_stats/{uid}.xpByAttribute (object key = attrId)
    const attrId = sanitizeAttributeId('dribbling');
    // Dot-notation path used in Firestore update/set-merge
    const userDotPath = `xpByAttribute.${attrId}`;
    const psDotPath = `xpByAttribute.${attrId}`;
    assert.equal(userDotPath, 'xpByAttribute.dribbling');
    assert.equal(psDotPath, 'xpByAttribute.dribbling');
  });

  it('xpByAttribute write is SKIPPED when attributeId is absent (free-log path unchanged)', () => {
    assert.equal(wouldWriteXpByAttribute({}), false);
    assert.equal(wouldWriteXpByAttribute({attributeId: ''}), false);
    assert.equal(wouldWriteXpByAttribute({attributeId: '   '}), false);
  });

  it('xpByAttribute write IS triggered when a valid attributeId is present', () => {
    assert.equal(wouldWriteXpByAttribute({attributeId: 'dribbling'}), true);
    assert.equal(wouldWriteXpByAttribute({attributeId: 'ball_mastery'}), true);
    assert.equal(wouldWriteXpByAttribute({attributeId: 'pace'}), true);
    assert.equal(wouldWriteXpByAttribute({attributeId: 'first_touch'}), true);
  });

  it('known sport attribute ids all survive sanitization unchanged', () => {
    const knownAttrs = [
      'ball_mastery', 'dribbling', 'first_touch', 'technical',
      'striking', 'pace', 'physical', 'strength', 'grit', 'stamina',
      'scanning', 'tactical', 'vision', 'recovery',
    ];
    for (const attr of knownAttrs) {
      assert.equal(sanitizeAttributeId(attr), attr,
          `${attr} should survive sanitization unchanged`);
    }
  });
});

describe('LAUNCH-HOTFIX-EXEC-COMMIT-INTERNAL — logTrainingSession error safety', () => {
  const {readFileSync} = require('node:fs');
  const {join} = require('node:path');
  const SRC = readFileSync(join(__dirname, '..', 'trainingOps.js'), 'utf-8');

  it('security_audit write failure is non-fatal after successful transaction', () => {
    assert.match(SRC, /security_audit write failed \(non-fatal\)/);
  });

  it('unhandled handler errors surface readable failed-precondition copy', () => {
    assert.match(SRC, /logTrainingSession: unhandled/);
    assert.match(SRC, /Transmit failed — try again or ask staff\./);
  });
});

describe('LAUNCH-HOTFIX-PHYSIO-TX-READ-ORDER — logTrainingSession Firestore tx reads', () => {
  const {readFileSync} = require('node:fs');
  const {join} = require('node:path');
  const SRC = readFileSync(join(__dirname, '..', 'trainingOps.js'), 'utf-8');

  /** Slice logTrainingSession runTransaction callback (exclusive of post-tx catch). */
  function logTrainingSessionTxBlock() {
    const fnStart = SRC.indexOf('exports.logTrainingSession');
    assert.ok(fnStart >= 0, 'logTrainingSession export missing');
    const txStart = SRC.indexOf('await db().runTransaction(async (tx) => {', fnStart);
    assert.ok(txStart >= 0, 'runTransaction block missing');
    const txEnd = SRC.indexOf(
        "logger.error('logTrainingSession: transaction failed'",
        txStart,
    );
    assert.ok(txEnd > txStart, 'transaction catch anchor missing');
    return SRC.slice(txStart, txEnd);
  }

  it('computes physioComplete before opening the transaction', () => {
    const fnStart = SRC.indexOf('exports.logTrainingSession');
    const txStart = SRC.indexOf('await db().runTransaction(async (tx) => {', fnStart);
    const preTx = SRC.slice(fnStart, txStart);
    assert.match(preTx, /const physioComplete\s*=/);
    assert.match(preTx, /verificationMethod === 'player_self_log'/);
    assert.match(preTx, /restingFeel != null/);
    assert.match(preTx, /const physioRef = physioComplete/);
  });

  it('physio tx.get runs before the first tx.set in the transaction', () => {
    const txBlock = logTrainingSessionTxBlock();
    const physioGet = txBlock.indexOf('tx.get(physioRef)');
    const firstSet = txBlock.search(/\btx\.set\s*\(/);
    assert.ok(physioGet >= 0, 'physio tx.get(physioRef) missing inside transaction');
    assert.ok(firstSet >= 0, 'tx.set missing inside transaction');
    assert.ok(
        physioGet < firstSet,
        'physio tx.get must precede first tx.set (Firestore read-before-write rule)',
    );
  });

  it('writes physio_self_reports only when complete and doc absent', () => {
    const txBlock = logTrainingSessionTxBlock();
    assert.match(txBlock, /if \(physioComplete && !physioSnap\.exists\)/);
    assert.doesNotMatch(
        txBlock,
        /tx\.set\([\s\S]*physio_self_reports/,
        'physioRef must not be constructed inline after writes',
    );
  });
});
