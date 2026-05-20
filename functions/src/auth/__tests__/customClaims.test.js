'use strict';

/**
 * customClaims.test.js — Sprint 1.3 JWT claim embedding
 * Run: node functions/src/auth/__tests__/customClaims.test.js
 */

const assert = require('assert');
const {buildBaseCustomClaims} = require('../customClaims');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`       ${err.message}`);
    failed++;
  }
}

console.log('\ncustomClaims — Sprint 1.3 token embedding\n');

test('embeds clubId and role from user profile', () => {
  const claims = buildBaseCustomClaims({
    role: 'director',
    clubId: 'club-alpha',
    teamId: 'team-1',
  });
  assert.strictEqual(claims.role, 'director');
  assert.strictEqual(claims.clubId, 'club-alpha');
  assert.strictEqual(claims.teamId, 'team-1');
});

test('defaults role to player when missing', () => {
  const claims = buildBaseCustomClaims({clubId: 'club-beta'});
  assert.strictEqual(claims.role, 'player');
  assert.strictEqual(claims.clubId, 'club-beta');
});

test('returns null for empty profile', () => {
  assert.strictEqual(buildBaseCustomClaims(null), null);
});

test('coach clearance gate sets isCleared from profile', () => {
  const cleared = buildBaseCustomClaims({
    role: 'coach',
    clubId: 'club-a',
    clearance: {status: 'cleared'},
  });
  assert.strictEqual(cleared.isCleared, true);

  const pending = buildBaseCustomClaims({
    role: 'coach',
    clubId: 'club-a',
    clearance: {status: 'pending'},
  });
  assert.strictEqual(pending.isCleared, false);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
