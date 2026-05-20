'use strict';

/**
 * grit.test.js — Epic 1.3 transactional security tests (firebase-functions-test)
 * Run: node functions/src/__tests__/grit.test.js
 */

const assert = require('assert');
const admin = require('firebase-admin');
const fft = require('firebase-functions-test')({projectId: 'sst-grit-test'});

const FIELD_VALUE = {
  increment: (n) => ({__increment: n}),
  serverTimestamp: () => ({__serverTimestamp: true}),
};

if (!admin.apps.length) {
  admin.initializeApp({projectId: 'sst-grit-test'});
}

if (!admin.firestore.FieldValue) {
  admin.firestore.FieldValue = FIELD_VALUE;
}

const {
  GRIT_DAILY_CAP,
  GRIT_XP,
  resolveDailyGritCount,
  utcTodayKey,
  runGritAwardTransaction,
  hashUidSeed,
} = require('../../lib/grit');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  ✓  ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ✗  ${name}`);
        console.error(`       ${err.message}`);
        failed++;
      });
}

const today = utcTodayKey();

console.log('\ngrit.ts — pure logic\n');

/** @type {Promise<void>[]} */
const queue = [];

queue.push(
    test('resolveDailyGritCount resets on stale date', () => {
      assert.strictEqual(resolveDailyGritCount({}, today), 0);
      assert.strictEqual(
          resolveDailyGritCount({daily_grit_date: '2000-01-01', daily_grit_count: 5}, today),
          0,
      );
    }),
);

queue.push(
    test('resolveDailyGritCount returns stored count for matching UTC day', () => {
      assert.strictEqual(
          resolveDailyGritCount({daily_grit_date: today, daily_grit_count: 2}, today),
          2,
      );
    }),
);

queue.push(
    test('GRIT constants match product spec', () => {
      assert.strictEqual(GRIT_DAILY_CAP, 3);
      assert.strictEqual(GRIT_XP, 50);
    }),
);

queue.push(
    test('hashUidSeed is deterministic', () => {
      const a = hashUidSeed('player-uid-abc');
      const b = hashUidSeed('player-uid-abc');
      assert.strictEqual(a, b);
      assert.notStrictEqual(hashUidSeed('other'), a);
    }),
);

console.log('\ngrit.ts — Firestore transaction (mocked)\n');

/**
 * Builds a minimal Firestore mock that supports runTransaction + tx.get/set.
 * @param {Record<string, unknown>|null} userData
 * @param {number} initialCount
 */
function mockFirestoreForGrit(userData, initialCount = 0) {
  const todayKey = utcTodayKey();
  const data = userData ?? {
    daily_grit_date: todayKey,
    daily_grit_count: initialCount,
    armory: {totalXP: 100},
  };

  const writes = [];

  const userRef = {
    path: 'users/player@test.com',
    collection: (name) => ({
      doc: () => ({path: `users/player@test.com/${name}/auto-id`}),
    }),
  };

  const tx = {
    async get(ref) {
      return {
        exists: data !== null,
        data: () => data,
        ref,
      };
    },
    set(ref, payload, opts) {
      writes.push({ref, payload, opts});
      if (payload && typeof payload.daily_grit_count === 'number') {
        data.daily_grit_date = payload.daily_grit_date;
        data.daily_grit_count = payload.daily_grit_count;
      }
    },
  };

  const firestore = {
    collection: (name) => ({
      doc: (id) => ({
        path: `${name}/${id || 'auto-id'}`,
        collection: (sub) => ({
          doc: () => ({path: `${name}/${id || 'auto-id'}/${sub}/auto-id`}),
        }),
      }),
    }),
    runTransaction: async (fn) => fn(tx),
  };

  return {firestore, writes, userRef, data, todayKey};
}

queue.push(
    test('runGritAwardTransaction increments counter and writes award atomically', async () => {
      const {firestore, writes} = mockFirestoreForGrit(null, 1);
      const fieldValue = admin.firestore.FieldValue || FIELD_VALUE;
      const original = Object.getOwnPropertyDescriptor(admin, 'firestore');
      Object.defineProperty(admin, 'firestore', {
        configurable: true,
        value: Object.assign(() => firestore, {FieldValue: fieldValue}),
      });

      try {
        const result = await runGritAwardTransaction({
          playerUid: 'uid-1',
          userKey: 'player@test.com',
          clubId: 'club-1',
          drillId: 'drill-1',
          complexityRank: 3,
          batchId: 'batch-test-1',
        });

        assert.strictEqual(result.dailyGritCount, 2);
        assert.strictEqual(result.batchId, 'batch-test-1');
        assert.ok(writes.length >= 3, 'expected user + grit_awards + xpHistory writes');
        const userWrite = writes.find((w) => w.payload?.daily_grit_count === 2);
        assert.ok(userWrite, 'user counter increment missing');
      } finally {
        if (original) Object.defineProperty(admin, 'firestore', original);
      }
    }),
);

queue.push(
    test('runGritAwardTransaction rejects at daily cap', async () => {
      const {firestore} = mockFirestoreForGrit(null, GRIT_DAILY_CAP);
      const fieldValue = admin.firestore.FieldValue || FIELD_VALUE;
      const original = Object.getOwnPropertyDescriptor(admin, 'firestore');
      Object.defineProperty(admin, 'firestore', {
        configurable: true,
        value: Object.assign(() => firestore, {FieldValue: fieldValue}),
      });

      try {
        await assert.rejects(
            () =>
              runGritAwardTransaction({
                playerUid: 'uid-1',
                userKey: 'player@test.com',
                clubId: 'club-1',
                drillId: 'drill-1',
                complexityRank: 3,
                batchId: 'batch-cap',
              }),
            (err) => {
              assert.match(String(err.message), /GRIT_DAILY_CAP/);
              return true;
            },
        );
      } finally {
        if (original) Object.defineProperty(admin, 'firestore', original);
      }
    }),
);

Promise.all(queue).finally(() => {
  fft.cleanup();
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
});
