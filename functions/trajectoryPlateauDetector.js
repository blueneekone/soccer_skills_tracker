/**
 * trajectoryPlateauDetector.js
 * ─────────────────────────────
 * Phase 3, Epic 6 — Plateau Detector + Memory Capsule Writer
 *
 * Scheduled Cloud Function: `trajectoryPlateauDetector`
 * Cron: daily at 02:30 UTC ("30 2 * * *") — runs after the hourly aggregator.
 *
 * For each active player (trained within 14 days), this function:
 *
 *   1. Pulls their last 30-day xpHistory window.
 *   2. Runs `detectPlateau()` from trajectoryOps.js.
 *   3. On a positive plateau detection, fetches:
 *        • `player_stats/{uid}` — level, streak, total_xp
 *        • `users/{email}.armory` — Scout's Six
 *   4. Builds two `CapsuleSnapshot` objects (baseline + current).
 *   5. Writes `users/{email}/memory_capsules/cap_{isoWeekKey}` with
 *      the merged snapshot and delta summary.
 *
 * SPAM PREVENTION
 * ───────────────
 * The document ID is `cap_{isoWeekKey}` (e.g. `cap_2026-W20`).  Using `set`
 * with `{ merge: false }` at this deterministic ID means the function only
 * creates a capsule once per calendar week — if the player gets a capsule on
 * Tuesday, Wednesday's run quietly overwrites the same doc (idempotent).
 *
 * Acknowledged capsules are never overwritten — the function checks
 * `acknowledged === false` before writing.
 *
 * KILL SWITCH
 * ───────────
 * Gated by Remote Config `feature_trajectory_capsules_enabled`.
 *
 * EXPORTED CALLABLE
 * ─────────────────
 * `getMemoryCapsule` — on-demand callable for "show me my breakthrough" UX.
 * Returns the most recent unacknowledged capsule for the calling user.
 */

'use strict';

const {onSchedule} = require('firebase-functions/v2/scheduler');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {
  detectPlateau,
  buildCapsuleSnapshot,
  isoWeekKey,
} = require('./trajectoryOps');

const DEFAULT_LOOKBACK_DAYS = 14;
const DEFAULT_PLATEAU_THRESHOLD = 0.05;

/**
 * Check the `feature_trajectory_capsules_enabled` Remote Config flag.
 *
 * @returns {Promise<boolean>}
 */
async function isCapsulesEnabled() {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const param = template.parameters && template.parameters.feature_trajectory_capsules_enabled;
    const val = param && param.defaultValue && param.defaultValue.value;
    return String(val).toLowerCase() === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * Resolve tuning params from Remote Config with safe defaults.
 *
 * @returns {Promise<{ lookbackDays: number; plateauThresholdPct: number }>}
 */
async function resolvePlateauParams() {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const params = template.parameters || {};

    const ldParam = params.plateau_lookback_days;
    const ptParam = params.plateau_delta_threshold_pct;

    const ld = parseInt(String(ldParam?.defaultValue?.value || ''), 10);
    const pt = parseFloat(String(ptParam?.defaultValue?.value || ''));

    return {
      lookbackDays: Number.isFinite(ld) && ld > 0 ? ld : DEFAULT_LOOKBACK_DAYS,
      plateauThresholdPct: Number.isFinite(pt) && pt > 0 ? pt : DEFAULT_PLATEAU_THRESHOLD,
    };
  } catch (_) {
    return {lookbackDays: DEFAULT_LOOKBACK_DAYS, plateauThresholdPct: DEFAULT_PLATEAU_THRESHOLD};
  }
}

/**
 * Write a memory capsule document if the player is plateauing and no
 * unacknowledged capsule exists for the current week.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} playerEmail
 * @param {string} athleteUid
 * @param {number} lookbackDays
 * @param {number} plateauThresholdPct
 * @returns {Promise<boolean>}  true when a capsule was written
 */
