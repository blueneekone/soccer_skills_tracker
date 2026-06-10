'use strict';

/**
 * claimSyncParity.guard.test.js
 *
 * Guards that syncUserClaims always emits the full identity claim set
 * (householdId, vpcVerified, minor, ageBand, divisionId) and that those
 * fields can never silently diverge from buildBaseCustomClaims again.
 *
 * Run from repo root:
 *   node --test functions/__tests__/claimSyncParity.guard.test.js
 */

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INVITES_PATH = path.join(REPO_ROOT, 'functions', 'invites.js');
const CUSTOM_CLAIMS_PATH = path.join(REPO_ROOT, 'functions', 'src', 'auth', 'customClaims.js');
const OPERATIVE_OPS_PATH = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'operativeOps.js');

const invitesSrc = fs.readFileSync(INVITES_PATH, 'utf8');
const operativeOpsSrc = fs.readFileSync(OPERATIVE_OPS_PATH, 'utf8');

// ── syncUserClaims identity claim emission ────────────────────────────────────

describe('syncUserClaims — identity claims emitted', () => {
  it('sets householdId from after snapshot', () => {
    assert.match(
        invitesSrc,
        /updated\.householdId\s*=\s*after\.householdId\s*\|\|\s*null/,
    );
  });

  it('sets vpcVerified from after.vpcStatus', () => {
    assert.match(
        invitesSrc,
        /updated\.vpcVerified\s*=\s*after\.vpcStatus\s*===\s*'verified'/,
    );
  });

  it('sets minor from after.isMinor', () => {
    assert.match(
        invitesSrc,
        /updated\.minor\s*=\s*after\.isMinor\s*===\s*true/,
    );
  });

  it('sets ageBand from after snapshot with isMinor fallback', () => {
    assert.match(
        invitesSrc,
        /updated\.ageBand\s*=\s*after\.ageBand\s*\|\|/,
    );
    assert.match(invitesSrc, /teen13to16/);
  });

  it('sets divisionId from after snapshot', () => {
    assert.match(
        invitesSrc,
        /updated\.divisionId\s*=\s*after\.divisionId\s*\|\|\s*after\.clubId\s*\|\|\s*null/,
    );
  });
});

// ── householdId must NOT be stripped in the club-revocation branch ────────────

describe('syncUserClaims — householdId preserved across club revocation', () => {
  it('does not delete householdId in the revocation else branch', () => {
    // Locate the revocation block (else branch that deletes clubId/tenantId/teamId)
    // and confirm householdId delete is absent from it.
    // Strategy: extract everything from the REVOCATION comment to the closing brace
    // of the else block and assert no "delete updated.householdId" appears there.
    const revocationMatch = invitesSrc.match(
        /\/\/ .*REVOCATION.*[\s\S]*?delete updated\.teamId;\s*\}/,
    );
    assert.ok(
        revocationMatch,
        'Cannot find revocation block — confirm invites.js structure is intact',
    );
    assert.doesNotMatch(
        revocationMatch[0],
        /delete updated\.householdId/,
        'householdId must NOT be deleted in the club-revocation else branch',
    );
  });

  it('identity claims are assigned AFTER (outside) the if/else club branch', () => {
    // The assignment of updated.householdId must appear after the closing brace
    // of the club if/else block (i.e., after "delete updated.teamId;" line).
    const teamIdDeleteIdx = invitesSrc.lastIndexOf('delete updated.teamId;');
    const householdAssignIdx = invitesSrc.indexOf('updated.householdId = after.householdId');
    assert.ok(
        teamIdDeleteIdx > 0,
        'delete updated.teamId not found in invites.js',
    );
    assert.ok(
        householdAssignIdx > teamIdDeleteIdx,
        'updated.householdId assignment must appear AFTER the club if/else block',
    );
  });
});

// ── Idempotency comparison includes identity fields ───────────────────────────

describe('syncUserClaims — idempotency check includes identity fields', () => {
  it('compares householdId in unchanged guard', () => {
    assert.match(
        invitesSrc,
        /existing\.householdId\s*===\s*updated\.householdId/,
    );
  });

  it('compares vpcVerified in unchanged guard', () => {
    assert.match(
        invitesSrc,
        /existing\.vpcVerified\s*===\s*updated\.vpcVerified/,
    );
  });

  it('compares minor in unchanged guard', () => {
    assert.match(
        invitesSrc,
        /existing\.minor\s*===\s*updated\.minor/,
    );
  });

  it('compares ageBand in unchanged guard', () => {
    assert.match(
        invitesSrc,
        /existing\.ageBand\s*===\s*updated\.ageBand/,
    );
  });
});

