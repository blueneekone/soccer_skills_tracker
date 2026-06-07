/**

 * complianceOpsVpc.test.js — LAUNCH-VPC permanent parent-only golden path guards.

 *

 * Run from repo root:

 *   node --test functions/__tests__/complianceOpsVpc.test.js

 */



'use strict';



const {describe, it} = require('node:test');

const assert = require('node:assert/strict');

const fs = require('node:fs');

const path = require('node:path');



const REPO_ROOT = path.resolve(__dirname, '..', '..');

const COMPLIANCE_OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'complianceOps.js');

const OPERATIVE_OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'operativeOps.js');

const PARENT_VPC_PAGE = path.join(REPO_ROOT, 'src', 'routes', '(app)', 'parent', 'vpc', '+page.svelte');

const VPC_APPROVAL_QUEUE = path.join(

    REPO_ROOT,

    'src',

    'lib',

    'components',

    'director',

    'os',

    'VpcApprovalQueue.svelte',

);



const complianceSrc = fs.readFileSync(COMPLIANCE_OPS, 'utf8');

const operativeSrc = fs.readFileSync(OPERATIVE_OPS, 'utf8');

const parentVpcSrc = fs.readFileSync(PARENT_VPC_PAGE, 'utf8');

const vpcQueueSrc = fs.readFileSync(VPC_APPROVAL_QUEUE, 'utf8');



describe('LAUNCH-VPC — complianceOps parentGrantVpcConsent', () => {

  it('uses shared finalizeVpcForPlayer and always returns verified', () => {

    assert.match(complianceSrc, /async function finalizeVpcForPlayer/);

    assert.match(complianceSrc, /await finalizeVpcForPlayer\(batch,/);

    assert.match(complianceSrc, /waiverMethod: 'parent_online_explicit'/);

    assert.match(complianceSrc, /status: 'completed'/);

    assert.match(complianceSrc, /userPatch\.coppaStatus = 'granted'/);

    assert.match(complianceSrc, /vpcStatus: 'verified'/);

  });



  it('does not stop at parent_consented or branch on vpcPolicy', () => {

    assert.doesNotMatch(complianceSrc, /resolveClubVpcPolicy/);

    assert.doesNotMatch(complianceSrc, /director_review/);

    assert.doesNotMatch(complianceSrc, /vpcStatus: 'parent_consented'/);

    assert.doesNotMatch(complianceSrc, /pendingDirectorApproval/);

  });



  it('requires household COPPA waiver before consent ceremony', () => {

    assert.match(complianceSrc, /if \(!h\.coppaSigned\)/);

  });



  it('directorApproveVpc uses shared helper with coppa grant (override only)', () => {

    assert.match(complianceSrc, /grantCoppa: true/);

    assert.match(complianceSrc, /waiverMethod: 'vpc_director_attestation'/);

    assert.match(complianceSrc, /exports\.directorApproveVpc/);

  });

});



describe('LAUNCH-VPC — operativeOps parentProvisionOperative', () => {

  it('seeds minor child with pending VPC and COPPA until parent completes ceremony', () => {

    assert.match(operativeSrc, /userPayload\.isMinor = true/);

    assert.match(operativeSrc, /userPayload\.vpcStatus = 'pending_parent'/);

    assert.match(operativeSrc, /userPayload\.coppaStatus = 'pending'/);

    assert.match(operativeSrc, /existingVpc !== 'verified'/);

  });

});



describe('LAUNCH-VPC — Parent VPC UI', () => {

  it('does not surface parent_consented or director-wait copy', () => {

    assert.doesNotMatch(parentVpcSrc, /awaiting director/i);

    assert.doesNotMatch(parentVpcSrc, /director will finalize/i);

    assert.doesNotMatch(parentVpcSrc, /parent_consented/);

    assert.doesNotMatch(parentVpcSrc, /director_review/);

    assert.doesNotMatch(parentVpcSrc, /clubVpcPolicy/);

  });



  it('loads status from users doc vpcStatus', () => {

    assert.match(parentVpcSrc, /snap\.data\(\)\?\.vpcStatus/);

  });

});



describe('LAUNCH-VPC — Director consent audit (read-only)', () => {

  it('VpcApprovalQueue has no approve action', () => {

    assert.doesNotMatch(vpcQueueSrc, /directorApproveVpc/);

    assert.doesNotMatch(vpcQueueSrc, /Approve VPC/i);

    assert.match(vpcQueueSrc, /consent_records/);

  });

});


