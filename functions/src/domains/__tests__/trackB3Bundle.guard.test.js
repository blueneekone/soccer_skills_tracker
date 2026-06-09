/**
 * trackB3Bundle.guard.test.js — Track B slice B3 (multi-drill bundles)
 * Authority: functions/src/domains/trainingOps.js · normalizePrescription + normalizeDrillEntry
 *
 * The prescription.drills[] bundle extension adds:
 *   - normalizeDrillEntry(raw, index): validates a single bundle entry; same rules
 *     as top-level prescription fields (sets int 1–99 required; others optional);
 *     throws HttpsError with contextual index prefix on any malformed field.
 *   - normalizePrescription drills block: validates array (1–8 entries); calls
 *     normalizeDrillEntry for each; omits drills when absent/null; throws on bad shape.
 *
 * Pattern: behavioral-mirror (mirror the exact validation rules for isolation) +
 * source-scan (regex-assert key lines in trainingOps.js).
 *
 * Runnable under: node --test
 * Run: node --test functions/src/domains/__tests__/trackB3Bundle.guard.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const TRAINING_OPS = join(__dirname, '..', 'trainingOps.js');
const SRC = readFileSync(TRAINING_OPS, 'utf-8');

// ── Behavioral mirror ──────────────────────────────────────────────────────────

/**
 * Mirror of normalizeDrillEntry — validates a single bundle drill entry.
 * Same rules as top-level prescription: sets required int 1–99; others optional.
 * @param {unknown} raw
 * @param {number} index
 */
