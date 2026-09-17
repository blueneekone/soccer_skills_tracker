const test = require('node:test');
const assert = require('node:assert');
const proxyquire = require('proxyquire');

const mockGetFirestore = test.mock.fn(() => ({
  collection: test.mock.fn(() => ({
    doc: test.mock.fn(() => ({
      get: test.mock.fn(async () => ({
        exists: true,
        data: () => ({ autoApproveRewards: true })
      })),
      collection: test.mock.fn(() => ({
        doc: test.mock.fn(() => ({
          get: test.mock.fn(async () => ({ exists: false })),
          set: test.mock.fn(async () => {})
        }))
      }))
    }))
  }))
}));

const mockTremendous = class {
  constructor() {
    this.campaigns = {
      list: async () => ({ data: { campaigns: [] } })
    };
    this.orders = {
      create: async () => ({ data: { order: { id: 'order_123' } } })
    };
  }
};

const mockDefineSecret = test.mock.fn((name) => ({
  value: () => 'mock_secret_key'
}));

const tremendousOps = proxyquire('../src/domains/tremendousOps', {
  'firebase-admin/firestore': { getFirestore: mockGetFirestore },
  'tremendous': { Tremendous: mockTremendous },
  'firebase-functions/params': { defineSecret: mockDefineSecret },
  'firebase-functions/v2/https': {
    onCall: (opts, fn) => fn ? fn : opts, // Handle both signatures
    HttpsError: class extends Error {
      constructor(code, message) {
        super(message);
        this.code = code;
      }
    }
  }
});

test('listRewardCatalog requires authentication', async () => {
  await assert.rejects(
    async () => await tremendousOps.listRewardCatalog({ auth: null }),
    { code: 'unauthenticated' }
  );
});

test('issueMilestoneReward requires authentication', async () => {
  await assert.rejects(
    async () => await tremendousOps.issueMilestoneReward({ auth: null, data: {} }),
    { code: 'unauthenticated' }
  );
});

test('issueMilestoneReward fails without household claims', async () => {
  await assert.rejects(
    async () => await tremendousOps.issueMilestoneReward({
      auth: { token: {} },
      data: { childId: 'c1', campaignId: 'c1', denomination: 10, fundingSourceId: 'fs1', milestoneId: 'm1' }
    }),
    { code: 'permission-denied' }
  );
});

test('issueMilestoneReward succeeds', async () => {
  const result = await tremendousOps.issueMilestoneReward({
    auth: { uid: 'u1', token: { householdId: 'h1' } },
    data: { childId: 'c1', campaignId: 'c1', denomination: 10, fundingSourceId: 'fs1', milestoneId: 'm1' }
  });
  
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.rewardId, 'order_123');
});

const mockOnRequest = (handler) => handler;

const mockGetFirestoreWebhook = test.mock.fn(() => ({
  collection: test.mock.fn(() => ({
    doc: test.mock.fn(() => ({
      set: test.mock.fn(async () => {})
    }))
  }))
}));

const mockFieldValue = { increment: test.mock.fn((val) => val) };

const tremendousWebhook = proxyquire('../src/webhooks/tremendousWebhook', {
  'firebase-admin/firestore': { getFirestore: mockGetFirestoreWebhook, FieldValue: mockFieldValue },
  'firebase-functions/v2/https': { onRequest: mockOnRequest }
});

test('webhook handles REWARD.REDEEMED', async () => {
  let status, body;
  const mockResponse = {
    status: (code) => { status = code; return { send: (msg) => { body = msg; } }; }
  };
  
  await tremendousWebhook.tremendousWebhook({
    method: 'POST',
    body: { type: 'REWARD.REDEEMED' }
  }, mockResponse);
  
  assert.strictEqual(status, 200);
  assert.strictEqual(body, 'OK');
});

test('webhook handles wrong method', async () => {
  let status, body;
  const mockResponse = {
    status: (code) => { status = code; return { send: (msg) => { body = msg; } }; }
  };
  
  await tremendousWebhook.tremendousWebhook({
    method: 'GET'
  }, mockResponse);
  
  assert.strictEqual(status, 405);
  assert.strictEqual(body, 'Method Not Allowed');
});

test('issueMilestoneReward idempotency test', async () => {
  // Test scenario where reward is already issued
  const mockGetFirestoreIdempotent = test.mock.fn(() => ({
    collection: test.mock.fn(() => ({
      doc: test.mock.fn(() => ({
        get: test.mock.fn(async () => ({
          exists: true,
          data: () => ({ autoApproveRewards: true })
        })),
        collection: test.mock.fn(() => ({
          doc: test.mock.fn(() => ({
            get: test.mock.fn(async () => ({
              exists: true,
              data: () => ({ status: 'issued', tremendousOrderId: 'existing_order_123' })
            }))
          }))
        }))
      }))
    }))
  }));

  const opsIdempotent = proxyquire('../src/domains/tremendousOps', {
    'firebase-admin/firestore': { getFirestore: mockGetFirestoreIdempotent },
    'tremendous': { Tremendous: mockTremendous },
    'firebase-functions/params': { defineSecret: mockDefineSecret },
    'firebase-functions/v2/https': {
      onCall: (opts, fn) => fn ? fn : opts,
      HttpsError: class extends Error {
        constructor(code, message) {
          super(message);
          this.code = code;
        }
      }
    }
  });

  const result = await opsIdempotent.issueMilestoneReward({
    auth: { uid: 'u1', token: { householdId: 'h1' } },
    data: { childId: 'c1', campaignId: 'c1', denomination: 10, fundingSourceId: 'fs1', milestoneId: 'm2' }
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.rewardId, 'existing_order_123');
});
