import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Custom HttpsError class to replicate firebase-functions
class MockHttpsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// Pre-emptively mock firebase-functions/v2/https before importing the module under test
require.cache[require.resolve('firebase-functions/v2/https')] = {
  exports: {
    onCall: (optsOrFn: any, maybeFn?: any) => {
      if (maybeFn) return maybeFn;
      return optsOrFn;
    },
    HttpsError: MockHttpsError
  }
} as any;

// Mock stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: async (params: any) => {
        return { id: 'mock_session_id', url: 'https://checkout.stripe.com/pay' };
      }
    }
  }
};

require.cache[require.resolve('stripe')] = {
  exports: () => mockStripe
} as any;

const updatedDocs: Record<string, any> = {};

// Mock firestore database
const mockDb = {
  collection: (colName: string) => {
    return {
      doc: (docId: string) => {
        return {
          id: docId,
          path: `${colName}/${docId}`
        };
      }
    };
  },
  runTransaction: async (callback: (transaction: any) => Promise<any>) => {
    const transaction = {
      get: async (ref: any) => {
        if (ref.id === 'expired_campaign') {
          return {
            exists: true,
            data: () => ({
              campaignId: 'expired_campaign',
              endTime: new Date(Date.now() - 100000).toISOString(),
              totalPool: 1000,
              ticketPrice: 5
            })
          };
        }
        if (ref.id === 'active_campaign') {
          return {
            exists: true,
            data: () => ({
              campaignId: 'active_campaign',
              endTime: new Date(Date.now() + 100000).toISOString(),
              totalPool: 2000,
              ticketPrice: 10
            })
          };
        }
        return { exists: false };
      },
      update: (ref: any, data: any) => {
        updatedDocs[ref.id] = data;
      }
    };
    return callback(transaction);
  }
};

const mockFieldValue = {
  increment: (val: number) => ({ _type: 'increment', _val: val })
};

require.cache[require.resolve('firebase-admin')] = {
  exports: {
    firestore: Object.assign(
      () => mockDb,
      {
        FieldValue: mockFieldValue
      }
    )
  }
} as any;

require.cache[require.resolve('firebase-functions/params')] = {
  exports: {
    defineSecret: () => ({
      value: () => 'mock_secret_key'
    })
  }
} as any;

// Require the actual cloud function under test
const { purchaseSuperdrawTickets } = require('../domains/superdrawOps.js');

describe('Superdraw Campaign Purchase Tests', () => {
  beforeEach(() => {
    // Clear updated docs before each test
    for (const key of Object.keys(updatedDocs)) {
      delete updatedDocs[key];
    }
  });

  it('asserts that tickets cannot be purchased after the campaign endTime', async () => {
    const request = {
      auth: { uid: 'user_123', token: { email: 'user@test.com' } },
      data: { campaignId: 'expired_campaign', ticketsCount: 5 }
    };

    await assert.rejects(
      purchaseSuperdrawTickets(request),
      (err: any) => {
        assert.strictEqual(err.code, 'failed-precondition');
        assert.match(err.message, /Superdraw campaign has expired/);
        return true;
      }
    );
  });

  it('asserts that successful mock payments increment totalPool in a secure, server-side transaction block', async () => {
    const request = {
      auth: { uid: 'user_123', token: { email: 'user@test.com' } },
      data: {
        campaignId: 'active_campaign',
        ticketsCount: 3,
        mockPaymentSuccess: true
      }
    };

    const response = await purchaseSuperdrawTickets(request);

    assert.strictEqual(response.success, true);
    assert.strictEqual(response.sessionId, 'mock_session_id');
    assert.strictEqual(response.sessionUrl, 'https://checkout.stripe.com/pay');
    assert.strictEqual(response.totalPoolIncremented, true);

    // Verify the transaction update was called correctly
    const update = updatedDocs['active_campaign'];
    assert.ok(update, 'Expected active_campaign to be updated');
    assert.deepStrictEqual(update.totalPool, { _type: 'increment', _val: 30 }); // 3 tickets * $10
  });
});
