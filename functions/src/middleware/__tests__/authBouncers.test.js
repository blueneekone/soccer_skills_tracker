'use strict';

/**
 * authBouncers.test.js — parent householdId resolution (Firestore vs JWT)
 * Run: node functions/src/middleware/__tests__/authBouncers.test.js
 */

const assert = require('assert');

const mockGet = async (email) => {
  const docs = {
    'parent@example.com': {householdId: 'hh-firestore'},
  };
  const data = docs[email];
  return {
    exists: Boolean(data),
    data: () => data,
  };
};

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({projectId: 'test-project'});
}

const firestore = admin.firestore();
const originalCollection = firestore.collection.bind(firestore);
firestore.collection = (name) => {
  const col = originalCollection(name);
  if (name !== 'users') {
    return col;
  }
  return {
    doc: (email) => ({
      get: () => mockGet(email),
    }),
  };
};

const {assertParentAsync} = require('../authBouncers');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return (async () => {
    try {
      await fn();
      console.log(`  ✓  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗  ${name}`);
      console.error(`       ${err.message}`);
      failed++;
    }
  })();
}

console.log('\nauthBouncers — assertParentAsync household resolution\n');

(async () => {
  await test('prefers Firestore householdId over stale JWT claim', async () => {
    const actor = await assertParentAsync({
      auth: {
        uid: 'uid-parent',
        token: {
          role: 'parent',
          email: 'parent@example.com',
          householdId: 'hh-stale-jwt',
        },
      },
    });
    assert.strictEqual(actor.email, 'parent@example.com');
    assert.strictEqual(actor.householdId, 'hh-firestore');
  });

  await test('falls back to JWT householdId when Firestore doc is missing', async () => {
    const actor = await assertParentAsync({
      auth: {
        uid: 'uid-parent2',
        token: {
          role: 'parent',
          email: 'jwt-only@example.com',
          householdId: 'hh-jwt-only',
        },
      },
    });
    assert.strictEqual(actor.householdId, 'hh-jwt-only');
  });

  await test('rejects non-parent role', async () => {
    let err;
    try {
      await assertParentAsync({
        auth: {token: {role: 'coach', email: 'coach@example.com', householdId: 'hh-1'}},
      });
    } catch (e) {
      err = e;
    }
    assert.ok(err);
    assert.strictEqual(err.code, 'permission-denied');
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
