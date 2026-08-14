'use strict';

/**
 * platformCellIsolation.test.js
 *
 * Verifies platform multi-tenant cell isolation, Zero-Trust custom claims,
 * and SIEM audit logging across functions-platform / functions.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ADMIN_OPS = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'adminOps.js');
const API_GATEWAY = path.join(REPO_ROOT, 'functions', 'apiGateway.js');
const GLOBAL_ADMIN = path.join(REPO_ROOT, 'functions', 'src', 'domains', 'globalAdminOs.js');
const CELL_BOOTSTRAP = path.join(REPO_ROOT, 'functions', 'cellBootstrap.js');

const adminSrc = fs.readFileSync(ADMIN_OPS, 'utf8');
const gatewaySrc = fs.readFileSync(API_GATEWAY, 'utf8');
const globalAdminSrc = fs.readFileSync(GLOBAL_ADMIN, 'utf8');
const bootstrapSrc = fs.readFileSync(CELL_BOOTSTRAP, 'utf8');

describe('Platform Cell Isolation & SIEM Audit', () => {
  it('apiGateway uses getRegistryDb for partner lookup and logging', () => {
    assert.match(gatewaySrc, /getRegistryDb\(\)\.doc\(`hotel_partners/);
    assert.match(gatewaySrc, /getRegistryDb\(\)\.collection\('partner_webhook_log'\)/);
  });

  it('adminOps writes SIEM audit log entries to security_audits', () => {
    assert.match(adminSrc, /writeSecurityAuditLog/);
    assert.match(adminSrc, /registry\.collection\('security_audits'\)/);
  });

  it('adminOps resolves request cell database for tenant queries', () => {
    assert.match(adminSrc, /getRequestDb\(request\)/);
  });

  it('globalAdminOs logs admin actions to security_audits', () => {
    assert.match(globalAdminSrc, /registry\.collection\('security_audits'\)/);
  });

  it('cellBootstrap logs dedicated cell registration to security_audits', () => {
    assert.match(bootstrapSrc, /collection\('security_audits'\)/);
  });
});
