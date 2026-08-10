'use strict';

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { shredSensitiveData } = require('../../functions-compliance/src/domains/shredOps.js');

exports.scheduledPiiShredder = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'UTC',
    region: 'us-east1'
  },
  async (event) => {
    // ShredOps handles the 24h PII Shredder requirements and explicitly skips 'consents'
    if (typeof shredSensitiveData === 'function') {
      return await shredSensitiveData(event);
    } else if (shredSensitiveData && typeof shredSensitiveData.run === 'function') {
      return await shredSensitiveData.run(event);
    }
  }
);
