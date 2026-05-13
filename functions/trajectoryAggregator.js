/**
 * trajectoryAggregator.js
 * ────────────────────────
 * Phase 3, Epic 6 — Monthly XP Aggregator + GVI Writer
 *
 * Scheduled Cloud Function: `trajectoryMonthlyAggregator`
 * Cron: every hour UTC  ("0 * * * *")
 *
 * For each active player whose `last_training_utc` is within the last
 * 90 days, this function:
 *
 *   1. Reads `users/{email}/xpHistory` for the current and previous UTC
 *      calendar months (capped to the last 90 days total).
 *   2. Sums XP earned per month.
 *   3. Writes / merges `users/{email}/trajectory_months/{YYYY-MM}` with
 *      { totalXp, gvi, computedAt }.
 *   4. Updates the `users/{email}.trajectory` summary map so the frontend
 *      can subscribe to a single document field.
 *
 * IDEMPOTENCY
 * ───────────
 * All writes use `{ merge: true }`.  Re-running for the same month overwrites
 * the bucket with fresh totals — safe because the xpHistory sub-collection is
 * append-only and monotonically increasing.
 *
 * COST GUARD
 * ──────────
 * Closed months (past months where `computedAt` is older than the last
 * xpHistory entry for that month) are skipped.  Only the current and
 * immediately previous months are re-read on each run.
 *
 * KILL SWITCH
 * ───────────
 * Gated by Remote Config `feature_growth_velocity_enabled`.  When the flag is
 * false this function exits immediately after reading the config — no reads,
 * no writes.
 */

'use strict';

const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {
  computeMonthBucketKey,
  computePreviousMonthBucketKey,
  computeGvi,
} = require('./trajectoryOps');

// Remote Config default for the kill switch (resolved at runtime via admin RC).
const DEFAULT_GVI_FLOOR_XP = 200;
const ACTIVE_PLAYER_LOOKBACK_DAYS = 90;

/**
 * Fetch the `gvi_floor_xp` value from Firebase Remote Config.
 * Falls back to DEFAULT_GVI_FLOOR_XP on any error.
 *
 * @returns {Promise<number>}
 */
async function resolveGviFloorXp() {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const param = template.parameters && template.parameters.gvi_floor_xp;
    const val = param && param.defaultValue && param.defaultValue.value;
    const n = Math.max(1, parseInt(String(val || ''), 10));
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_GVI_FLOOR_XP;
  } catch (_) {
    return DEFAULT_GVI_FLOOR_XP;
  }
}

/**
 * Check the `feature_growth_velocity_enabled` Remote Config flag.
 * Defaults to false — must be explicitly enabled.
 *
 * @returns {Promise<boolean>}
 */
