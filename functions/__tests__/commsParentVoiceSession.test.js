/**
 * commsParentVoiceSession.test.js — COMMS-VOICE-V1 server drift guards
 * Authority: docs/vision/COMMS_PLATFORM_STANDARDS.md §4.3
 */
'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'parentVoiceSessionOps.js');
const INDEX = path.join(REPO_ROOT, 'functions', 'index.js');
const RULES = path.join(REPO_ROOT, 'firestore.rules');

const opsSrc = fs.readFileSync(OPS, 'utf8');
const indexSrc = fs.readFileSync(INDEX, 'utf8');
const rulesSrc = fs.readFileSync(RULES, 'utf8');

describe('COMMS-VOICE-V1 — parentVoiceSessionOps path + gates', () => {
  it('stores sessions under parent_voice_sessions', () => {
    assert.match(opsSrc, /parent_voice_sessions/);
    assert.match(opsSrc, /channelType: 'parent_voice_session'/);
  });

  it('requires calendarEventId from team_workouts', () => {
    assert.match(opsSrc, /calendarEventId/);
    assert.match(opsSrc, /team_workouts/);
    assert.match(opsSrc, /scheduled_event/);
  });

  it('blocks player persona and minor profiles', () => {
    assert.match(opsSrc, /blockMinorPersona/);
    assert.match(opsSrc, /assertNotMinorUser/);
    assert.match(opsSrc, /resolveIsMinor/);
  });

  it('writes join/leave messaging_audit without recording', () => {
    assert.match(opsSrc, /parent_voice_session_scheduled/);
    assert.match(opsSrc, /parent_voice_session_join/);
    assert.match(opsSrc, /parent_voice_session_leave/);
    assert.match(opsSrc, /recordingEnabled: false/);
  });

  it('returns deliveryReport on schedule', () => {
    assert.match(opsSrc, /buildSessionScheduleDeliveryReport/);
    assert.match(opsSrc, /audienceScope: 'team_parents'/);
  });

  it('mints vendor token only when feature flag enabled', () => {
    assert.match(opsSrc, /feature_flags\/commsParentVoice/);
    assert.match(opsSrc, /readParentVoiceEnabled/);
    assert.match(opsSrc, /metadataOnly/);
  });
});

describe('COMMS-VOICE-V1 — exports + firestore rules', () => {
  it('index exports createParentVoiceSession and joinParentVoiceSession', () => {
    assert.match(indexSrc, /createParentVoiceSession\s*=\s*parentVoiceSessionOps\.createParentVoiceSession/);
    assert.match(indexSrc, /joinParentVoiceSession\s*=\s*parentVoiceSessionOps\.joinParentVoiceSession/);
  });

  it('firestore rules block client writes on parent_voice_sessions', () => {
    assert.match(rulesSrc, /match \/parent_voice_sessions\/\{sessionId\}/);
    assert.match(rulesSrc, /canReadParentVoiceSessionDoc/);
    assert.match(rulesSrc, /allow create, update, delete: if false/);
  });
});
