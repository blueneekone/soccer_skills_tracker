const assert = require('assert');
const { describe, it, before, beforeEach, afterEach } = require('node:test');
const proxyquire = require('proxyquire');

// Simple mock for the Cloud Functions runtime dependencies
let thrownError = null;

const HttpsErrorMock = class HttpsError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
};

const adminMock = {
    firestore: () => ({
        collection: (col) => ({
            doc: (docId) => ({
                update: async (data) => {
                    adminMock.lastUpdate = { col, docId, data };
                    return true;
                },
                set: async (data, opts) => {
                    adminMock.lastUpdate = { col, docId, data, opts };
                    if (col === 'coach_lookup') {
                        adminMock.lastCoachLookupUpdate = { docId, data, opts };
                    }
                    return true;
                }
            })
        }),
        batch: () => {
            const batchOperations = [];
            return {
                set: (ref, data, opts) => {
                    batchOperations.push({ type: 'set', ref, data, opts });
                },
                commit: async () => {
                    adminMock.lastBatch = batchOperations;
                    for (const op of batchOperations) {
                        if (op.ref.path.startsWith('users/')) {
                            adminMock.lastUpdate = { col: 'users', docId: op.ref.id, data: op.data, opts: op.opts };
                        } else if (op.ref.path.startsWith('coach_lookup/')) {
                            adminMock.lastCoachLookupUpdate = { docId: op.ref.id, data: op.data, opts: op.opts };
                        }
                    }
                }
            }
        }
    })
};

const dbMock = () => {
    return {
        collection: (col) => ({
            doc: (docId) => {
                return {
                    id: docId,
                    path: col + '/' + docId
                };
            }
        }),
        batch: () => {
            const batchOperations = [];
            return {
                set: (ref, data, opts) => {
                    batchOperations.push({ type: 'set', ref, data, opts });
                },
                commit: async () => {
                    for (const op of batchOperations) {
                        if (op.ref.path.startsWith('users/')) {
                            adminMock.lastUpdate = { col: 'users', docId: op.ref.id, data: op.data, opts: op.opts };
                        } else if (op.ref.path.startsWith('coach_lookup/')) {
                            adminMock.lastCoachLookupUpdate = { docId: op.ref.id, data: op.data, opts: op.opts };
                        }
                    }
                }
            }
        }
    };
};

const adminOps = proxyquire('../adminOps.js', {
    'firebase-admin': {
        firestore: dbMock
    },
    'firebase-functions/v2/https': {
        onCall: (opts, handler) => handler,
        HttpsError: HttpsErrorMock
    },
    'firebase-functions/v2/firestore': {
        onDocumentWritten: () => {}
    },
    'firebase-functions/logger': {
        info: () => {},
        warn: () => {},
        error: () => {}
    },
    'firebase-functions/params': {
        defineString: () => ({ value: () => '' })
    }
});


describe('updateUserRole', () => {

    beforeEach(() => {
        adminMock.lastUpdate = null;
        adminMock.lastCoachLookupUpdate = null;
        adminMock.lastBatch = null;
    });

    const handler = adminOps.updateUserRole;

    it('should reject unauthenticated requests', async () => {
        try {
            await handler({ auth: null, data: {} });
            assert.fail('Should have thrown unauthenticated');
        } catch (e) {
            assert.strictEqual(e.code, 'unauthenticated');
        }
    });

    it('should reject unauthorized roles', async () => {
        try {
            await handler({ auth: { token: { role: 'player' } }, data: {} });
            assert.fail('Should have thrown permission-denied');
        } catch (e) {
            assert.strictEqual(e.code, 'permission-denied');
        }
    });

    it('should allow director to execute role update and verify payload including coach_lookup', async () => {
        const req = {
            auth: { token: { role: 'director' }, uid: 'directorId' },
            data: { targetUid: 'coach@example.com', role: 'coach', clubId: 'club123', teamId: 'club123_u15' }
        };
        const res = await handler(req);

        assert.strictEqual(res.success, true);
        assert.ok(adminMock.lastUpdate);
        assert.strictEqual(adminMock.lastUpdate.col, 'users');
        assert.strictEqual(adminMock.lastUpdate.docId, 'coach@example.com');
        assert.strictEqual(adminMock.lastUpdate.data.role, 'coach');
        assert.strictEqual(adminMock.lastUpdate.data.clubId, 'club123');
        assert.strictEqual(adminMock.lastUpdate.data.teamId, 'club123_u15');

        assert.ok(adminMock.lastCoachLookupUpdate);
        assert.strictEqual(adminMock.lastCoachLookupUpdate.docId, 'coach@example.com');
        assert.strictEqual(adminMock.lastCoachLookupUpdate.data.role, 'coach');
    });

    it('should allow super_admin to execute role update', async () => {
        const req = {
            auth: { token: { role: 'super_admin' }, uid: 'adminId' },
            data: { targetUid: 'director@example.com', role: 'director', clubId: 'club123' }
        };
        const res = await handler(req);

        assert.strictEqual(res.success, true);
        assert.ok(adminMock.lastUpdate);
        assert.strictEqual(adminMock.lastUpdate.docId, 'director@example.com');
        assert.strictEqual(adminMock.lastUpdate.data.role, 'director');

        assert.strictEqual(adminMock.lastCoachLookupUpdate, null, "Should not update coach_lookup for non-coach role");
    });
});
