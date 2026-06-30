'use strict';

const assert = require('assert');
const { autoChaseEngine } = require('../dunningOps');

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

test('dunningOps: autoChaseEngine is exported', async () => {
    assert.ok(autoChaseEngine, 'autoChaseEngine is not exported');
    assert.strictEqual(typeof autoChaseEngine.run, 'function', 'autoChaseEngine should have a run method (Firebase v2 scheduled function)');
});

setTimeout(() => {
  console.log('');
  console.log(`dunningOps.test.js — ${passed + failed} tests`);
  console.log(`  passed : ${passed}`);
  console.log(`  failed : ${failed}`);
  if (failed > 0) process.exit(1);
}, 500);
