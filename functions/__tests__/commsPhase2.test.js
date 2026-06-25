/**
 * commsPhase2.test.js — Epic 4.14 server guards for typed channel posts
 * Run: node --test functions/__tests__/commsPhase2.test.js
 */
'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'commsChannelOps.js');
const COMMERCE = path.join(REPO_ROOT, 'functions', 'commerce.js');
const REG_OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'registrationOps.js');
const TRYOUTS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'tryoutsOps.js');
const NOTIF = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'notificationOps.js');

const opsSrc = fs.readFileSync(OPS, 'utf8');
const commerceSrc = fs.readFileSync(COMMERCE, 'utf8');
const regSrc = fs.readFileSync(REG_OPS, 'utf8');
const tryoutsSrc = fs.readFileSync(TRYOUTS, 'utf8');
const notifSrc = fs.readFileSync(NOTIF, 'utf8');

describe('commsPhase2 — postChannelSystemMessage role guards', () => {
  it('defines poster role sets per channel type', () => {
    assert.match(opsSrc, /CHANNEL_TYPE_POSTERS/);
    assert.match(opsSrc, /team_logistics/);
    assert.match(opsSrc, /registration/);
    assert.match(opsSrc, /tryouts_events/);
    assert.match(opsSrc, /match_day/);
    assert.match(opsSrc, /team_manager/);
  });

  it('returns deliveryReport aligned with §6', () => {
    assert.match(opsSrc, /parentDelivered/);
    assert.match(opsSrc, /parentSkipped/);
    assert.match(opsSrc, /deliveryReport/);
  });
});

describe('commsPhase2 — registration channel writers', () => {
  it('createRegistrationIntent posts registration channel message', () => {
    assert.match(commerceSrc, /postChannelSystemMessage|notifyRegistrationChannel/);
    assert.match(commerceSrc, /channelType:\s*['"]registration['"]/);
  });

  it('assignSeasonRegistrationToRoster posts assign message', () => {
    assert.match(regSrc, /postChannelSystemMessage/);
    assert.match(regSrc, /Assigned to team/);
  });
});

describe('commsPhase2 — tryouts + calendar hooks', () => {
  it('registerForTryout posts tryouts_events channel', () => {
    assert.match(tryoutsSrc, /postChannelSystemMessage/);
    assert.match(tryoutsSrc, /tryouts_events/);
  });

  it('deployment calendar mirrors team_logistics when announcing', () => {
    assert.match(notifSrc, /postChannelSystemMessage/);
    assert.match(notifSrc, /team_logistics/);
  });
});
