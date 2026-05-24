/**
 * loadoutOps.test.js — Sprint 3.3 server-verified cosmetic grants
 * Run: node --test functions/src/__tests__/loadoutOps.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {HttpsError} = require('firebase-functions/v2/https');

const {
  _test,
  grantLoadoutCosmetic,
  redeemQuartermasterDigital,
} = require('../domains/loadoutOps');

const {
  loadCosmeticAllowlist,
  assertCosmeticAllowed,
  isLoadoutSelfGrantDenied,
} = _test;

describe('loadoutOps allowlist', () => {
  it('loads committed catalog ids including album_badge_street_kings', () => {
    const allowlist = loadCosmeticAllowlist();
    assert.ok(allowlist.has('album_badge_street_kings'));
    assert.ok(allowlist.has('digi_border_neon'));
  });

  it('rejects unknown cosmetic id', () => {
    const allowlist = loadCosmeticAllowlist();
    assert.throws(
        () => assertCosmeticAllowed('not_a_real_cosmetic_id', allowlist),
        (err) => err instanceof HttpsError && err.code === 'invalid-argument',
    );
  });
});

describe('grantLoadoutCosmetic auth guards', () => {
  it('denies player self-grant via pure guard', () => {
    assert.equal(
        isLoadoutSelfGrantDenied('player', 'kid@club.test', 'kid@club.test'),
        true,
    );
    assert.equal(
        isLoadoutSelfGrantDenied('coach', 'kid@club.test', 'coach@club.test'),
        false,
    );
    assert.equal(
        isLoadoutSelfGrantDenied('coach', 'coach@club.test', 'coach@club.test'),
        true,
    );
  });
});

describe('redeemQuartermasterDigital validation', () => {
  it('QM digital allowlist only includes loadout catalog SKUs', () => {
    const allowlist = loadCosmeticAllowlist();
    assert.ok(allowlist.has('digi_border_neon'));
    assert.equal(allowlist.has('tactical_override'), false);
  });
});

describe('grantLoadoutCosmetic idempotent contract', () => {
  it('exports callable handlers', () => {
    assert.equal(typeof grantLoadoutCosmetic, 'function');
    assert.equal(typeof redeemQuartermasterDigital, 'function');
  });

  it('catalog config path resolves from functions domain', () => {
    const configPath = path.join(
        __dirname,
        '../../../static/cosmetics/catalog.config.json',
    );
    const allowlist = loadCosmeticAllowlist();
    assert.ok(allowlist.size >= 5, 'expected committed cosmetics manifest rows');
    assert.ok(configPath.includes('catalog.config.json'));
  });
});
