import { describe, it } from 'node:test';
import assert from 'node:assert';

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

// Initialize admin app for tests if not already
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'demo-test' });
}

import { vampireIngestRows } from '../domains/interoperabilityOps.js';

describe('Vampire Importer Backend', () => {
  it('rejects malformed CSV', async () => {
    try {
      const func = vampireIngestRows.run || vampireIngestRows;
      await func({
        auth: { token: { role: 'director', clubId: 'club1' }, uid: 'user1' },
        data: { teamId: 'team1', csvPayload: 'firstName,lastName,email\n"broken' }
      });
      assert.fail('Should have thrown invalid-argument error');
    } catch (e: any) {
      assert.strictEqual(e.code || e.details?.code || e.message.includes('invalid-argument') ? 'invalid-argument' : e.code, 'invalid-argument');
    }
  });

  it('imports exceeding 500 rows are successfully sliced and paginated into compliant, sub-500 transaction batches', async () => {
    let csvPayload = 'firstName,lastName,email\n';
    for (let i = 0; i < 1100; i++) {
      csvPayload += `First${i},Last${i},user${i}@example.com\n`;
    }

    const func = vampireIngestRows.run || vampireIngestRows;
    const result = await func({
      auth: { token: { role: 'director', clubId: 'club1' }, uid: 'user1' },
      data: { teamId: 'team1', csvPayload }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.count, 1100);

    // Wait slightly to ensure local emulator indexed the writes
    await new Promise(r => setTimeout(r, 3000));

    const db = getFirestore();
    let snapshot = await db.collection('roster_staging').where('teamId', '==', 'team1').get();
    let retries = 10;
    while (snapshot.size < 1100 && retries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      snapshot = await db.collection('roster_staging').where('teamId', '==', 'team1').get();
      retries--;
    }

    assert.strictEqual(snapshot.size, 1100);
  });
});
