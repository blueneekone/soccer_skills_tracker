/**
 * trackB2Cadence.guard.test.js — Track B slice B2 (per-assignment cadence/frequency)
 * Authority: functions/src/domains/trainingOps.js · normalizePrescription
 *
 * normalizePrescription is the server-side trust boundary for the coach-supplied
 * prescription. B2 adds an optional cadence sub-object:
 *   - cadence.sessionsPerWindow: integer 1–21 (else throw)
 *   - cadence.windowDays: integer 1–30 (else throw)
 *   - entire cadence object omitted when absent/null
 *
 * Runnable under: node --test (functions `npm test`). This file uses the same
 * behavioral-mirror + source-scan pattern as trackB1Prescription.guard.test.js.
 *
 * Run: node --test functions/src/domains/__tests__/trackB2Cadence.guard.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const TRAINING_OPS = join(__dirname, '..', 'trainingOps.js');
const SRC = readFileSync(TRAINING_OPS, 'utf-8');

/**
 * Behavioral mirror of cadence normalization in normalizePrescription.
 * Mirrors the exact validation logic in trainingOps.js.
 * Returns the normalized cadence object, or undefined when absent/invalid.
 * Throws a descriptive error when the field is present but invalid.
 * @param {unknown} rawCadence
 * @returns {{ sessionsPerWindow: number, windowDays: number } | undefined}
 */
function normalizeCadence(rawCadence) {
  if (rawCadence === undefined || rawCadence === null) return undefined;
  if (typeof rawCadence !== 'object' || Array.isArray(rawCadence)) {
    throw new Error('prescription.cadence must be an object.');
  }
  const spw = Number(rawCadence.sessionsPerWindow);
  const wd = Number(rawCadence.windowDays);
  if (!Number.isFinite(spw) || spw < 1 || spw > 21 || Math.floor(spw) !== spw) {
    throw new Error('prescription.cadence.sessionsPerWindow must be an integer 1–21.');
  }
  if (!Number.isFinite(wd) || wd < 1 || wd > 30 || Math.floor(wd) !== wd) {
    throw new Error('prescription.cadence.windowDays must be an integer 1–30.');
  }
  return {sessionsPerWindow: Math.floor(spw), windowDays: Math.floor(wd)};
}

describe('B2 — normalizePrescription cadence trust boundary (behavioral mirror)', () => {
  it('omits cadence when absent (undefined)', () => {
    assert.equal(normalizeCadence(undefined), undefined);
  });

  it('omits cadence when null', () => {
    assert.equal(normalizeCadence(null), undefined);
  });

  it('accepts sessionsPerWindow=1 (minimum)', () => {
    assert.deepEqual(normalizeCadence({sessionsPerWindow: 1, windowDays: 7}), {sessionsPerWindow: 1, windowDays: 7});
  });

  it('accepts sessionsPerWindow=21 (maximum)', () => {
    assert.deepEqual(normalizeCadence({sessionsPerWindow: 21, windowDays: 7}), {sessionsPerWindow: 21, windowDays: 7});
  });

  it('rejects sessionsPerWindow=0 (below minimum)', () => {
    assert.throws(() => normalizeCadence({sessionsPerWindow: 0, windowDays: 7}), /sessionsPerWindow/);
  });

  it('rejects sessionsPerWindow=22 (above maximum)', () => {
    assert.throws(() => normalizeCadence({sessionsPerWindow: 22, windowDays: 7}), /sessionsPerWindow/);
  });

  it('rejects non-integer sessionsPerWindow (fractional)', () => {
    assert.throws(() => normalizeCadence({sessionsPerWindow: 3.5, windowDays: 7}), /sessionsPerWindow/);
  });

  it('accepts windowDays=1 (minimum)', () => {
    assert.deepEqual(normalizeCadence({sessionsPerWindow: 3, windowDays: 1}), {sessionsPerWindow: 3, windowDays: 1});
  });

  it('accepts windowDays=30 (maximum)', () => {
    assert.deepEqual(normalizeCadence({sessionsPerWindow: 3, windowDays: 30}), {sessionsPerWindow: 3, windowDays: 30});
  });

  it('rejects windowDays=0 (below minimum)', () => {
    assert.throws(() => normalizeCadence({sessionsPerWindow: 3, windowDays: 0}), /windowDays/);
  });

  it('rejects windowDays=31 (above maximum)', () => {
    assert.throws(() => normalizeCadence({sessionsPerWindow: 3, windowDays: 31}), /windowDays/);
  });

  it('rejects non-integer windowDays (fractional)', () => {
    assert.throws(() => normalizeCadence({sessionsPerWindow: 3, windowDays: 7.5}), /windowDays/);
  });

  it('rejects non-object cadence (string)', () => {
    assert.throws(() => normalizeCadence('weekly'), /must be an object/);
  });

  it('rejects array cadence', () => {
    assert.throws(() => normalizeCadence([3, 7]), /must be an object/);
  });
});

describe('B2 — source-scan: trainingOps.js normalizePrescription enforces cadence boundary', () => {
  it('validates cadence.sessionsPerWindow 1–21', () => {
    assert.match(
        SRC,
        /spw\s*<\s*1\s*\|\|\s*spw\s*>\s*21/,
    );
  });

  it('validates cadence.windowDays 1–30', () => {
    assert.match(
        SRC,
        /wd\s*<\s*1\s*\|\|\s*wd\s*>\s*30/,
    );
  });

  it('requires integer sessionsPerWindow (floor check)', () => {
    assert.match(
        SRC,
        /Math\.floor\(spw\)\s*!==\s*spw/,
    );
  });

  it('requires integer windowDays (floor check)', () => {
    assert.match(
        SRC,
        /Math\.floor\(wd\)\s*!==\s*wd/,
    );
  });

  it('only emits cadence on output when valid', () => {
    assert.match(SRC, /if\s*\(cadence\)\s*out\.cadence\s*=\s*cadence;/);
  });

  it('throws HttpsError for non-object cadence', () => {
    assert.match(SRC, /prescription\.cadence must be an object/);
  });

  it('throws HttpsError for sessionsPerWindow out of range', () => {
    assert.match(SRC, /sessionsPerWindow must be an integer 1/);
  });

  it('throws HttpsError for windowDays out of range', () => {
    assert.match(SRC, /windowDays must be an integer 1/);
  });
});

describe('B2 — intent lifecycle cadence fulfillment gate (source-scan)', () => {
  it('gates intent fulfillment on cadence session count when prescription has cadence', () => {
    assert.match(SRC, /countCadenceSessionsForAttribute/);
    assert.match(SRC, /sessionCount < cadence\.sessionsPerWindow/);
  });

  it('exports onDrillCompletionIntentLifecycle for final-session fulfillment', () => {
    assert.match(SRC, /exports\.onDrillCompletionIntentLifecycle/);
  });

  it('logTrainingSession mirrors complete physio payload to physio_self_reports', () => {
    assert.match(SRC, /physio_self_reports/);
    assert.match(SRC, /source: 'logTrainingSession'/);
    assert.match(SRC, /restingFeel != null/);
  });

  it('logTrainingSession rejects second cadence session same UTC day', () => {
    assert.match(SRC, /Cadence limit: one session per day toward this assignment/);
    assert.match(SRC, /cadenceFromIntentPrescription\(intentSnap\.data\(\)\.prescription\)/);
  });

  it('countCadenceSessionsForAttribute counts distinct UTC days', () => {
    assert.match(SRC, /distinctDays\.add\(new Date\(ms\)\.toISOString\(\)\.slice\(0, 10\)\)/);
    assert.match(SRC, /return distinctDays\.size/);
  });
});
