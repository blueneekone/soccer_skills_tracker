import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { setDoc, doc, getDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('Coach Clearance Read', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'sst-sprint-13-rules',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8')
      },
    });
  }, 20000);

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    if (!testEnv) return;
    await testEnv.clearFirestore();

    // Set up a roster for the test
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'rosters', 'team123'), { teamId: 'team123' });
        await setDoc(doc(db, 'teams', 'team123'), { teamId: 'team123', coachEmail: 'coach@test.com', clubId: 'club123' });
        await setDoc(doc(db, 'clubs', 'club123'), { name: 'club' });
    });
  });

  it('rejects read request if coach is not cleared', async () => {
    const unverifiedCoach = testEnv.authenticatedContext('coach123', {
      email: 'coach@test.com',
      role: 'coach',
      teamId: 'team123',
      clubId: 'club123',
      isCleared: false,
    });

    const db = unverifiedCoach.firestore();
    const docRef = doc(db, 'rosters', 'team123');

    await assertFails(getDoc(docRef));
  });

  it('allows read request if coach is cleared', async () => {
    const verifiedCoach = testEnv.authenticatedContext('coach123', {
      email: 'coach@test.com',
      role: 'coach',
      teamId: 'team123',
      clubId: 'club123',
      isCleared: true,
    });

    const db = verifiedCoach.firestore();
    const docRef = doc(db, 'rosters', 'team123');

    await assertSucceeds(getDoc(docRef));
  });
});