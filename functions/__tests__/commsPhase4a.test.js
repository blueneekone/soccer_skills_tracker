/**
 * commsPhase4a.test.js — Epic 4.16a omnichannel server guards
 * Run: node --test functions/__tests__/commsPhase4a.test.js
 */
'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OMNICHANNEL = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'omnichannelOps.js');
const NOTIF = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'notificationOps.js');
const EGRESS = path.join(REPO_ROOT, 'functions', 'egressGuard.js');

const omniSrc = fs.readFileSync(OMNICHANNEL, 'utf8');
const notifSrc = fs.readFileSync(NOTIF, 'utf8');
const egressSrc = fs.readFileSync(EGRESS, 'utf8');

describe('commsPhase4a — omnichannelOps exports', () => {
  it('defines sendBroadcastEmail with SendGrid + feature flag', () => {
    assert.match(omniSrc, /exports\.sendBroadcastEmail/);
    assert.match(omniSrc, /@sendgrid\/mail/);
    assert.match(omniSrc, /SENDGRID_API_KEY/);
    assert.match(omniSrc, /feature_flags\/commsEmailFallback/);
  });

  it('defines sendEmergencySms gated on emergency + SMS flag', () => {
    assert.match(omniSrc, /exports\.sendEmergencySms/);
    assert.match(omniSrc, /api\.twilio\.com/);
    assert.match(omniSrc, /feature_flags\/commsSmsEmergency/);
    assert.match(omniSrc, /isEmergencyBroadcast/);
    assert.match(omniSrc, /TWILIO_ACCOUNT_SID/);
  });

  it('merges delivery channels on team_broadcasts', () => {
    assert.match(omniSrc, /exports\.processTeamBroadcastOmnichannel/);
    assert.match(omniSrc, /deliveryReport/);
    assert.match(omniSrc, /channels\.add\('email'\)/);
    assert.match(omniSrc, /channels\.add\('sms'\)/);
  });
});

describe('commsPhase4a — notification trigger wiring', () => {
  it('onTeamBroadcastCreated binds omnichannel secrets', () => {
    assert.match(notifSrc, /secrets:\s*OMNICHANNEL_SECRETS/);
    assert.match(notifSrc, /processTeamBroadcastOmnichannel/);
  });
});

describe('commsPhase4a — egress whitelist', () => {
  it('includes api.twilio.com', () => {
    assert.match(egressSrc, /api\.twilio\.com/);
  });
});
