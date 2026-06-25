/**
 * commsPhase3c.test.js — Epic 4.15c compliance channel server guards
 * Run: node --test functions/__tests__/commsPhase3c.test.js
 */
'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const COMMS = path.join(REPO_ROOT, 'functions', 'comms.js');
const OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'commsChannelOps.js');
const RULES = path.join(REPO_ROOT, 'firestore.rules');

const commsSrc = fs.readFileSync(COMMS, 'utf8');
const opsSrc = fs.readFileSync(OPS, 'utf8');
const rulesSrc = fs.readFileSync(RULES, 'utf8');

describe('commsPhase3c — compliance channel ops', () => {
  it('postChannelSystemMessage resolves compliance-{clubId} path', () => {
    assert.match(opsSrc, /channelType === 'compliance'/);
    assert.match(opsSrc, /compliance-\$\{normClubId\}/);
    assert.match(opsSrc, /incidentId/);
    assert.match(opsSrc, /status/);
  });

  it('reportMessageIncident posts non-PII received notice', () => {
    const hookStart = commsSrc.indexOf('await postChannelSystemMessage({');
    const hookBlock = commsSrc.slice(hookStart, hookStart + 900);
    assert.match(hookBlock, /channelType:\s*'compliance'/);
    assert.match(hookBlock, /status:\s*'received'/);
    assert.match(hookBlock, /privacy/);
    assert.doesNotMatch(hookBlock, /reason:/);
    assert.doesNotMatch(hookBlock, /bodyPreview/);
  });
});

describe('commsPhase3c — firestore rules', () => {
  it('parent compliance message read requires parentEmail or householdId match', () => {
    assert.match(rulesSrc, /channelType == 'compliance'/);
    assert.match(rulesSrc, /parentEmail == emailKey\(\)/);
    assert.match(rulesSrc, /householdId == userDoc\(\)\.householdId/);
  });
});
