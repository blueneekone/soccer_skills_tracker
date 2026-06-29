'use strict';

const assert = require('assert');
const { cvBiomechanicsVerifier } = require('../cvBiomechanicsVerifier');

let passed = 0;
let failed = 0;

function test(name, fn) {
  Promise.resolve()
      .then(() => fn())
      .then(() => {
        console.log(`  ✓  ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ✗  ${name}`);
        console.error(`     ${err.message}`);
        failed++;
      });
}

test('cvBiomechanicsVerifier: requires authentication', async () => {
  try {
    // Calling the raw handler function
    await cvBiomechanicsVerifier.run({ data: { clipId: '123' } });
    assert.fail('Should have thrown unauthenticated error');
  } catch (err) {
    assert.strictEqual(err.code, 'unauthenticated');
  }
});

test('cvBiomechanicsVerifier: returns mocked analysis when authenticated', async () => {
  const result = await cvBiomechanicsVerifier.run({ 
    data: { clipId: '123' },
    auth: { uid: 'user-1' }
  });
  assert.strictEqual(result.verified, true);
  assert.strictEqual(result.confidence, 0.94);
});

setTimeout(() => {
  console.log('');
  console.log(`cvBiomechanicsVerifier.test.js — ${passed + failed} tests`);
  console.log(`  passed : ${passed}`);
  console.log(`  failed : ${failed}`);
  if (failed > 0) process.exit(1);
}, 500);
