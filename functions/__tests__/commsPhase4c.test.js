/**
 * commsPhase4c.test.js — Epic 4.16c sponsor & partner templates
 * Run: node --test functions/__tests__/commsPhase4c.test.js
 */
'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SPONSOR_OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'sponsorPartnerOps.js');
const POLICY = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'commsPolicy.js');
const COMPLIANCE = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'complianceOps.js');
const INDEX = path.join(REPO_ROOT, 'functions', 'index.js');
const RULES = path.join(REPO_ROOT, 'firestore.rules');
const PKG = path.join(REPO_ROOT, 'package.json');

const sponsorSrc = fs.readFileSync(SPONSOR_OPS, 'utf8');
const policySrc = fs.readFileSync(POLICY, 'utf8');
const complianceSrc = fs.readFileSync(COMPLIANCE, 'utf8');
const indexSrc = fs.readFileSync(INDEX, 'utf8');
const rulesSrc = fs.readFileSync(RULES, 'utf8');
const pkgSrc = fs.readFileSync(PKG, 'utf8');

describe('commsPhase4c — sponsorPartnerOps', () => {
  it('exports create, approve, send callables', () => {
    assert.match(sponsorSrc, /exports\.createSponsorTemplate\s*=\s*onCall/);
    assert.match(sponsorSrc, /exports\.approveSponsorTemplate\s*=\s*onCall/);
    assert.match(sponsorSrc, /exports\.sendSponsorPartnerDigest\s*=\s*onCall/);
  });

  it('blocks unapproved sends', () => {
    assert.match(sponsorSrc, /template\.status !== 'approved'/);
    assert.match(sponsorSrc, /Unapproved sends are blocked/);
  });

  it('uses sponsor_templates collection and sponsor_partner channel', () => {
    assert.match(sponsorSrc, /sponsor_templates/);
    assert.match(sponsorSrc, /channelType: 'sponsor_partner'/);
    assert.match(sponsorSrc, /sponsor-partner-/);
  });

  it('writes deliveryReport and audit_logs', () => {
    assert.match(sponsorSrc, /deliveryReport/);
    assert.match(sponsorSrc, /audit_logs/);
    assert.match(sponsorSrc, /consent_sponsor_declined/);
    assert.match(sponsorSrc, /consent_comms_declined/);
  });

  it('requires director club scope', () => {
    assert.match(sponsorSrc, /assertDirectorClubOrSuper/);
  });
});

describe('commsPhase4c — commsPolicy sponsor consent', () => {
  it('filterParentsWithSponsorConsent requires sponsor and comms', () => {
    assert.match(policySrc, /filterParentsWithSponsorConsent/);
    assert.match(policySrc, /items\.sponsor === true && items\.comms === true/);
  });
});

describe('commsPhase4c — VPC consentItems.sponsor', () => {
  it('parentGrantVpcConsent persists sponsor consent', () => {
    assert.match(complianceSrc, /sponsor: ci\.sponsor === true/);
  });
});

describe('commsPhase4c — index + deploy', () => {
  it('index.js wires sponsor callables', () => {
    assert.match(indexSrc, /createSponsorTemplate/);
    assert.match(indexSrc, /approveSponsorTemplate/);
    assert.match(indexSrc, /sendSponsorPartnerDigest/);
  });

  it('deploy:comms includes sponsor callables', () => {
    assert.match(pkgSrc, /functions:createSponsorTemplate/);
    assert.match(pkgSrc, /functions:approveSponsorTemplate/);
    assert.match(pkgSrc, /functions:sendSponsorPartnerDigest/);
  });
});

describe('commsPhase4c — firestore rules', () => {
  it('sponsor_templates director read only', () => {
    assert.match(rulesSrc, /match \/sponsor_templates\/\{templateId\}/);
    assert.match(rulesSrc, /allow create, update, delete: if false/);
  });

  it('sponsor_partner typed channel parentEmail gate', () => {
    assert.match(rulesSrc, /ch\.channelType == 'sponsor_partner'/);
    assert.match(rulesSrc, /resource\.data\.parentEmail == emailKey\(\)/);
  });
});
