/**
 * egressGuard.test.js
 * ────────────────────
 * Smoke tests for Phase 2, Epic 3 — Cell-Level Egress Guard.
 *
 * These tests run without Firebase Admin SDK (mocked) to verify:
 *   1. Teen-tainted requests to ad-blocklisted hosts throw EgressBlockedError.
 *   2. Teen-tainted requests to whitelisted hosts pass through.
 *   3. Non-tainted requests to ad-blocklisted hosts do NOT throw (log only).
 *   4. wrapFetch correctly replaces globalThis.fetch.
 *
 * Run: node functions/__tests__/egressGuard.test.js
 */

'use strict';

// ── Minimal mocks ─────────────────────────────────────────────────────────────

// Mock firebase-admin so egressGuard can require() it without a real app.
const mockCollection = {
  add: () => Promise.resolve({id: 'mock-audit-id'}),
};
const mockFirestore = () => ({
  collection: () => mockCollection,
  FieldValue: { serverTimestamp: () => 'mock-ts' },
});
mockFirestore.FieldValue = { serverTimestamp: () => 'mock-ts' };

// Override require for firebase-admin and firebase-functions/logger.
const Module = require('module');
const _originalLoad = Module._load.bind(Module);
Module._load = function(request, ...args) {
  if (request === 'firebase-admin') {
    return { firestore: mockFirestore, initializeApp: () => {} };
  }
  if (request === 'firebase-functions/logger') {
    return { info: () => {}, warn: () => {}, error: () => {} };
  }
  return _originalLoad(request, ...args);
};

// ── Load guard ────────────────────────────────────────────────────────────────
const {egressContext, wrapFetch, EgressBlockedError} = require('../egressGuard');

// ── Test harness ─────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passCount++;
  } else {
    console.error(`  ✗ ${msg}`);
    failCount++;
  }
}

async function assertThrows(fn, ErrorClass, msg) {
  try {
    await fn();
    console.error(`  ✗ ${msg} — expected throw but did not throw`);
    failCount++;
  } catch (err) {
    if (err instanceof ErrorClass) {
      console.log(`  ✓ ${msg}`);
      passCount++;
    } else {
      console.error(`  ✗ ${msg} — threw wrong error: ${err.constructor.name}: ${err.message}`);
      failCount++;
    }
  }
}

async function assertNoThrow(fn, msg) {
  try {
    await fn();
    console.log(`  ✓ ${msg}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${msg} — unexpected throw: ${err.message}`);
    failCount++;
  }
}

// ── Install mock fetch ────────────────────────────────────────────────────────

let lastFetchedUrl = '';
globalThis.fetch = async function mockFetch(input) {
  lastFetchedUrl = typeof input === 'string' ? input : input.url || String(input);
  return { ok: true, status: 200 };
};

wrapFetch(globalThis.fetch);

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n[egressGuard.test.js] Running smoke tests…\n');

  // Test 1: Teen-tainted + ad-blocklisted host → EgressBlockedError
  console.log('Test 1: Teen-tainted request to connect.facebook.net is blocked');
  await assertThrows(
      () => egressContext.run(
          {teenTainted: true, callerUid: 'test-uid', integrationType: 'test'},
          () => globalThis.fetch('https://connect.facebook.net/en_US/fbevents.js'),
      ),
      EgressBlockedError,
      'EgressBlockedError thrown for teen-tainted request to connect.facebook.net',
  );

  // Test 2: Teen-tainted + whitelisted host → passes
  console.log('\nTest 2: Teen-tainted request to api.stripe.com is allowed');
  await assertNoThrow(
      () => egressContext.run(
          {teenTainted: true, callerUid: 'test-uid'},
          () => globalThis.fetch('https://api.stripe.com/v1/charges'),
      ),
      'Whitelisted host api.stripe.com passes through',
  );

  // Test 3: Teen-tainted + googleapis.com subdomain → passes
  console.log('\nTest 3: Teen-tainted request to firestore.googleapis.com is allowed');
  await assertNoThrow(
      () => egressContext.run(
          {teenTainted: true},
          () => globalThis.fetch('https://firestore.googleapis.com/v1/projects/test'),
      ),
      'googleapis.com subdomain passes through for teen-tainted request',
  );

  // Test 4: Non-tainted + ad-blocklisted host → NOT thrown (log only)
  console.log('\nTest 4: Non-tainted request to googletagmanager.com is NOT blocked');
  await assertNoThrow(
      () => egressContext.run(
          {teenTainted: false},
          () => globalThis.fetch('https://www.googletagmanager.com/gtag/js'),
      ),
      'Non-tainted request to ad-blocklisted host is not blocked (log only)',
  );

  // Test 5: No egressContext (outside run) + ad-blocklisted → NOT thrown
  console.log('\nTest 5: Request outside egressContext (no taint) is NOT blocked');
  await assertNoThrow(
      () => globalThis.fetch('https://connect.facebook.net/test'),
      'Request outside egressContext is not blocked',
  );

  // Test 6: Teen-tainted + *.sendgrid.net → passes
  console.log('\nTest 6: Teen-tainted request to smtp.sendgrid.net is allowed');
  await assertNoThrow(
      () => egressContext.run(
          {teenTainted: true},
          () => globalThis.fetch('https://smtp.sendgrid.net/v3/mail/send'),
      ),
      'sendgrid.net subdomain passes through for teen-tainted request',
  );

  // Test 7: Teen-tainted + doubleclick.net → blocked
  console.log('\nTest 7: Teen-tainted request to doubleclick.net is blocked');
  await assertThrows(
      () => egressContext.run(
          {teenTainted: true},
          () => globalThis.fetch('https://doubleclick.net/track'),
      ),
      EgressBlockedError,
      'EgressBlockedError thrown for teen-tainted request to doubleclick.net',
  );

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('All egress guard smoke tests passed ✓');
  }
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
