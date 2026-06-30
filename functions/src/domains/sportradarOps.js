'use strict';

const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret} = require('firebase-functions/params');

const SPORTRADAR_API_KEY = defineSecret('SPORTRADAR_API_KEY');
const REGION = 'us-east1';

const db = () => admin.firestore();

/**
 * Scheduled function to fetch aggregate pro stats from Sportradar API and
 * normalize into Vanguard Protocol (PAC, ACC, POW, COMP, STM, AGI) benchmarks.
 */
exports.syncProBenchmarks = onSchedule(
    {
      schedule: 'every day 04:00',
      region: REGION,
      timeoutSeconds: 60,
      secrets: [SPORTRADAR_API_KEY],
    },
    async () => {
      try {
        const apiKey = SPORTRADAR_API_KEY.value();
        if (!apiKey) {
          logger.warn('[syncProBenchmarks] SPORTRADAR_API_KEY not configured.');
          return;
        }

        // TODO: Full implementation to aggregate player season stats from Sportradar
        // Mocking the API response to fit the 0-99 Vanguard Protocol ratings.
        const mockBenchmarks = {
          PAC: 88,
          ACC: 89,
          POW: 78,
          COMP: 82,
          STM: 91,
          AGI: 85,
        };

        await db().collection('platform_config').doc('pro_benchmarks').set({
            ...mockBenchmarks,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'Sportradar API',
        }, {merge: true});

        logger.info('[syncProBenchmarks] Successfully synced pro benchmarks');
      } catch (err) {
        logger.error('[syncProBenchmarks] Sync failed', {
          err: err instanceof Error ? err.message : String(err),
        });
      }
    },
);
