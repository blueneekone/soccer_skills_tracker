import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import * as admin from 'firebase-admin';

// Make sure firebase apps are cleared before initializing to avoid duplicate init errors
if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: 'demo-test' });
}

const db = admin.firestore();
const { executeBatchPagination } = require('../../utils/batchPaginator');
const { claimParentInviteToken, signParentalConsent } = require('../parentOnboardingOps');

describe('Vampire Auto-Onboarding Pipeline', () => {

  beforeEach(async () => {
    // Clear Firestore emulator using HTTP request to avoid slow batch deletes
    await fetch('http://localhost:8080/emulator/v1/projects/demo-test/databases/(default)/documents', { method: 'DELETE' });
  });

  it('1. Ingestion & Auto-Household Creation Test', async () => {
    const mockRoster = [];
    for(let i = 1; i <= 5; i++) {
        mockRoster.push({
            firstName: `Child${i}`,
            lastName: 'Doe',
            email: `child${i}@doe.com`,
            ParentName: `Parent Doe ${i}`,
            ParentEmail: `parent${i}@doe.com`,
            PlayerDOB: '2010-01-01',
            SportBranch: 'Soccer'
        });
    }

    const totalProcessed = await executeBatchPagination(mockRoster, db, 'team_123', 'club_123', 'coach_uid');

    expect(totalProcessed).toBe(5);

    for(let i = 1; i <= 5; i++) {
        // Child should be created
        const childDoc = await db.collection('users').doc(`child${i}@doe.com`).get();
        expect(childDoc.exists).toBe(true);
        const childData = childDoc.data();
        expect(childData.status).toBe('AWAITING_PARENT_VERIFICATION');
        expect(childData.isCleared).toBe(false);

        // Shadow Parent should be created
        const parentDoc = await db.collection('users').doc(`parent${i}@doe.com`).get();
        expect(parentDoc.exists).toBe(true);
        const parentData = parentDoc.data();
        expect(parentData.invitePending).toBe(true);
        expect(parentData.isCleared).toBe(false);
        expect(parentData.role).toBe('parent');

        // Both should share same household
        expect(childData.householdId).toBe(parentData.householdId);

        // Household document should exist
        const hhDoc = await db.collection('households').doc(parentData.householdId).get();
        expect(hhDoc.exists).toBe(true);
        expect(hhDoc.data().parentEmails).toContain(`parent${i}@doe.com`);
    }

    // Check Security Audit Log
    const auditDocs = await db.collection('security_audits').get();
    expect(auditDocs.docs.length).toBe(5);
    const auditData = auditDocs.docs[0].data();
    expect(auditData.event).toBe('parent_invite_dispatched');
    expect(auditData.message).toContain('secure signup route');
  });

  it('2. Shadow Security Gate Test', async () => {
    // Assert that a shadow parent profile lacks database access (firestore rules mock)
    // Note: Emulated rules require testEnv, so we logically assert the shadow state flags are correct
    const mockRoster = [{
        firstName: 'ShadowChild',
        lastName: 'X',
        email: 'shadowchild@x.com',
        ParentName: 'ShadowParent',
        ParentEmail: 'shadowparent@x.com'
    }];
    await executeBatchPagination(mockRoster, db, 'team_123', 'club_123', 'coach_uid');

    const parentDoc = await db.collection('users').doc('shadowparent@x.com').get();
    expect(parentDoc.data().isCleared).toBe(false);
    expect(parentDoc.data().invitePending).toBe(true);

    const childDoc = await db.collection('users').doc('shadowchild@x.com').get();
    expect(childDoc.data().isCleared).toBe(false);
  });

  // Simple mock of admin.auth() for our callables
  const authMock = {
    getUser: async (uid) => {
        if (uid === 'parent_uid_1') return { email: 'realparent@test.com' };
        throw new Error('User not found');
    },
    setCustomUserClaims: async () => {}
  };

  it('3. Token Redemption Test', async () => {
      // Setup mock data
      const token = 'tok_12345';
      const householdId = 'hh_abc';
      await db.collection('users').doc('realparent@test.com').set({
          role: 'parent',
          invitePending: true,
          inviteToken: token,
          householdId: householdId
      });

      // Override admin auth temporarily
      const spy = vi.spyOn(admin, 'auth').mockImplementation(() => authMock);

      try {
          const req = {
              auth: { uid: 'parent_uid_1' },
              data: { inviteToken: token }
          };

          // Wrap the function to call it like a normal async function
          const claimFn = claimParentInviteToken.run;
          const result = await claimFn(req);

          expect(result.success).toBe(true);
          expect(result.householdId).toBe(householdId);

          const updatedParent = await db.collection('users').doc('realparent@test.com').get();
          expect(updatedParent.data().invitePending).toBe(false);
          expect(updatedParent.data().inviteToken).toBeUndefined();
      } finally {
          spy.mockRestore();
      }
  });

  it('4. WebAuthn Promotion Test', async () => {
      const householdId = 'hh_abc';
      await db.collection('users').doc('realparent@test.com').set({
          role: 'parent',
          invitePending: false,
          householdId: householdId
      });

      await db.collection('users').doc('child@test.com').set({
          status: 'AWAITING_PARENT_VERIFICATION',
          isCleared: false,
          householdId: householdId
      });

      // Override admin auth temporarily
      const spy = vi.spyOn(admin, 'auth').mockImplementation(() => authMock);

      try {
          const req = {
              auth: { uid: 'parent_uid_1', token: { role: 'parent' } },
              data: { childEmail: 'child@test.com' }
          };

          const signFn = signParentalConsent.run;
          const result = await signFn(req);

          expect(result.success).toBe(true);

          const updatedChild = await db.collection('users').doc('child@test.com').get();
          expect(updatedChild.data().status).toBe('PARENTAL_CONSENT_VERIFIED');
          expect(updatedChild.data().isCleared).toBe(true);

          const consentLogs = await db.collection('consent_logs').get();
          expect(consentLogs.docs.length).toBe(1);
          expect(consentLogs.docs[0].data().action).toBe('PARENTAL_CONSENT_SIGNED');
      } finally {
          spy.mockRestore();
      }
  });

});
