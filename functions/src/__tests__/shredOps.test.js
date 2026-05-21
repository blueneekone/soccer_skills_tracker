/**
 * shredOps.test.js — Sprint 2.2 shredder unit tests
 */

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');

const {
  SHRED_ROOT_COLLECTIONS,
  SHRED_SENTINEL,
  resolveLastActive,
  buildShredPatch,
} = require('../domains/shredOps');

describe('shredOps', () => {
  it('SHRED_ROOT_COLLECTIONS excludes consents', () => {
    assert.ok(!SHRED_ROOT_COLLECTIONS.includes('consents'));
    assert.deepEqual(SHRED_ROOT_COLLECTIONS, ['users', 'passports']);
  });

  it('resolveLastActive prefers lastActiveAt', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    const ts = {toDate: () => d};
    const resolved = resolveLastActive({lastActiveAt: ts, updatedAt: {toDate: () => new Date()}});
    assert.equal(resolved?.toISOString(), d.toISOString());
  });

  it('buildShredPatch is idempotent for already shredded fields', () => {
    const patch = buildShredPatch(
        {playerName: SHRED_SENTINEL, displayName: 'Alice'},
        ['playerName', 'displayName'],
    );
    assert.equal(patch.playerName, undefined);
    assert.equal(patch.displayName, SHRED_SENTINEL);
    assert.equal(patch.shredStatus, 'complete');
  });

  it('buildShredPatch sets shredStatus complete', () => {
    const patch = buildShredPatch({phoneNumber: '555-0100'}, ['phoneNumber']);
    assert.equal(patch.phoneNumber, SHRED_SENTINEL);
    assert.equal(patch.shredStatus, 'complete');
  });
});
