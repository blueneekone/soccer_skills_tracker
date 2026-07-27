'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { assertMfaAndTimeout, enrollIndependentDirector, enrollGovernedDirector } = require('../b2bEnrollmentOps.js');

test('b2bEnrollmentOps assertMfaAndTimeout tests', async (t) => {
  await t.test('throws unauthenticated if no auth context', () => {
    assert.throws(
      () => assertMfaAndTimeout({}),
      { code: 'unauthenticated' }
    );
  });

  await t.test('throws permission-denied if no MFA', () => {
    assert.throws(
      () => assertMfaAndTimeout({ auth: { token: { firebase: {} } } }),
      { code: 'permission-denied', message: /MFA is required/ }
    );
  });

  await t.test('throws permission-denied if no auth_time', () => {
    assert.throws(
      () => assertMfaAndTimeout({
        auth: { token: { firebase: { sign_in_second_factor: {} } } }
      }),
      { code: 'permission-denied', message: /Missing auth_time/ }
    );
  });

  await t.test('throws permission-denied if auth_time is older than 1 hour', () => {
    const twoHoursAgo = Math.floor(Date.now() / 1000) - (2 * 3600);
    assert.throws(
      () => assertMfaAndTimeout({
        auth: {
          token: {
            auth_time: twoHoursAgo,
            firebase: { sign_in_second_factor: {} }
          }
        }
      }),
      { code: 'permission-denied', message: /Session expired/ }
    );
  });

  await t.test('returns token if valid', () => {
    const validTime = Math.floor(Date.now() / 1000) - (100);
    const token = {
      auth_time: validTime,
      firebase: { sign_in_second_factor: {} }
    };
    const result = assertMfaAndTimeout({ auth: { token } });
    assert.strictEqual(result, token);
  });
});

test('b2bEnrollmentOps callables export check', async (t) => {
  await t.test('exports enrollIndependentDirector', () => {
    assert.ok(enrollIndependentDirector);
  });

  await t.test('exports enrollGovernedDirector', () => {
    assert.ok(enrollGovernedDirector);
  });
});