// ── Parity: syncUserClaims is a superset of buildBaseCustomClaims identity fields ─

describe('syncUserClaims — parity with buildBaseCustomClaims identity fields', () => {
  // The canonical identity fields produced by buildBaseCustomClaims:
  const IDENTITY_FIELDS = [
    'householdId',
    'vpcVerified',
    'minor',
    'ageBand',
    'divisionId',
  ];

  for (const field of IDENTITY_FIELDS) {
    it(`syncUserClaims emits '${field}' (matches buildBaseCustomClaims canon)`, () => {
      assert.match(
          invitesSrc,
          new RegExp(`updated\\.${field}\\s*=`),
          `syncUserClaims must set updated.${field} — divergence from buildBaseCustomClaims detected`,
      );
    });
  }
});

// ── buildBaseCustomClaims shape lock ─────────────────────────────────────────

describe('buildBaseCustomClaims — canonical shape includes identity fields', () => {
  it('exports buildBaseCustomClaims from customClaims.js', () => {
    const {buildBaseCustomClaims} = require(CUSTOM_CLAIMS_PATH);
    assert.strictEqual(typeof buildBaseCustomClaims, 'function');
  });

  it('includes householdId in output', () => {
    const {buildBaseCustomClaims} = require(CUSTOM_CLAIMS_PATH);
    const claims = buildBaseCustomClaims({
      role: 'parent',
      clubId: 'club1',
      householdId: 'hh1',
      vpcStatus: 'verified',
      isMinor: false,
    });
    assert.ok(claims !== null, 'buildBaseCustomClaims returned null');
    assert.ok('householdId' in claims, 'householdId missing from buildBaseCustomClaims output');
    assert.strictEqual(claims.householdId, 'hh1');
  });

  it('includes vpcVerified in output', () => {
    const {buildBaseCustomClaims} = require(CUSTOM_CLAIMS_PATH);
    const claims = buildBaseCustomClaims({role: 'parent', vpcStatus: 'verified'});
    assert.strictEqual(claims.vpcVerified, true);
  });

  it('vpcVerified is false when vpcStatus is not verified', () => {
    const {buildBaseCustomClaims} = require(CUSTOM_CLAIMS_PATH);
    const claims = buildBaseCustomClaims({role: 'player', vpcStatus: 'pending_parent'});
    assert.strictEqual(claims.vpcVerified, false);
  });

  it('includes minor in output', () => {
    const {buildBaseCustomClaims} = require(CUSTOM_CLAIMS_PATH);
    const claimsMinor = buildBaseCustomClaims({role: 'player', isMinor: true});
    assert.strictEqual(claimsMinor.minor, true);
    const claimsAdult = buildBaseCustomClaims({role: 'player', isMinor: false});
    assert.strictEqual(claimsAdult.minor, false);
  });

  it('includes ageBand in output', () => {
    const {buildBaseCustomClaims} = require(CUSTOM_CLAIMS_PATH);
    const minor = buildBaseCustomClaims({role: 'player', isMinor: true});
    assert.strictEqual(minor.ageBand, 'teen13to16');
    const adult = buildBaseCustomClaims({role: 'player', isMinor: false});
    assert.strictEqual(adult.ageBand, 'adult');
    const explicit = buildBaseCustomClaims({role: 'player', ageBand: 'adult18to25'});
    assert.strictEqual(explicit.ageBand, 'adult18to25');
  });

  it('householdId is null when not set on user doc', () => {
    const {buildBaseCustomClaims} = require(CUSTOM_CLAIMS_PATH);
    const claims = buildBaseCustomClaims({role: 'player'});
    assert.strictEqual(claims.householdId, null);
  });
});

// ── parentSignCoppaWaiver fast-path ──────────────────────────────────────────

describe('parentSignCoppaWaiver — householdId fast-path', () => {
  it('calls setCustomUserClaims with householdId in parentSignCoppaWaiver', () => {
    assert.match(
        operativeOpsSrc,
        /setCustomUserClaims\s*\(\s*request\.auth\.uid\s*,\s*\{\.\.\.existingClaims,\s*householdId:\s*hid\s*\}/,
    );
  });

  it('fast-path is present in both creation and existing-household branches', () => {
    const matches = [
      ...operativeOpsSrc.matchAll(/setCustomUserClaims\s*\(\s*request\.auth\.uid/g),
    ];
    assert.ok(
        matches.length >= 2,
        `Expected at least 2 setCustomUserClaims calls in parentSignCoppaWaiver (creation + existing), found ${matches.length}`,
    );
  });
});
