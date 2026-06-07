/**
 * complianceCheckr.guard.test.js — CHECKR-FIX Web SDK session token guards.
 *
 * Run from repo root:
 *   node --test functions/__tests__/complianceCheckr.guard.test.js
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const COMPLIANCE_JS = path.join(REPO_ROOT, 'functions', 'compliance.js');
const CHECKR_EMBED = path.join(
  REPO_ROOT,
  'src',
  'routes',
  '(app)',
  'compliance',
  'CheckrEmbed.svelte',
);
const LOAD_CHECKR_SDK = path.join(
  REPO_ROOT,
  'src',
  'lib',
  'compliance',
  'loadCheckrWebSdk.ts',
);
const CHECKR_COACH_CLEARANCE = path.join(
  REPO_ROOT,
  'src',
  'lib',
  'compliance',
  'checkrCoachClearance.ts',
);
const FIREBASE_JSON = path.join(REPO_ROOT, 'firebase.json');

const complianceSrc = fs.readFileSync(COMPLIANCE_JS, 'utf8');
const embedSrc = fs.readFileSync(CHECKR_EMBED, 'utf8');
const loaderSrc = fs.readFileSync(LOAD_CHECKR_SDK, 'utf8');
const coachClearanceSrc = fs.readFileSync(CHECKR_COACH_CLEARANCE, 'utf8');
const firebaseJson = JSON.parse(fs.readFileSync(FIREBASE_JSON, 'utf8'));

describe('CHECKR-FIX — compliance.js session token API', () => {
  it('uses web_sdk/session_tokens instead of legacy embeds/tokens', () => {
    assert.match(complianceSrc, /web_sdk\/session_tokens/);
    assert.doesNotMatch(complianceSrc, /embeds\/tokens/);
  });

  it('requests order scope with direct customer flag', () => {
    assert.match(complianceSrc, /scopes:\s*\[\s*['"]order['"]\s*\]/);
    assert.match(complianceSrc, /direct:\s*true/);
  });

  it('exports HTTP checkrSessionTokens for embed sessionTokenPath', () => {
    assert.match(complianceSrc, /exports\.checkrSessionTokens\s*=/);
  });

  it('formats Checkr API errors with actionable messages', () => {
    assert.match(complianceSrc, /function formatCheckrApiError/);
    assert.match(complianceSrc, /err\.rawBody/);
  });
});

describe('CHECKR-BUNDLE — CheckrEmbed.svelte bundled Web SDK', () => {
  it('loads @checkr/web-sdk via loadCheckrWebSdk (no CDN)', () => {
    assert.match(embedSrc, /loadCheckrWebSdk/);
    assert.doesNotMatch(embedSrc, /cdn\.jsdelivr\.net/);
    assert.doesNotMatch(embedSrc, /loadScript/);
    assert.doesNotMatch(embedSrc, /sdk\.checkr\.com\/embed/);
    assert.match(loaderSrc, /import\(['"]@checkr\/web-sdk['"]\)/);
  });

  it('uses NewInvitation with sessionTokenPath', () => {
    assert.match(embedSrc, /Embeds\.NewInvitation/);
    assert.match(embedSrc, /buildNewInvitationOptions/);
    assert.match(coachClearanceSrc, /sessionTokenPath/);
    assert.match(coachClearanceSrc, /sessionTokenRequestHeaders/);
    assert.doesNotMatch(embedSrc, /Checkr\.mount/);
  });

  it('uses coach clearance presets via checkrCoachClearance helpers', () => {
    assert.match(embedSrc, /checkrCoachClearance/);
    assert.match(embedSrc, /buildNewInvitationOptions/);
    assert.match(coachClearanceSrc, /presetEmail/);
    assert.match(coachClearanceSrc, /hideBackButton/);
    assert.match(coachClearanceSrc, /buildCheckrEmbedStyles/);
  });

  it('wires onInvitationSuccess and ReportsOverview tracking phase', () => {
    assert.match(embedSrc, /onInvitationSuccess/);
    assert.match(embedSrc, /Embeds\.ReportsOverview/);
    assert.match(embedSrc, /buildReportsOverviewOptions/);
    assert.match(embedSrc, /checkr-status-container/);
    assert.match(loaderSrc, /ReportsOverview/);
  });

  it('uses readable light panel for embed host (not vanguard-card on main container)', () => {
    assert.match(embedSrc, /checkr-embed__panel/);
    assert.match(embedSrc, /checkr-invite-container/);
    assert.doesNotMatch(
      embedSrc,
      /id="checkr-embed-container"[^>]*vanguard-card|vanguard-card[^>]*id="checkr-embed-container"/,
    );
    assert.match(embedSrc, /checkr-embed__alpha vanguard-card/);
  });
});

describe('CHECKR-FIX — firebase.json CSP and rewrite', () => {
  it('allows Checkr embed service hosts (bundled SDK, no jsDelivr)', () => {
    const csp = firebaseJson.hosting.headers
      .find((h) => h.source === '**')
      ?.headers?.find((h) => h.key === 'Content-Security-Policy')?.value;
    assert.ok(csp, 'CSP header missing');
    assert.match(csp, /web-sdk-services\.checkr\.com/);
    assert.doesNotMatch(csp, /cdn\.jsdelivr\.net/);
  });

  it('rewrites session-tokens path to checkrSessionTokens function', () => {
    const rewrite = firebaseJson.hosting.rewrites.find(
      (r) => r.source === '/api/compliance/checkr/session-tokens',
    );
    assert.ok(rewrite, 'missing session-tokens rewrite');
    assert.equal(rewrite.function.functionId, 'checkrSessionTokens');
  });
});
