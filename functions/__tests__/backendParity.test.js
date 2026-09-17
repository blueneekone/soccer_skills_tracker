const { describe, it } = require('node:test');
const assert = require('node:assert');
const index = require('../index.js');

describe('Backend Parity Missing Endpoints Smoke Test', () => {
  const missingEndpoints = [
    'commitMatchTelemetry',
    'getAccountabilityReport',
    'secureFulfillIntent',
    'initiateStripeConnect',
    'logPlayerActivity',
    'getPublicRecruitProfile',
    'extractTenantData',
    'replayIngestionRow'
  ];

  for (const endpoint of missingEndpoints) {
    it(`should export ${endpoint}`, () => {
      assert.ok(index[endpoint], `Endpoint ${endpoint} is not exported from index.js`);
      if (endpoint !== 'getPublicRecruitProfile') {
         assert.strictEqual(typeof index[endpoint].run, 'function', `Endpoint ${endpoint} is not a valid v2 callable function`);
      }
    });
  }
});
