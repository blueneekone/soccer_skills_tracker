import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.STRIPE_SECRET_KEY = 'sk_test_mock_secret_key';

const Stripe = require('stripe');
const admin = require('firebase-admin');

// Set up mocks before importing the module under test
const mockSet = vi.fn().mockResolvedValue(true);
const mockDocRef = {
  set: mockSet
};
const mockCollectionRef = {
  doc: vi.fn().mockReturnValue(mockDocRef)
};
const mockDb = {
  collection: vi.fn().mockReturnValue(mockCollectionRef)
};

// Initialize real firebase-admin in local demo mode so it doesn't fail default app checks
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'demo-test' });
}

// Override admin.firestore with our mock cleanly via Object.defineProperty
Object.defineProperty(admin, 'firestore', {
  value: Object.assign(
    vi.fn().mockReturnValue(mockDb),
    {
      FieldValue: {
        serverTimestamp: vi.fn().mockReturnValue('mock-timestamp')
      }
    }
  ),
  configurable: true,
  writable: true
});

vi.mock('firebase-functions/params', () => ({
  defineSecret: vi.fn().mockReturnValue({
    value: vi.fn().mockReturnValue('mock-secret')
  })
}));

const mockCreateAccount = vi.fn().mockResolvedValue({ id: 'acct_mockStripe123' });

// Bulletproof Stripe prototype mock that bypasses any bundler/resolver isolation issues
const stripeResources = Stripe.resources || {};
if (stripeResources.Accounts) {
  stripeResources.Accounts.prototype.create = mockCreateAccount;
}

// Require the actual cloud function under test
const { initializeIndependentDirector } = require('../domains/directorOnboarding.js');

describe('Independent Director Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAccount.mockResolvedValue({ id: 'acct_mockStripe123' });
  });

  it('asserts that unauthenticated requests are rejected with a 401 code', async () => {
    const func = initializeIndependentDirector.run || initializeIndependentDirector;

    await expect(
      func({
        auth: undefined,
        data: {}
      })
    ).rejects.toThrowError(/User must be authenticated/);
  });

  it('asserts that a valid payload generates a distinct, non-nested tenantId and correctly records pending verification state in Firestore', async () => {
    const func = initializeIndependentDirector.run || initializeIndependentDirector;
    const uid = 'director_999';

    const result = await func({
      auth: { uid, token: { email: 'director@test.com' } },
      data: {}
    });

    expect(result.success).toBe(true);
    expect(result.tenantId).toBeDefined();
    expect(result.clubId).toBeDefined();
    expect(result.tenantId).not.toBe(result.clubId); // Distinct
    expect(result.stripeAccountId).toBe('acct_mockStripe123');

    // Verify Firestore mock doc set was called correctly
    expect(mockDb.collection).toHaveBeenCalledWith('account_verifications');
    expect(mockCollectionRef.doc).toHaveBeenCalledWith(uid);
    expect(mockSet).toHaveBeenCalledWith({
      uid,
      tenantId: result.tenantId,
      clubId: result.clubId,
      stripeAccountId: 'acct_mockStripe123',
      status: 'pending_verification',
      requirements: ['business_license', 'government_id'],
      createdAt: 'mock-timestamp'
    });

    // Verify Stripe mock account creation was called correctly
    expect(mockCreateAccount).toHaveBeenCalledWith({
      type: 'custom',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      metadata: {
        tenantId: result.tenantId,
        uid
      }
    });
  });
});
