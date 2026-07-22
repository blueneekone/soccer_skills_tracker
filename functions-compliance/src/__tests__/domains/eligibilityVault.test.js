const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { uploadEligibilityDocument } = require('../../../src/domains/vaultOps');
const { HttpsError } = require('firebase-functions/v2/https');

describe('uploadEligibilityDocument', () => {
    test('rejects if vpcVerified claim is missing or false', async () => {
        try {
            await uploadEligibilityDocument.run({
                auth: { uid: 'user123', token: { email: 'user@test.com', vpcVerified: false } },
                data: { ownerEmailKey: 'user@test.com', documentType: 'birthCertificate', fileUrl: 'url' }
            });
            assert.fail('Should have thrown HttpsError');
        } catch (e) {
            assert.strictEqual(e instanceof HttpsError, true);
            assert.strictEqual(e.code, 'permission-denied');
        }
    });

    test('rejects unauthenticated requests', async () => {
        try {
            await uploadEligibilityDocument.run({ auth: null });
            assert.fail('Should have thrown HttpsError');
        } catch (e) {
            assert.strictEqual(e instanceof HttpsError, true);
            assert.strictEqual(e.code, 'unauthenticated');
        }
    });
});
