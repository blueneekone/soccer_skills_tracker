import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeAll, describe, it, afterAll } from 'vitest';

const PROJECT_ID = 'sst-sprint-13-rules';

describe('Sandbox Isolation Rules', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('allows authenticated, cleared coach to successfully query /teams', async () => {
    const db = testEnv.authenticatedContext('coach-cleared', {
      role: 'coach',
      isCleared: true,
      clubId: 'club-test'
    }).firestore();

    await assertSucceeds(getDoc(doc(db, 'teams/team-1')));
  });

  it('rejects uncleared coach from reading or writing to /teams', async () => {
    const db = testEnv.authenticatedContext('coach-uncleared', {
      role: 'coach',
      isCleared: false,
      clubId: 'club-test'
    }).firestore();

    await assertFails(getDoc(doc(db, 'teams/team-1')));
    await assertFails(setDoc(doc(db, 'teams/team-2'), { clubId: 'club-test' }));
  });

  it('rejects anonymous user from accessing /public_drills', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthedDb, 'public_drills/drill-1')));
  });

  it('allows authenticated user to access /public_drills', async () => {
    const authedDb = testEnv.authenticatedContext('some-user').firestore();
    await assertSucceeds(getDoc(doc(authedDb, 'public_drills/drill-1')));
  });
});
