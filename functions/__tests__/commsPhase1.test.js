/**
 * commsPhase1.test.js — Epic 4.13a parent-first delivery (server guards)
 * Run: node --test functions/__tests__/commsPhase1.test.js
 */
'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const COMMS_JS = path.join(REPO_ROOT, 'functions', 'comms.js');
const COMMS_POLICY = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'commsPolicy.js');

const commsSrc = fs.readFileSync(COMMS_JS, 'utf8');
const policySrc = fs.readFileSync(COMMS_POLICY, 'utf8');

const {buildTeamBroadcastAudience} = require('../src/domains/commsPolicy');

describe('commsPhase1 — commitTeamBroadcast delivery fields', () => {
  it('persists parentRecipientEmails and deliveryReport on team_broadcasts', () => {
    assert.match(commsSrc, /parentRecipientEmails/);
    assert.match(commsSrc, /parentDeliveredEmails/);
    assert.match(commsSrc, /deliveryReport/);
    assert.match(commsSrc, /buildTeamBroadcastAudience/);
  });

  it('returns deliveryReport from commitTeamBroadcast', () => {
    assert.match(commsSrc, /deliveryReport,/);
    assert.match(commsSrc, /parentDeliveredCount/);
    assert.match(commsSrc, /parentSkippedCount/);
  });
});

describe('buildTeamBroadcastAudience — consent policy', () => {
  it('delivers guardian when consentComms true for linked minor', async () => {
    const playerMeta = new Map([['child@test.com', {isMinor: true}]]);
    const parentToPlayers = new Map([['parent@test.com', ['child@test.com']]]);
    const result = await buildTeamBroadcastAudience(
        {},
        ['child@test.com'],
        playerMeta,
        parentToPlayers,
        async () => true,
    );
    assert.equal(result.parentDelivered.length, 1);
    assert.equal(result.parentDelivered[0].email, 'parent@test.com');
    assert.deepEqual(result.ccParentEmails, ['parent@test.com']);
  });

  it('skips guardian with consent_comms_declined', async () => {
    const playerMeta = new Map([['child@test.com', {isMinor: true}]]);
    const parentToPlayers = new Map([['parent@test.com', ['child@test.com']]]);
    const result = await buildTeamBroadcastAudience(
        {},
        ['child@test.com'],
        playerMeta,
        parentToPlayers,
        async () => false,
    );
    assert.equal(result.parentDelivered.length, 0);
    assert.deepEqual(result.parentSkipped, [
      {email: 'parent@test.com', reason: 'consent_comms_declined'},
    ]);
  });

  it('includes guardian for adult-only roster when linked', async () => {
    const playerMeta = new Map([['adult@test.com', {isMinor: false}]]);
    const parentToPlayers = new Map([['parent@test.com', ['adult@test.com']]]);
    const result = await buildTeamBroadcastAudience(
        {},
        ['adult@test.com'],
        playerMeta,
        parentToPlayers,
        async () => true,
    );
    assert.deepEqual(result.parentRecipientEmails, ['parent@test.com']);
    assert.deepEqual(result.parentDeliveredEmails, ['parent@test.com']);
    assert.deepEqual(result.ccParentEmails, []);
  });
});

describe('commsPolicy — guardian resolution exports', () => {
  it('exports resolvePlayerGuardianEmails and buildTeamBroadcastAudience', () => {
    assert.match(policySrc, /resolvePlayerGuardianEmails/);
    assert.match(policySrc, /buildTeamBroadcastAudience/);
    assert.match(policySrc, /consent_comms_declined/);
  });
});
