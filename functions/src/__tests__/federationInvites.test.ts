import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';

// Define mock functions for batch operations and queries
const mockBatchUpdate = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn();

const mockBatch = {
  update: mockBatchUpdate,
  set: mockBatchSet,
  commit: mockBatchCommit,
};

const mockGet = vi.fn();

const mockCollection = vi.fn().mockImplementation((colName) => {
  return {
    doc: (docId: string) => ({
      ref: { id: docId, path: `${colName}/${docId}` },
      get: mockGet,
    }),
    where: vi.fn().mockImplementation((field, op, value) => {
      return {
        get: mockGet,
      };
    }),
  };
});

const mockDb = {
  collection: mockCollection,
  batch: () => mockBatch,
};

// Mock firebase-admin before importing consumeFederationInvite
vi.mock('firebase-admin', () => {
  return {
    firestore: Object.assign(
      () => mockDb,
      {
        FieldValue: {
          serverTimestamp: () => 'MOCK_SERVER_TIMESTAMP',
        },
      }
    ),
  };
});

// Mock firebase-functions v2 https module
vi.mock('firebase-functions/v2/https', () => {
  return {
    onCall: (config: any, handler: any) => {
      return handler || config;
    },
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, message: string) {
        super(message);
      }
    },
  };
});

// Import the callable function
import { consumeFederationInvite } from '../domains/federationInvites';

describe('consumeFederationInvite Secure Gating & Auto-Nesting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject with HttpsError unauthenticated if auth is missing', async () => {
    const context = {
      data: { inviteToken: 'token_123' },
    };

    await expect(consumeFederationInvite(context as any)).rejects.toThrowError(/Must be signed in/);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('should reject with HttpsError invalid-argument if inviteToken is missing', async () => {
    const context = {
      auth: { uid: 'user_123' },
      data: {},
    };

    await expect(consumeFederationInvite(context as any)).rejects.toThrowError(/Invite token is required/);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('should reject with HttpsError not-found if token does not exist', async () => {
    mockGet.mockResolvedValue({
      empty: true,
      docs: [],
    });

    const context = {
      auth: { uid: 'user_123' },
      data: { inviteToken: 'nonexistent_token' },
    };

    await expect(consumeFederationInvite(context as any)).rejects.toThrowError(/Invite not found/);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('should reject with HttpsError if invite is already used', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          ref: { id: 'invite_doc_id', path: 'federation_invites/invite_doc_id' },
          data: () => ({
            token: 'used_token_123',
            is_used: true,
            expiration_timestamp: {
              toMillis: () => Date.now() + 100000,
            },
            tenantId: 'comm_tenant_abc',
          }),
        },
      ],
    });

    const context = {
      auth: { uid: 'user_123' },
      data: { inviteToken: 'used_token_123' },
    };

    await expect(consumeFederationInvite(context as any)).rejects.toThrowError(/already used/);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('should reject with HttpsError if invite is expired', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          ref: { id: 'invite_doc_id', path: 'federation_invites/invite_doc_id' },
          data: () => ({
            token: 'expired_token_123',
            is_used: false,
            expiration_timestamp: {
              toMillis: () => Date.now() - 100000, // past expiration
            },
            tenantId: 'comm_tenant_abc',
          }),
        },
      ],
    });

    const context = {
      auth: { uid: 'user_123' },
      data: { inviteToken: 'expired_token_123' },
    };

    await expect(consumeFederationInvite(context as any)).rejects.toThrowError(/expired/);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('should consume an active, valid token, mark it used, and nest new clubId under Commissioner tenantId', async () => {
    const mockInviteToken = 'valid_token_123';
    const mockMasterTenantId = 'commissioner_tenant_abc';

    mockGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          ref: { id: 'invite_doc_id', path: 'federation_invites/invite_doc_id' },
          data: () => ({
            token: mockInviteToken,
            is_used: false,
            expiration_timestamp: {
              toMillis: () => Date.now() + 100000, // active
            },
            tenantId: mockMasterTenantId,
          }),
        },
      ],
    });

    const context = {
      auth: { uid: 'new_governed_director_uid' },
      data: { inviteToken: mockInviteToken },
    };

    const res = await consumeFederationInvite(context as any);

    expect(res.success).toBe(true);
    expect(res.tenantId).toBe(mockMasterTenantId);
    expect(res.clubId).toBeDefined();
    expect(res.clubId.startsWith('club_')).toBe(true);

    // Assert that the transaction atomically marks the token as used
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'invite_doc_id' }),
      expect.objectContaining({
        is_used: true,
        used_by: 'new_governed_director_uid',
      })
    );

    // Assert that the transaction atomically creates the new Governed Director profile,
    // nesting the new clubId directly under the Commissioner's master tenantId
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: expect.objectContaining({ path: 'users/new_governed_director_uid' })
      }),
      expect.objectContaining({
        uid: 'new_governed_director_uid',
        role: 'director',
        type: 'governed',
        tenantId: mockMasterTenantId,
        clubId: res.clubId,
      }),
      { merge: true }
    );

    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: expect.objectContaining({ path: 'b2b_enrollments/new_governed_director_uid' })
      }),
      expect.objectContaining({
        uid: 'new_governed_director_uid',
        type: 'governed',
        tenantId: mockMasterTenantId,
        clubId: res.clubId,
        inviteToken: mockInviteToken,
      })
    );

    expect(mockBatchCommit).toHaveBeenCalled();
  });
});
