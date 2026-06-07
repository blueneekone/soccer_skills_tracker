/**
 * complianceCheckr.guard.test.js — LAUNCH-CHECKR-MODEL guards.
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
const COMPLIANCE_PAGE = path.join(
  REPO_ROOT,
  'src',
  'routes',
  '(app)',
  'compliance',
  '+page.svelte',
);
const DIRECTOR_COMPLIANCE = path.join(
  REPO_ROOT,
  'src',
  'routes',
  '(app)',
  'director',
  'compliance',
  '+page.svelte',
);
const CHECKLIST = path.join(
  REPO_ROOT,
  'src',
  'lib',
  'components',
  'compliance',
  'CoachClearanceChecklist.svelte',
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
const CHECKR_CLUB_CONFIG = path.join(
  REPO_ROOT,
  'src',
  'lib',
  'compliance',
  'checkrClubConfig.ts',
);
const COMPLIANCE_INDEX = path.join(REPO_ROOT, 'functions-compliance', 'index.js');
const FIREBASE_JSON = path.join(REPO_ROOT, 'firebase.json');

const complianceSrc = fs.readFileSync(COMPLIANCE_JS, 'utf8');
const embedSrc = fs.readFileSync(CHECKR_EMBED, 'utf8');
const pageSrc = fs.readFileSync(COMPLIANCE_PAGE, 'utf8');
const directorSrc = fs.readFileSync(DIRECTOR_COMPLIANCE, 'utf8');
const checklistSrc = fs.readFileSync(CHECKLIST, 'utf8');
const loaderSrc = fs.readFileSync(LOAD_CHECKR_SDK, 'utf8');
const coachClearanceSrc = fs.readFileSync(CHECKR_COACH_CLEARANCE, 'utf8');
const clubConfigSrc = fs.readFileSync(CHECKR_CLUB_CONFIG, 'utf8');
const complianceIndexSrc = fs.readFileSync(COMPLIANCE_INDEX, 'utf8');
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
    assert.match(complianceSrc, /function mapCheckrErrorForCoach/);
    assert.match(complianceSrc, /err\.rawBody/);
  });

  it('reads club Checkr config from Firestore clubs doc with env fallback', () => {
    assert.match(complianceSrc, /function readClubCheckrConfig/);
    assert.match(complianceSrc, /checkrPackageSlug/);
    assert.match(complianceSrc, /checkrWorkState/);
    assert.match(complianceSrc, /CHECKR_PACKAGE_SLUG/);
  });

  it('forwards coach-readable messages from checkrSessionTokens', () => {
    assert.match(complianceSrc, /coachMessage:\s*mapCheckrErrorForCoach/);
  });
});

describe('LAUNCH-CHECKR-MODEL — director-initiated club-paid flow', () => {
  it('exports directorInitiateCoachClearance callable', () => {
    assert.match(complianceSrc, /exports\.directorInitiateCoachClearance\s*=/);
    assert.match(complianceIndexSrc, /directorInitiateCoachClearance/);
  });

  it('creates Checkr candidate + invitation server-side', () => {
    assert.match(complianceSrc, /checkrApiRequest\(apiKey, 'POST', '\/candidates'/);
    assert.match(complianceSrc, /checkrApiRequest\(apiKey, 'POST', '\/invitations'/);
    assert.match(complianceSrc, /invitationUrl/);
  });

  it('director compliance panopticon can order screening', () => {
    assert.match(directorSrc, /directorInitiateCoachClearance/);
    assert.match(directorSrc, /orderScreening/);
    assert.match(directorSrc, /Order screening/i);
  });
});

describe('LAUNCH-CHECKR-MODEL — coach native checklist UX', () => {
  it('compliance page uses CoachClearanceChecklist and light readable shell', () => {
    assert.match(pageSrc, /CoachClearanceChecklist/);
    assert.match(pageSrc, /background:\s*#ffffff/);
    assert.doesNotMatch(pageSrc, /vanguard-bg/);
  });

  it('checklist exposes step states and club-sponsored copy', () => {
    assert.match(checklistSrc, /Club-sponsored screening/);
    assert.match(checklistSrc, /not select packages or pay fees/i);
    assert.match(coachClearanceSrc, /deriveCoachClearanceStep/);
    assert.match(coachClearanceSrc, /not_started.*invited.*in_progress/s);
  });

  it('CheckrEmbed defaults to tracking-only (no coach NewInvitation by default)', () => {
    assert.match(embedSrc, /mode\s*=\s*'tracking'/);
    assert.match(embedSrc, /COACH_SELF_START_ENABLED/);
    assert.match(embedSrc, /Embeds\.ReportsOverview/);
    assert.doesNotMatch(embedSrc, /payment/i);
  });

  it('coach compliance surfaces have no payment language', () => {
    assert.doesNotMatch(pageSrc, /payment/i);
    assert.doesNotMatch(checklistSrc, /payment/i);
    assert.doesNotMatch(embedSrc, /payment/i);
  });
});

describe('CHECKR-BUNDLE — CheckrEmbed.svelte bundled Web SDK', () => {
  it('loads @checkr/web-sdk via loadCheckrWebSdk (no CDN)', () => {
    assert.match(embedSrc, /loadCheckrWebSdk/);
    assert.doesNotMatch(embedSrc, /cdn\.jsdelivr\.net/);
    assert.match(loaderSrc, /import\(['"]@checkr\/web-sdk['"]\)/);
  });

  it('uses sessionTokenPath for ReportsOverview tracking', () => {
    assert.match(embedSrc, /buildReportsOverviewOptions/);
    assert.match(coachClearanceSrc, /sessionTokenPath/);
    assert.match(coachClearanceSrc, /sessionTokenRequestHeaders/);
  });

  it('client club config reader prefers Firestore checkrPackageSlug', () => {
    assert.match(clubConfigSrc, /fetchClubCheckrConfig/);
    assert.match(clubConfigSrc, /checkrPackageSlug/);
    assert.match(coachClearanceSrc, /checkrClubConfig/);
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
