/**
 * subscriptionGate.test.js — G5: billing gate field+collection+region parity
 *
 * Guards the three-way alignment between:
 *   1. functions/subscription.js  — what the CF stub WRITES
 *   2. src/lib/enterprise/playerOsAccess.js + src/lib/auth/billing.js — what the gate READS
 *   3. src/routes/(marketing)/pricing/+page.svelte — how the client CALLS the CF
 *
 * Run from repo root:
 *   node --test functions/__tests__/subscriptionGate.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** @param {string} rel @returns {string} */
function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

// ── Fixture sources ──────────────────────────────────────────────────────────

const subscriptionSrc = read('functions/subscription.js');
const subscriptionCommerceSrc = read('functions-commerce/subscription.js');
const pricingPageSrc = read('src/routes/(marketing)/pricing/+page.svelte');
const playerOsAccessSrc = read('src/lib/enterprise/playerOsAccess.js');
const billingSrc = read('src/lib/auth/billing.js');

// ── Gate field / collection contract ────────────────────────────────────────

describe('subscriptionGate G5 — gate reads license_entitlements with subscription_status', () => {
  it('playerOsAccess.js reads subscription_status (snake_case) from licenseEntitlementSnap', () => {
    assert.match(
        playerOsAccessSrc,
        /licenseEntitlementSnap\.subscription_status/,
        'gate must read subscription_status (snake_case) from licenseEntitlementSnap',
    );
  });

  it('billing.js isSubscriptionReadOnly reads subscription_status (snake_case)', () => {
    assert.match(
        billingSrc,
        /ent\.subscription_status/,
        'isSubscriptionReadOnly must read ent.subscription_status (snake_case)',
    );
  });

  it("billing.js treats 'active' as a bypass (not read-only)", () => {
    assert.match(
        billingSrc,
        /status\s*===\s*['"]active['"]\s*\)\s*return\s+false/,
        "isSubscriptionReadOnly must return false when status === 'active'",
    );
  });

  it('gate checks license_entitlements/{clubId} collection (doc comment)', () => {
    assert.match(
        billingSrc,
        /license_entitlements/,
        'billing.js must document or reference license_entitlements collection',
    );
  });
});

// ── Subscription write parity ────────────────────────────────────────────────

describe('subscriptionGate G5 — functions/subscription.js writes correct collection + field', () => {
  it('writes to license_entitlements/{tenantId} (authoritative collection)', () => {
    assert.match(
        subscriptionSrc,
        /license_entitlements\/\$\{tenantId\}/,
        'subscription.js must write to license_entitlements/${tenantId}',
    );
  });

  it('writes subscription_status: "active" (snake_case, matches gate field)', () => {
    assert.match(
        subscriptionSrc,
        /subscription_status\s*:\s*['"]active['"]/,
        "subscription.js must write subscription_status: 'active' to license_entitlements",
    );
  });

  it('writes tier field to license_entitlements (gate reads tier for display)', () => {
    assert.match(
        subscriptionSrc,
        /tier\s*:\s*config\.planTier/,
        'subscription.js must write tier: config.planTier to license_entitlements',
    );
  });

  it('does NOT write camelCase subscriptionStatus to license_entitlements (wrong field guard)', () => {
    // The entitlement write block must not use camelCase subscriptionStatus.
    // Extract only the entitlementRef.set(...) block to be precise.
    const entitlementBlock = subscriptionSrc.match(
        /entitlementRef\.set\(\{[\s\S]*?\},\s*\{merge:\s*true\}\)/,
    );
    assert.ok(entitlementBlock, 'entitlementRef.set block must exist');
    assert.doesNotMatch(
        entitlementBlock[0],
        /subscriptionStatus/,
        'license_entitlements write must not use camelCase subscriptionStatus',
    );
  });
});

// ── functions-commerce/subscription.js (bundled copy) ────────────────────────

describe('subscriptionGate G5 — functions-commerce/subscription.js (bundled copy) matches', () => {
  it('writes to license_entitlements/${tenantId}', () => {
    assert.match(
        subscriptionCommerceSrc,
        /license_entitlements\/\$\{tenantId\}/,
        'functions-commerce/subscription.js must write to license_entitlements/${tenantId}',
    );
  });

  it('writes subscription_status: "active"', () => {
    assert.match(
        subscriptionCommerceSrc,
        /subscription_status\s*:\s*['"]active['"]/,
        "functions-commerce/subscription.js must write subscription_status: 'active'",
    );
  });
});

// ── Region parity ────────────────────────────────────────────────────────────

describe('subscriptionGate G5 — region alignment (us-east1)', () => {
  it("subscription.js deploys at us-east1 (REGION constant)", () => {
    assert.match(
        subscriptionSrc,
        /const\s+REGION\s*=\s*['"]us-east1['"]/,
        "subscription.js REGION must be 'us-east1'",
    );
  });

  it("pricing page does NOT call getFunctions with 'us-central1'", () => {
    assert.doesNotMatch(
        pricingPageSrc,
        /getFunctions\s*\([^)]*us-central1/,
        "pricing page must not call getFunctions with 'us-central1'",
    );
  });

  it("pricing page imports shared functions instance from $lib/firebase", () => {
    assert.match(
        pricingPageSrc,
        /import\s*\{[^}]*functions[^}]*\}\s*from\s*['"]\$lib\/firebase/,
        "pricing page must import functions from '$lib/firebase.js'",
    );
  });

  it("pricing page calls httpsCallable with shared functions (not a local fns var)", () => {
    assert.match(
        pricingPageSrc,
        /httpsCallable[^(]*\(\s*functions\s*,\s*['"]createSubscription['"]/,
        "createSubscription callable must use shared functions instance",
    );
  });

  it("src/lib/firebase.js shared functions instance is wired to us-east1", () => {
    const firebaseSrc = read('src/lib/firebase.js');
    assert.match(
        firebaseSrc,
        /getFunctions\s*\(\s*app\s*,\s*['"]us-east1['"]\s*\)/,
        "src/lib/firebase.js must export functions at us-east1",
    );
  });
});
