'use strict';

const assert = require('assert');
const { affinityWebhook } = require('../webhooksOps');

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

test('affinityWebhook: rejects missing headers', async () => {
    // Stub res object
    let statusSet = 0;
    let jsonSent = null;
    const res = {
        status: (code) => { statusSet = code; return res; },
        json: (data) => { jsonSent = data; return res; },
        send: (data) => { jsonSent = data; return res; }
    };
    
    const req = { method: 'POST', headers: {} };
    await affinityWebhook(req, res);
    assert.strictEqual(statusSet, 400);
});

setTimeout(() => {
  console.log('');
  console.log(`webhooksOps.test.js — ${passed + failed} tests`);
  console.log(`  passed : ${passed}`);
  console.log(`  failed : ${failed}`);
  if (failed > 0) process.exit(1);
}, 500);
