/**
 * commsParentCoachDm.test.js — COMMS-PARENT-COACH-DM server drift guards
 * Authority: docs/vision/COMMS_PLATFORM_STANDARDS.md §4.2
 */
'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'parentCoachDmOps.js');
const INDEX = path.join(REPO_ROOT, 'functions', 'index.js');
const RULES = path.join(REPO_ROOT, 'firestore.rules');

const opsSrc = fs.readFileSync(OPS, 'utf8');
const indexSrc = fs.readFileSync(INDEX, 'utf8');
const rulesSrc = fs.readFileSync(RULES, 'utf8');

describe('COMMS-PARENT-COACH-DM — parentCoachDmOps path + gates', () => {
  it('stores messages under parent_coach_threads subcollection', () => {
    assert.match(opsSrc, /parent_coach_threads/);
    assert.match(opsSrc, /\.collection\('messages'\)/);
  });

  it('writes messaging_audit on every send', () => {
    assert.match(opsSrc, /messaging_audit/);
    assert.match(opsSrc, /action: 'parent_coach_dm_message'/);
  });

  it('blocks player persona', () => {
    assert.match(opsSrc, /blockMinorPersona/);
    assert.match(opsSrc, /role === 'player'/);
  });

  it('enforces consentComms for coach sends', () => {
    assert.match(opsSrc, /filterParentsWithCommsConsent/);
    assert.match(opsSrc, /consent_comms_declined/);
  });

  it('enforces coach clearance gate', () => {
    assert.match(opsSrc, /assertCoachClearanceGate/);
    assert.match(opsSrc, /clearance/);
  });

  it('returns deliveryReport on coach sends', () => {
    assert.match(opsSrc, /buildCoachSendDeliveryReport/);
    assert.match(opsSrc, /deliveryReport/);
  });

  it('reads includeAdOnParentDms from club settings', () => {
    assert.match(opsSrc, /settings/);
    assert.match(opsSrc, /includeAdOnParentDms/);
  });

  it('blocks director from posting — read-only participant', () => {
    assert.match(opsSrc, /read-only access when includeAdOnParentDms/);
    assert.match(opsSrc, /cannot post/);
  });
});

describe('COMMS-PARENT-COACH-DM — exports + firestore rules', () => {
  it('index exports sendParentCoachMessage and listParentCoachDmThreads', () => {
    assert.match(indexSrc, /sendParentCoachMessage\s*=\s*parentCoachDmOps\.sendParentCoachMessage/);
    assert.match(indexSrc, /listParentCoachDmThreads\s*=\s*parentCoachDmOps\.listParentCoachDmThreads/);
  });

  it('firestore rules block client writes on parent_coach_threads', () => {
    assert.match(rulesSrc, /match \/parent_coach_threads\/\{threadId\}/);
    assert.match(rulesSrc, /canReadParentCoachDmThreadDoc/);
    assert.match(rulesSrc, /allow create, update, delete: if false/);
  });

  it('firestore rules expose settings/comms for club flag', () => {
    assert.match(rulesSrc, /match \/settings\/comms/);
    assert.match(rulesSrc, /includeAdOnParentDms/);
  });
});
