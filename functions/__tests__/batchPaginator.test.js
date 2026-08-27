const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { executeBatchPagination } = require('../src/utils/batchPaginator');

describe('executeBatchPagination', () => {
  it('correctly separates Player and Guardian documents', async () => {
    let mockBatchSets = [];
    const mockBatch = {
      set: (ref, data) => mockBatchSets.push({ ref, data }),
      commit: async () => true,
    };
    const mockDb = {
      batch: () => mockBatch,
      collection: (name) => ({
        doc: (id) => `${name}/${id}`
      })
    };

    const sanitizedRows = [
      { email: 'parent@example.com', phone: '555-1234', firstName: 'Timmy', lastName: 'Test', jerseyNumber: 10, xp: 500, level: 2 }
    ];

    await executeBatchPagination(sanitizedRows, mockDb, 'team-1', 'club-1', 'admin-1');

    assert.equal(mockBatchSets.length, 2);

    const playerDoc = mockBatchSets.find(s => s.ref.includes('vamp_p_'));
    assert.ok(playerDoc);
    assert.equal(playerDoc.data.firstName, 'Timmy');
    assert.equal(playerDoc.data.type, 'player');
    assert.equal(playerDoc.data.xp, 500);
    assert.equal(playerDoc.data.level, 2);
    assert.equal(playerDoc.data.email, undefined);
    assert.equal(playerDoc.data.phone, undefined);

    const guardianDoc = mockBatchSets.find(s => s.ref.includes('vamp_g_'));
    assert.ok(guardianDoc);
    assert.equal(guardianDoc.data.type, 'guardian');
    assert.equal(guardianDoc.data.role, 'guardian');
    assert.equal(guardianDoc.data.isCleared, false);
    assert.equal(guardianDoc.data.email, 'parent@example.com');
    assert.equal(guardianDoc.data.phone, '555-1234');
    assert.equal(guardianDoc.data.xp, undefined);
  });
});
