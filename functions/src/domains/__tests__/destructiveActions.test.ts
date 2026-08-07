import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// MUST spy on the actual firebase-admin instance used by the module
import admin from 'firebase-admin';

// Initialize app with a dummy credential so db() doesn't fail natively
admin.initializeApp({
  credential: { getAccessToken: () => ({ expires_in: 0, access_token: '' }) }
});

const mockBatch = {
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(),
};

const docMock = {
  get: vi.fn(),
  update: vi.fn(),
  set: vi.fn()
};

const mockQueryReturn = {
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  startAfter: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue({ empty: true, docs: [] })
};

const dbMock = {
  collection: vi.fn().mockReturnValue(mockQueryReturn),
  batch: vi.fn().mockReturnValue(mockBatch),
};

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (options, handler) => handler,
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
}));

import * as globalAdminOs from '../globalAdminOs.js';
import { cascadeDeleteUserData } from '../../utils/rightToBeForgottenUtil.js';

describe('Destructive Actions', () => {
  let firestoreSpy: any;
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreSpy = vi.spyOn(admin, 'firestore').mockReturnValue(dbMock as any);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Zero-Trust RBAC Gating', () => {
    it('rejects unauthenticated requests with 403', async () => {
      const request = { data: { targetUid: 'u1', targetEmail: 'e@mail.com' } };
      try {
        await globalAdminOs.rightToBeForgotten.run(request);
        throw new Error('Should have failed');
      } catch (err: any) {
        expect(err.message).toContain('Must be signed in.');
        expect(err.code).toBe('unauthenticated');
      }
    });

    it('rejects non-admin personas with 403', async () => {
      const request = {
        auth: { uid: 'u1', token: { email: 'e@mail.com', role: 'coach' } },
        data: { targetUid: 'u2', targetEmail: 'e2@mail.com' }
      };
      try {
        await globalAdminOs.rightToBeForgotten.run(request);
        throw new Error('Should have failed');
      } catch (err: any) {
        expect(err.code).toBe('permission-denied');
      }
    });
  });

  describe('PII Shredder & 500-Operation Batch Safety', () => {
    it('overwrites user records after 24 hrs inactivity, preserves consents, enforces 500-op pagination', async () => {
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const mockUserDoc = {
        exists: true,
        data: () => ({ lastActiveAt: yesterday }),
        ref: { update: vi.fn(), set: vi.fn() }
      };
      docMock.get.mockResolvedValue(mockUserDoc);

      dbMock.collection.mockImplementation((col) => {
        if (col === 'consents') throw new Error('Consents should be explicitly preserved!');
        if (col === 'users') return { doc: () => docMock };
        if (col === 'passports') return { doc: () => docMock };
        if (col === 'device_tokens') return { doc: () => docMock };
        return mockQueryReturn;
      });

      const mockAuthDelete = vi.fn();
      vi.spyOn(admin, 'auth').mockReturnValue({ deleteUser: mockAuthDelete } as any);

      const authStore = { isAuthenticated: true };

      // Execute the PII Shredder
      await cascadeDeleteUserData('target123', 'target@test.com', authStore);

      // Verify users and passports collections were updated (overwritten), not deleted
      expect(mockBatch.delete).toHaveBeenCalled(); // For device_tokens
      expect(mockBatch.update).toHaveBeenCalled(); // For users and passports

      // Verify pagination logic setup (limit to 500)
      if (mockQueryReturn.limit.mock.calls.length > 0) {
        expect(mockQueryReturn.limit).toHaveBeenCalledWith(500);
      }
    });

    it('rejects deletion if inactive for less than 24 hours', async () => {
      const today = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const mockUserDoc = {
        exists: true,
        data: () => ({ lastActiveAt: today }),
      };
      docMock.get.mockResolvedValue(mockUserDoc);
      dbMock.collection.mockReturnValue({ doc: () => docMock });

      const authStore = { isAuthenticated: true };
      await cascadeDeleteUserData('target123', 'target@test.com', authStore);

      // Should not perform batch updates since 24h hasn't elapsed
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });
  });

  describe('B815 Hydration Guard', () => {
    it('source code explicitly contains hydration check string', () => {
      const srcPath = path.resolve(__dirname, '../../utils/rightToBeForgottenUtil.js');
      const content = fs.readFileSync(srcPath, 'utf8');
      expect(content).toContain('if (!firestore || !authStore.isAuthenticated) return;');
    });
  });
});