async function isGviEnabled() {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const param = template.parameters && template.parameters.feature_growth_velocity_enabled;
    const val = param && param.defaultValue && param.defaultValue.value;
    return String(val).toLowerCase() === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * Sum XP earned within a given calendar month from an xpHistory slice.
 *
 * @param {Array<{ date: string; amount: number }>} entries  Ascending by date.
 * @param {string} monthKey  'YYYY-MM'
 * @returns {number}
 */
function sumMonthXp(entries, monthKey) {
  return entries.reduce((acc, e) => {
    const eKey = typeof e.date === 'string' ? e.date.slice(0, 7) : '';
    return eKey === monthKey ? acc + Math.max(0, Math.floor(Number(e.amount) || 0)) : acc;
  }, 0);
}

/**
 * The scheduled aggregator function.
 *
 * Exported via `exports.trajectoryMonthlyAggregator` in index.js.
 */
const trajectoryMonthlyAggregator = onSchedule(
    {
      schedule: '0 * * * *', // hourly
      timeZone: 'UTC',
      memory: '256MiB',
      timeoutSeconds: 540,
    },
    async () => {
      const db = admin.firestore();

      // Kill switch check.
      const enabled = await isGviEnabled();
      if (!enabled) {
        logger.info('trajectoryMonthlyAggregator: feature_growth_velocity_enabled is false — skipping');
        return;
      }

      const floorXp = await resolveGviFloorXp();
      const nowMs = Date.now();
      const cutoffMs = nowMs - ACTIVE_PLAYER_LOOKBACK_DAYS * 86_400_000;
      const cutoffDate = new Date(cutoffMs).toISOString().slice(0, 10);

      const currentMonth = computeMonthBucketKey(new Date(nowMs));
      const previousMonth = computePreviousMonthBucketKey(new Date(nowMs));

      // Query active players.
      const psSnap = await db.collection('player_stats')
          .where('last_training_utc', '>=', cutoffDate)
          .limit(500)
          .get();

      if (psSnap.empty) {
        logger.info('trajectoryMonthlyAggregator: no active players found');
        return;
      }

      logger.info(`trajectoryMonthlyAggregator: processing ${psSnap.size} active players`);

      const BATCH_SIZE = 400;
      let batch = db.batch();
      let opCount = 0;

      for (const psDoc of psSnap.docs) {
        const psData = psDoc.data() || {};
        const playerEmail = typeof psData.playerEmail === 'string' && psData.playerEmail ?
          psData.playerEmail :
          null;

        if (!playerEmail) continue;

        // Fetch xpHistory for the last 90 days (two-month window is sufficient).
        let xpEntries = [];
        try {
          const xpSnap = await db
              .collection(`users/${playerEmail}/xpHistory`)
              .where('date', '>=', new Date(cutoffMs).toISOString().slice(0, 10))
              .orderBy('date', 'asc')
              .limit(2000)
              .get();
          xpEntries = xpSnap.docs.map((d) => d.data());
        } catch (err) {
          logger.warn('trajectoryMonthlyAggregator: xpHistory read failed', {playerEmail, err});
          continue;
        }

        const currentMonthXp = sumMonthXp(xpEntries, currentMonth);
        const lastMonthXp = sumMonthXp(xpEntries, previousMonth);
        const gvi = computeGvi(currentMonthXp, lastMonthXp, floorXp);

        // Count distinct months with any XP activity.
        const monthsWithActivity = new Set(
            xpEntries.map((e) => (typeof e.date === 'string' ? e.date.slice(0, 7) : '')).filter(Boolean),
        );

        const userRef = db.collection('users').doc(playerEmail);

        // Upsert current month bucket.
        const curBucketRef = db.collection(`users/${playerEmail}/trajectory_months`).doc(currentMonth);
        batch.set(curBucketRef, {
          monthKey: currentMonth,
          totalXp: currentMonthXp,
          repsTotal: 0, // future: derive from xpHistory reasons
          minutesTotal: 0,
          gvi,
          computedAt: new Date(nowMs).toISOString(),
        }, {merge: true});
        opCount++;

        // Upsert previous month bucket (in case it wasn't closed last run).
        if (lastMonthXp > 0) {
          const prevBucketRef = db.collection(`users/${playerEmail}/trajectory_months`).doc(previousMonth);
          const prevGvi = computeGvi(lastMonthXp, 0, floorXp);
          batch.set(prevBucketRef, {
            monthKey: previousMonth,
            totalXp: lastMonthXp,
            repsTotal: 0,
            minutesTotal: 0,
            gvi: prevGvi,
            computedAt: new Date(nowMs).toISOString(),
          }, {merge: true});
          opCount++;
        }

        // Update trajectory summary on the user document.
        batch.set(userRef, {
          trajectory: {
            gvi,
            lastComputedAt: new Date(nowMs).toISOString(),
            monthsActive: monthsWithActivity.size,
            currentMonthXp,
            lastMonthXp,
          },
        }, {merge: true});
        opCount++;

        // Commit when approaching Firestore batch limit.
        if (opCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      logger.info(`trajectoryMonthlyAggregator: complete — processed ${psSnap.size} players`);
    },
);

module.exports = {trajectoryMonthlyAggregator};
