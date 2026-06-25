/**
 * commsPhase4b.test.js — Epic 4.16b broadcast ack server guards
 * Run: node --test functions/__tests__/commsPhase4b.test.js
 */
'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ACK_OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'broadcastAckOps.js');
const COMMS = path.join(REPO_ROOT, 'functions', 'comms.js');
const RULES = path.join(REPO_ROOT, 'firestore.rules');

const ackSrc = fs.readFileSync(ACK_OPS, 'utf8');
const commsSrc = fs.readFileSync(COMMS, 'utf8');
const rulesSrc = fs.readFileSync(RULES, 'utf8');

describe('commsPhase4b — acknowledgeBroadcast', () => {
  it('parent-only with immutable ack doc id', () => {
    assert.match(ackSrc, /assertParentAsync/);
    assert.match(ackSrc, /ackDocId\(messageId, uid\)/);
    assert.match(ackSrc, /requiresAck !== true/);
    assert.match(ackSrc, /acknowledgedCount: FieldValue\.increment\(1\)/);
  });

  it('does not allow delete on ack records', () => {
    assert.doesNotMatch(ackSrc, /\.delete\(/);
  });
});

describe('commsPhase4b — getBroadcastAckStatus', () => {
  it('returns pendingEmails for staff', () => {
    assert.match(ackSrc, /pendingEmails/);
    assert.match(ackSrc, /staffRoles/);
    assert.match(ackSrc, /\.where\('messageId', '==', messageId\)/);
  });
});

describe('commsPhase4b — team_broadcasts ack fields', () => {
  it('commitTeamBroadcast stores ack metadata', () => {
    assert.match(commsSrc, /ackEligibleEmails: requiresAck === true/);
    assert.match(commsSrc, /acknowledgedCount: 0/);
  });
});

describe('commsPhase4b — firestore rules', () => {
  it('broadcast_acknowledgements immutable client writes', () => {
    assert.match(rulesSrc, /match \/broadcast_acknowledgements\/\{ackId\}/);
    assert.match(rulesSrc, /allow create, update, delete: if false/);
  });
});