function normalizeDrillEntry(raw, index) {
  const pfx = `prescription.drills[${index}]`;
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${pfx} must be an object.`);
  }
  const sets = Number(raw.sets);
  if (!Number.isFinite(sets) || sets < 1 || sets > 99 || Math.floor(sets) !== sets) {
    throw new Error(`${pfx}.sets must be an integer 1–99.`);
  }
  if (raw.repsPerSet !== undefined && raw.repsPerSet !== null) {
    const reps = Number(raw.repsPerSet);
    if (!Number.isFinite(reps) || reps < 1 || reps > 999 || Math.floor(reps) !== reps) {
      throw new Error(`${pfx}.repsPerSet must be an integer 1–999.`);
    }
  }
  if (raw.targetDurationMin !== undefined && raw.targetDurationMin !== null) {
    const d = Number(raw.targetDurationMin);
    if (!Number.isFinite(d) || d < 1 || d > 120) {
      throw new Error(`${pfx}.targetDurationMin must be 1–120.`);
    }
  }
  if (raw.targetRpe !== undefined && raw.targetRpe !== null) {
    const r = Number(raw.targetRpe);
    if (!Number.isFinite(r) || r < 1 || r > 10) {
      throw new Error(`${pfx}.targetRpe must be 1–10.`);
    }
  }
  return {sets: Math.floor(sets)};
}

/**
 * Mirror of the drills[] block inside normalizePrescription.
 * @param {unknown[]} rawDrills
 */
function normalizeDrillsArray(rawDrills) {
  if (rawDrills === undefined || rawDrills === null) return undefined;
  if (!Array.isArray(rawDrills)) {
    throw new Error('prescription.drills must be an array.');
  }
  if (rawDrills.length < 1 || rawDrills.length > 8) {
    throw new Error('prescription.drills must have 1–8 entries.');
  }
  return rawDrills.map((entry, i) => normalizeDrillEntry(entry, i));
}

// ── Behavioral mirror tests ────────────────────────────────────────────────────

describe('B3 — normalizeDrillEntry behavioral mirror', () => {
  it('accepts a valid drill entry (sets=1, minimal)', () => {
    const out = normalizeDrillEntry({sets: 1, drillTitle: 'Sprints'}, 0);
    assert.equal(out.sets, 1);
  });

  it('accepts sets at boundary values (1 and 99)', () => {
    assert.doesNotThrow(() => normalizeDrillEntry({sets: 1}, 0));
    assert.doesNotThrow(() => normalizeDrillEntry({sets: 99}, 0));
  });

  it('rejects sets=0 (below minimum)', () => {
    assert.throws(
      () => normalizeDrillEntry({sets: 0}, 0),
      /drills\[0\]\.sets must be an integer 1/,
    );
  });

  it('rejects sets=100 (above maximum)', () => {
    assert.throws(
      () => normalizeDrillEntry({sets: 100}, 0),
      /drills\[0\]\.sets/,
    );
  });

  it('rejects non-integer sets (fractional)', () => {
    assert.throws(
      () => normalizeDrillEntry({sets: 3.5}, 0),
      /drills\[0\]\.sets/,
    );
  });

  it('rejects non-object entry (null)', () => {
    assert.throws(
      () => normalizeDrillEntry(null, 0),
      /drills\[0\] must be an object/,
    );
  });

  it('rejects non-object entry (string)', () => {
    assert.throws(
      () => normalizeDrillEntry('bad', 0),
      /drills\[0\] must be an object/,
    );
  });

  it('rejects array entry', () => {
    assert.throws(
      () => normalizeDrillEntry([1, 2, 3], 0),
      /drills\[0\] must be an object/,
    );
  });

  it('error message includes the entry index', () => {
    assert.throws(
      () => normalizeDrillEntry({sets: 0}, 3),
      /drills\[3\]\.sets/,
    );
  });

  it('rejects repsPerSet=0', () => {
    assert.throws(
      () => normalizeDrillEntry({sets: 3, repsPerSet: 0}, 0),
      /repsPerSet must be an integer 1/,
    );
  });

  it('accepts repsPerSet=999 (maximum)', () => {
    assert.doesNotThrow(() => normalizeDrillEntry({sets: 3, repsPerSet: 999}, 0));
  });

  it('rejects repsPerSet=1000 (above maximum)', () => {
    assert.throws(
      () => normalizeDrillEntry({sets: 3, repsPerSet: 1000}, 0),
      /repsPerSet/,
    );
  });

  it('rejects targetDurationMin=0', () => {
    assert.throws(
      () => normalizeDrillEntry({sets: 3, targetDurationMin: 0}, 0),
      /targetDurationMin must be 1/,
    );
  });

  it('rejects targetDurationMin=121', () => {
    assert.throws(
      () => normalizeDrillEntry({sets: 3, targetDurationMin: 121}, 0),
      /targetDurationMin/,
    );
  });

  it('rejects targetRpe=0', () => {
    assert.throws(
      () => normalizeDrillEntry({sets: 3, targetRpe: 0}, 0),
      /targetRpe must be 1/,
    );
  });

  it('rejects targetRpe=11', () => {
    assert.throws(
      () => normalizeDrillEntry({sets: 3, targetRpe: 11}, 0),
      /targetRpe/,
    );
  });

  it('optional fields absent = no error (omitted from output)', () => {
    assert.doesNotThrow(() => normalizeDrillEntry({sets: 2}, 0));
  });
});

describe('B3 — normalizeDrillsArray behavioral mirror', () => {
  it('omits drills when undefined', () => {
    assert.equal(normalizeDrillsArray(undefined), undefined);
  });

  it('omits drills when null', () => {
    assert.equal(normalizeDrillsArray(null), undefined);
  });

  it('accepts array with 1 entry (minimum)', () => {
    const out = normalizeDrillsArray([{sets: 3, drillTitle: 'Test'}]);
    assert.equal(out.length, 1);
  });

  it('accepts array with 8 entries (maximum)', () => {
    const drills = Array.from({length: 8}, () => ({sets: 3}));
    const out = normalizeDrillsArray(drills);
    assert.equal(out.length, 8);
  });

  it('rejects array with 0 entries', () => {
    assert.throws(() => normalizeDrillsArray([]), /1–8 entries/);
  });

  it('rejects array with 9 entries (above maximum)', () => {
    const drills = Array.from({length: 9}, () => ({sets: 3}));
    assert.throws(() => normalizeDrillsArray(drills), /1–8 entries/);
  });

  it('rejects non-array drills value (object)', () => {
    assert.throws(() => normalizeDrillsArray({sets: 3}), /must be an array/);
  });

  it('throws on malformed entry within array (propagates per-entry error)', () => {
    assert.throws(
      () => normalizeDrillsArray([{sets: 3}, {sets: 0}, {sets: 2}]),
      /drills\[1\]\.sets/,
    );
  });

  it('normalizes all entries in order', () => {
    const out = normalizeDrillsArray([{sets: 3}, {sets: 5}, {sets: 1}]);
    assert.equal(out[0].sets, 3);
    assert.equal(out[1].sets, 5);
    assert.equal(out[2].sets, 1);
  });
});

// ── Source-scan tests ──────────────────────────────────────────────────────────

describe('B3 — source-scan: trainingOps.js normalizePrescription enforces drills[] boundary', () => {
  it('defines normalizeDrillEntry helper', () => {
    assert.match(SRC, /function normalizeDrillEntry/);
  });

  it('normalizeDrillEntry validates sets 1–99 with integer check', () => {
    assert.match(SRC, /sets\s*<\s*1\s*\|\|\s*sets\s*>\s*99/);
    assert.match(SRC, /Math\.floor\(sets\)\s*!==\s*sets/);
  });

  it('normalizeDrillEntry throws on non-object entry', () => {
    assert.match(SRC, /must be an object\./);
  });

  it('normalizePrescription checks drills is array', () => {
    assert.match(SRC, /prescription\.drills must be an array/);
  });

  it('normalizePrescription enforces 1–8 entry count', () => {
    assert.match(SRC, /prescription\.drills must have 1.8 entries/);
  });

  it('normalizePrescription calls normalizeDrillEntry for each entry', () => {
    assert.match(SRC, /normalizeDrillEntry\(entry,\s*i\)/);
  });

  it('normalizePrescription omits drills when absent/null', () => {
    // The guard condition: only processes when raw.drills is not undefined/null
    assert.match(SRC, /raw\.drills\s*!==\s*undefined\s*&&\s*raw\.drills\s*!==\s*null/);
  });

  it('normalizePrescription assigns out.drills from mapped entries', () => {
    assert.match(SRC, /out\.drills\s*=\s*raw\.drills\.map/);
  });

  it('normalizeDrillEntry validates targetRpe 1–10 (mirrors top-level)', () => {
    // check the entry-specific validation exists (pfx is in the string)
    assert.match(SRC, /targetRpe must be 1.10\./);
  });

  it('normalizeDrillEntry validates repsPerSet 1–999 (mirrors top-level)', () => {
    assert.match(SRC, /repsPerSet must be an integer 1.999\./);
  });
});
