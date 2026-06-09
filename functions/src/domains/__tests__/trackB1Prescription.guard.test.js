/**
 * trackB1Prescription.guard.test.js — Track B slice B1 (cues + video to players)
 * Authority: functions/src/domains/trainingOps.js · normalizePrescription
 *
 * normalizePrescription is the server-side trust boundary for the coach-supplied
 * prescription. B1 adds two optional fields carried drill→prescription→player:
 *   - videoUrl: must be http(s), <= 2048 chars, else dropped
 *   - cues:     trimmed string, truncated to 2000 chars, empty dropped
 *
 * Runnable under: node --test (functions `npm test`). This file exists because
 * intentOps.test.js is Jest-syntax and Jest is NOT installed in functions/, so
 * the B1 server-validation guards must live in a node:test file to actually run.
 *
 * Run: node --test functions/src/domains/__tests__/trackB1Prescription.guard.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const TRAINING_OPS = join(__dirname, '..', 'trainingOps.js');
const SRC = readFileSync(TRAINING_OPS, 'utf-8');

/**
 * Behavioral mirror of the videoUrl/cues normalization in normalizePrescription
 * (trainingOps.js ~1901–1919). Mirror style matches trainingOpsXp.test.js.
 * @param {unknown} raw prescription videoUrl candidate
 * @return {string|undefined}
 */
function normalizeVideoUrl(raw) {
  const v = typeof raw === 'string' ? raw.trim() : '';
  return v && (v.startsWith('http://') || v.startsWith('https://')) && v.length <= 2048 ?
    v :
    undefined;
}

/**
 * @param {unknown} raw prescription cues candidate
 * @return {string|undefined}
 */
function normalizeCues(raw) {
  const c = typeof raw === 'string' ? raw.trim() : '';
  return c ? c.slice(0, 2000) : undefined;
}

describe('B1 — normalizePrescription videoUrl trust boundary (behavioral mirror)', () => {
  it('persists a valid https videoUrl', () => {
    assert.equal(normalizeVideoUrl('https://demo.example/clip.mp4'), 'https://demo.example/clip.mp4');
  });

  it('persists a valid http videoUrl', () => {
    assert.equal(normalizeVideoUrl(' http://x.io/v '), 'http://x.io/v');
  });

  it('drops a non-http(s) scheme (ftp/javascript)', () => {
    assert.equal(normalizeVideoUrl('ftp://x.io/v'), undefined);
    assert.equal(normalizeVideoUrl('javascript:alert(1)'), undefined);
  });

  it('drops an oversized videoUrl (> 2048 chars)', () => {
    assert.equal(normalizeVideoUrl('https://x.io/' + 'a'.repeat(2049)), undefined);
  });

  it('drops non-string / empty videoUrl', () => {
    assert.equal(normalizeVideoUrl(undefined), undefined);
    assert.equal(normalizeVideoUrl(123), undefined);
    assert.equal(normalizeVideoUrl('   '), undefined);
  });
});

describe('B1 — normalizePrescription cues trust boundary (behavioral mirror)', () => {
  it('persists trimmed cues', () => {
    assert.equal(normalizeCues('  Plant foot beside ball  '), 'Plant foot beside ball');
  });

  it('truncates cues to 2000 chars', () => {
    assert.equal(normalizeCues('c'.repeat(5000)).length, 2000);
  });

  it('drops empty / whitespace-only / non-string cues', () => {
    assert.equal(normalizeCues('   '), undefined);
    assert.equal(normalizeCues(null), undefined);
    assert.equal(normalizeCues(42), undefined);
  });
});

describe('B1 — source-scan: trainingOps.js normalizePrescription enforces the boundary', () => {
  it('validates videoUrl requires http:// or https:// prefix', () => {
    assert.match(
        SRC,
        /rawVideoUrl\.startsWith\('http:\/\/'\)\s*\|\|\s*rawVideoUrl\.startsWith\('https:\/\/'\)/,
    );
  });

  it('caps videoUrl length at 2048', () => {
    assert.match(SRC, /rawVideoUrl\.length\s*<=\s*2048/);
  });

  it('truncates cues to 2000 chars', () => {
    assert.match(SRC, /rawCues\.slice\(0,\s*2000\)/);
  });

  it('only emits videoUrl / cues on the normalized output when valid', () => {
    assert.match(SRC, /if\s*\(validVideoUrl\)\s*out\.videoUrl\s*=\s*validVideoUrl;/);
    assert.match(SRC, /if\s*\(validCues\)\s*out\.cues\s*=\s*validCues;/);
  });
});

describe('B4a — source-scan: normalizePrescription sanitizes requiresParentVerification', () => {
  it('only emits requiresParentVerification when strictly equal to true', () => {
    assert.match(
        SRC,
        /raw\.requiresParentVerification\s*===\s*true[\s\S]*?out\.requiresParentVerification\s*=\s*true/,
    );
  });

  it('does NOT emit requiresParentVerification unconditionally', () => {
    // Should NOT find a bare assignment without the === true guard.
    // We verify by checking the guarded pattern exists (previous test) — here
    // we confirm there is NO unconditional assignment like `out.requiresParentVerification = raw.requiresParentVerification`.
    assert.doesNotMatch(
        SRC,
        /out\.requiresParentVerification\s*=\s*raw\.requiresParentVerification/,
    );
  });
});
