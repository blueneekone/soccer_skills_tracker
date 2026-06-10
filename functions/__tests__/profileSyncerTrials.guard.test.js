'use strict';
/**
 * profileSyncerTrials.guard.test.js — Tier-2 Item 2 source-scan guards
 *
 * Verifies that profileSyncer.js:
 *   (a) prefers `playerId == uid` when joining the `trials` collection,
 *   (b) falls back to `playerEmail == email` if uid query is empty,
 *   (c) further falls back to the legacy `player == playerNameForTrials` name-string,
 *   (d) still reads `trial_scores` by `playerId == uid` (untouched path).
 *
 * Run with: node --test functions/__tests__/profileSyncerTrials.guard.test.js
 */

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const SRC = readFileSync(
  resolve(__dirname, '../src/utils/profileSyncer.js'),
  'utf8',
);

describe('profileSyncer trials join — Tier-2 Item 2 identity backlink', () => {
  it('(a) queries trials by playerId == uid (preferred stable key)', () => {
    assert.match(SRC, /\.where\('playerId',\s*'==',\s*uid\)/);
  });

  it('(b) falls back to playerEmail == email when uid query is empty', () => {
    // The email fallback must come after an .empty check on the uid snap.
    const uidQueryIdx = SRC.indexOf(".where('playerId', '==', uid)");
    const emailQueryIdx = SRC.indexOf(".where('playerEmail', '==', email)");
    assert.ok(uidQueryIdx !== -1, 'uid query not found');
    assert.ok(emailQueryIdx !== -1, 'email fallback query not found');
    assert.ok(
      emailQueryIdx > uidQueryIdx,
      'email fallback must appear after uid query',
    );
    // The .empty guard must sit between the uid and email query blocks.
    const sliceBetween = SRC.slice(uidQueryIdx, emailQueryIdx);
    assert.match(
      sliceBetween,
      /\.empty/,
      '.empty check must guard the email fallback',
    );
  });

  it('(c) falls back to legacy player == playerNameForTrials name-string', () => {
    assert.match(SRC, /\.where\('player',\s*'==',\s*playerNameForTrials\)/);
    // The name fallback must appear after the email fallback in the file.
    const emailQueryIdx = SRC.indexOf(".where('playerEmail', '==', email)");
    const nameQueryIdx = SRC.indexOf(".where('player', '==', playerNameForTrials)");
    assert.ok(nameQueryIdx > emailQueryIdx, 'name fallback must appear after email fallback');
  });

  it('(d) trial_scores path still uses playerId == uid (untouched)', () => {
    // This is the separate trial_scores block around line 302.
    assert.match(SRC, /collection\('trial_scores'\)[\s\S]*?\.where\('playerId',\s*'==',\s*uid\)/);
  });
});
