/**
 * commsPhase3d.test.js — Epic 4.15d staff internal channel server guards
 * Run: node --test functions/__tests__/commsPhase3d.test.js
 */
'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'commsChannelOps.js');
const OPERATIVE = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'operativeOps.js');
const INDEX = path.join(REPO_ROOT, 'functions', 'index.js');
const RULES = path.join(REPO_ROOT, 'firestore.rules');
const PKG = path.join(REPO_ROOT, 'package.json');

const opsSrc = fs.readFileSync(OPS, 'utf8');
const operativeSrc = fs.readFileSync(OPERATIVE, 'utf8');
const indexSrc = fs.readFileSync(INDEX, 'utf8');
const rulesSrc = fs.readFileSync(RULES, 'utf8');
const pkgSrc = fs.readFileSync(PKG, 'utf8');

describe('commsPhase3d — provisionStaffInternalChannel', () => {
  it('creates staff-internal-{teamId} with staffOnly + monitored flags', () => {
    assert.match(opsSrc, /staff-internal-\$\{normTeamId\}/);
    assert.match(opsSrc, /channelType:\s*'staff_internal'/);
    assert.match(opsSrc, /staffOnly:\s*true/);
    assert.match(opsSrc, /safesportMonitored:\s*true/);
  });

  it('coachProvisionStaffInternal allows coach/director/registrar', () => {
    assert.match(opsSrc, /coachProvisionStaffInternal/);
    assert.match(opsSrc, /STAFF_PROVISION_ROLES/);
    assert.match(opsSrc, /registrar/);
  });
});

describe('commsPhase3d — sendChannelMessage staff guards', () => {
  it('staff_internal path audits messaging_audit on write', () => {
    const block = operativeSrc.slice(
        operativeSrc.indexOf("channelType === 'staff_internal'"),
        operativeSrc.indexOf("channelType === 'staff_internal'") + 1200,
    );
    assert.match(block, /STAFF_INTERNAL_ROLES/);
    assert.match(operativeSrc, /channelType !== 'staff_internal'/);
    assert.match(operativeSrc, /action:\s*'channel_message'/);
    assert.match(operativeSrc, /messaging_audit/);
  });
});

describe('commsPhase3d — deploy + rules', () => {
  it('deploy:comms includes coachProvisionStaffInternal', () => {
    assert.match(pkgSrc, /coachProvisionStaffInternal/);
  });

  it('index exports coachProvisionStaffInternal', () => {
    assert.match(
        indexSrc,
        /exports\.coachProvisionStaffInternal\s*=\s*commsChannelOps\.coachProvisionStaffInternal/,
    );
  });

  it('firestore rules block memberIds path for staff_internal parents', () => {
    assert.match(rulesSrc, /canReadStaffInternalChannel/);
    assert.match(rulesSrc, /get\('channelType', ''\) != 'staff_internal'/);
  });
});
