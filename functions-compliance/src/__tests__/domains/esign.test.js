const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { signDocument } = require('../../../src/domains/vaultOps');
const { HttpsError } = require('firebase-functions/v2/https');

// Mock Secret value for testing
process.env.PII_VAULT_MASTER_KEY = '0000000000000000000000000000000000000000000000000000000000000000';

describe('signDocument', () => {
    test('rejects unauthenticated requests', async () => {
        try {
            await signDocument.run({ auth: null });
            assert.fail('Should have thrown HttpsError');
        } catch (e) {
            assert.strictEqual(e instanceof HttpsError, true);
            assert.strictEqual(e.code, 'unauthenticated');
        }
    });

    test('rejects missing or invalid parameters', async () => {
        try {
            await signDocument.run({
                auth: { uid: 'user123', token: { email: 'user@test.com' } },
                data: {}
            });
            assert.fail('Should have thrown HttpsError');
        } catch (e) {
            assert.strictEqual(e.code, 'invalid-argument');
        }
    });
});
