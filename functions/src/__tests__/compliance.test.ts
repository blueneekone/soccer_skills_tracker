import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { resolveParentEmails } from '../utils/resolveParentEmails';
import * as firestoreModule from 'firebase-admin/firestore';

const mockDb = {
  collection: (name: string) => {
    return {
      doc: (id: string) => ({
        exists: id.includes('minor') || id.includes('adult') || id.includes('coach'),
        data: () => {
          if (id === 'minor_w_parent') return { email: 'minor_w_parent@test.com', role: 'player', isMinor: true };
          if (id === 'minor_no_parent') return { email: 'minor_no_parent@test.com', role: 'player', isMinor: true };
          if (id === 'adult_player') return { email: 'adult@test.com', role: 'player', isMinor: false };
          if (id === 'coach_user') return { email: 'coach@test.com', role: 'coach' };
          return null;
        }
      }),
      where: (field: string, op: string, value: string) => ({
        limit: () => ({
          get: async () => {
            if (name === 'households' && value === 'minor_w_parent@test.com') {
              return { empty: false, docs: [{ data: () => ({ parentEmails: ['parent@test.com'] }) }] };
            }
            if (name === 'households' && value === 'minor_no_parent@test.com') {
              return { empty: true };
            }
            return { empty: true };
          }
        })
      })
    };
  },
  getAll: async (...refs: any[]) => {
    return refs.map(ref => ref);
  }
} as any;


describe('SafeSport Trigger Backend', () => {
  it('identifies missing parents and flags channel as BLOCKED_VPC_PENDING', async () => {
    const { ccParentEmails, missingParents } = await resolveParentEmails(mockDb, ['coach_user', 'minor_no_parent']);
    assert.strictEqual(missingParents, true);
    assert.strictEqual(ccParentEmails.length, 0);
  });

  it('resolves parent emails and flags channel correctly', async () => {
    const { ccParentEmails, missingParents } = await resolveParentEmails(mockDb, ['coach_user', 'minor_w_parent']);
    assert.strictEqual(missingParents, false);
    assert.deepStrictEqual(ccParentEmails, ['parent@test.com']);
  });
});