async function maybeWriteCapsule(db, playerEmail, athleteUid, lookbackDays, plateauThresholdPct) {
  const nowMs = Date.now();
  const cutoffDate = new Date(nowMs - lookbackDays * 2 * 86_400_000).toISOString().slice(0, 10);

  // Fetch xpHistory for the extended lookback window (2× to get a baseline).
  let xpEntries = [];
  try {
    const xpSnap = await db
        .collection(`users/${playerEmail}/xpHistory`)
        .where('date', '>=', cutoffDate)
        .orderBy('date', 'asc')
        .limit(500)
        .get();
    xpEntries = xpSnap.docs.map((d) => d.data());
  } catch (err) {
    logger.warn('trajectoryPlateauDetector: xpHistory read failed', {playerEmail, err});
    return false;
  }

  const plateauResult = detectPlateau(xpEntries, lookbackDays, plateauThresholdPct);
  if (!plateauResult.isPlateauing) return false;

  const weekKey = isoWeekKey(new Date(nowMs));
  const capsuleId = `cap_${weekKey}`;
  const capsuleRef = db.collection(`users/${playerEmail}/memory_capsules`).doc(capsuleId);

  // Do not overwrite an already-acknowledged capsule.
  const existingSnap = await capsuleRef.get();
  if (existingSnap.exists) {
    const existing = existingSnap.data() || {};
    if (existing.acknowledged === true) return false;
    // Already written this week but not yet acknowledged — skip duplicate write.
    return false;
  }

  // Fetch current player state.
  const [psSnap, uSnap] = await Promise.all([
    db.collection('player_stats').doc(athleteUid).get(),
    db.collection('users').doc(playerEmail).get(),
  ]);

  const psData = psSnap.exists ? (psSnap.data() || {}) : {};
  const uData = uSnap.exists ? (uSnap.data() || {}) : {};
  const armory = uData.armory && typeof uData.armory === 'object' ? uData.armory : {};

  // Determine the baseline date — highest-XP date in the lookback window.
  const baselineDate = plateauResult.baselineDate ||
    new Date(nowMs - lookbackDays * 86_400_000).toISOString().slice(0, 10);

  // Baseline snapshot: reconstruct from xpHistory (last entry before window).
  const cutoffMs = nowMs - lookbackDays * 86_400_000;
  const preWindow = xpEntries.filter((e) => Date.parse(e.date) < cutoffMs);
  const baselineEntry = preWindow.length > 0 ? preWindow[preWindow.length - 1] : null;

  const baselinePs = {
    total_xp: baselineEntry ? (baselineEntry.runningTotal || 0) : plateauResult.baselineTotalXp,
    current_level: psData.current_level || 1,
    streak_days: 0, // streak at baseline not preserved in history — safe default
  };
  const baselineSnapshot = buildCapsuleSnapshot(baselinePs, armory, baselineDate ? baselineDate.slice(0, 7) : '');
  baselineSnapshot.capturedAt = baselineDate;

  // Current snapshot.
  const currentSnapshot = buildCapsuleSnapshot(psData, armory, new Date(nowMs).toISOString().slice(0, 7));

  const deltaSummary = {
    xpGained: currentSnapshot.totalXp - baselineSnapshot.totalXp,
    levelDelta: currentSnapshot.level - baselineSnapshot.level,
    streakDelta: currentSnapshot.streakDays - baselineSnapshot.streakDays,
    daySpan: lookbackDays,
  };

  await capsuleRef.set({
    capsuleId,
    surfacedAt: new Date(nowMs).toISOString().slice(0, 10),
    baselineDate,
    baselineSnapshot,
    currentSnapshot,
    deltaSummary,
    acknowledged: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info('trajectoryPlateauDetector: capsule written', {playerEmail, capsuleId, weekKey});
  return true;
}

// ── Scheduled function ────────────────────────────────────────────────────────

const trajectoryPlateauDetector = onSchedule(
    {
      schedule: '30 2 * * *', // daily at 02:30 UTC
      timeZone: 'UTC',
      memory: '512MiB',
      timeoutSeconds: 540,
    },
    async () => {
      const db = admin.firestore();

      const enabled = await isCapsulesEnabled();
      if (!enabled) {
        logger.info('trajectoryPlateauDetector: feature_trajectory_capsules_enabled is false — skipping');
        return;
      }

      const {lookbackDays, plateauThresholdPct} = await resolvePlateauParams();

      // Active = trained in last 14 days (same as lookback window).
      const cutoffDate = new Date(Date.now() - lookbackDays * 86_400_000).toISOString().slice(0, 10);

      const psSnap = await db.collection('player_stats')
          .where('last_training_utc', '>=', cutoffDate)
          .limit(500)
          .get();

      if (psSnap.empty) {
        logger.info('trajectoryPlateauDetector: no active players found');
        return;
      }

      logger.info(`trajectoryPlateauDetector: checking ${psSnap.size} active players`);

      let capsulesWritten = 0;

      for (const psDoc of psSnap.docs) {
        const psData = psDoc.data() || {};
        const playerEmail = typeof psData.playerEmail === 'string' && psData.playerEmail ?
          psData.playerEmail : null;
        if (!playerEmail) continue;

        try {
          const wrote = await maybeWriteCapsule(
              db,
              playerEmail,
              psDoc.id,
              lookbackDays,
              plateauThresholdPct,
          );
          if (wrote) capsulesWritten++;
        } catch (err) {
          logger.error('trajectoryPlateauDetector: capsule error', {playerEmail, err});
        }
      }

      logger.info(`trajectoryPlateauDetector: complete — ${capsulesWritten} capsules written`);
    },
);

// ── On-demand callable ────────────────────────────────────────────────────────

/**
 * `getMemoryCapsule` — callable.
 * Returns the most recent unacknowledged capsule for the calling player.
 * If none exists, returns `{ capsule: null }`.
 *
 * Auth: player must be signed in (uid resolved to playerEmail via users doc).
 */
const getMemoryCapsule = onCall(
    {enforceAppCheck: false},
    async (req) => {
      if (!req.auth) {
        throw new HttpsError('unauthenticated', 'Sign in required.');
      }

      const db = admin.firestore();
      const uid = req.auth.uid;

      // Resolve email from auth.
      let playerEmail = '';
      try {
        const userRecord = await admin.auth().getUser(uid);
        playerEmail = (userRecord.email || '').toLowerCase();
      } catch (_) {
        throw new HttpsError('not-found', 'User record not found.');
      }

      if (!playerEmail) {
        throw new HttpsError('invalid-argument', 'No email on account.');
      }

      const capSnap = await db
          .collection(`users/${playerEmail}/memory_capsules`)
          .where('acknowledged', '==', false)
          .orderBy('surfacedAt', 'desc')
          .limit(1)
          .get();

      if (capSnap.empty) return {capsule: null};

      const doc = capSnap.docs[0];
      return {capsule: {capsuleId: doc.id, ...doc.data()}};
    },
);

module.exports = {trajectoryPlateauDetector, getMemoryCapsule};
