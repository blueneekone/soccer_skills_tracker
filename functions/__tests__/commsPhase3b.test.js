/**
 * commsPhase3b.test.js — Epic 4.15b emergency break-glass server guards
 * Run: node --test functions/__tests__/commsPhase3b.test.js
 */
'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const COMMS = path.join(REPO_ROOT, 'functions', 'comms.js');
const INDEX = path.join(REPO_ROOT, 'functions', 'index.js');
const NOTIF = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'notificationOps.js');
const OMNICHANNEL = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'omnichannelOps.js');
const PKG = path.join(REPO_ROOT, 'package.json');

const commsSrc = fs.readFileSync(COMMS, 'utf8');
const indexSrc = fs.readFileSync(INDEX, 'utf8');
const notifSrc = fs.readFileSync(NOTIF, 'utf8');
const omniSrc = fs.readFileSync(OMNICHANNEL, 'utf8');
const pkgSrc = fs.readFileSync(PKG, 'utf8');

describe('commsPhase3b — emergencyClubBroadcast callable', () => {
  it('exports from comms.js and functions/index.js', () => {
    assert.match(commsSrc, /exports\.emergencyClubBroadcast\s*=\s*onCall/);
    assert.match(indexSrc, /exports\.emergencyClubBroadcast\s*=\s*commsHandlers\.emergencyClubBroadcast/);
  });

  it('requires subject and fans out via commitTeamBroadcast', () => {
    const block = commsSrc.slice(commsSrc.indexOf('emergencyClubBroadcast'));
    assert.match(block, /Emergency broadcasts require a subject line/);
    assert.match(block, /commitTeamBroadcast/);
    assert.match(block, /priority:\s*'emergency'/);
    assert.match(block, /broadcastSource:\s*'emergency'/);
    assert.match(block, /aggregateClubDeliveryReport\(results, clubAuditId\)/);
  });

  it('commitTeamBroadcast persists priority on team_broadcasts', () => {
    assert.match(commsSrc, /priority:\s*priority \|\| null/);
    assert.match(commsSrc, /broadcastSource:\s*broadcastSource \|\| null/);
  });
});

describe('commsPhase3b — notification + omnichannel wiring', () => {
  it('onTeamBroadcastCreated passes emergency flag to sendFcmToUids', () => {
    assert.match(notifSrc, /isEmergency/);
    assert.match(notifSrc, /\{emergency:\s*isEmergency\}/);
    assert.match(notifSrc, /emergency_alerts/);
    assert.match(notifSrc, /sendEachForMulticast/);
  });

  it('omnichannel SMS still gated on emergency broadcast only', () => {
    assert.match(omniSrc, /isEmergencyBroadcast/);
    assert.match(omniSrc, /commsSmsEmergency/);
    assert.match(omniSrc, /exports\.sendEmergencySms/);
  });
});

describe('commsPhase3b — deploy bundle', () => {
  it('deploy:comms includes emergencyClubBroadcast', () => {
    assert.match(pkgSrc, /functions:emergencyClubBroadcast/);
  });
});
