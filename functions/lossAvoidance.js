/* eslint-disable quotes */
/**
 * lossAvoidance.js — Epic 5: Octalysis Core Drive 8 (Loss Avoidance)
 * ────────────────────────────────────────────────────────────────────
 * Phase 3, Epic 5.
 *
 * Exports
 * ───────
 *   enforceLossAvoidance       — nightly 03:30 UTC scheduled sweep.
 *                                Drains inactive XP, breaks/freezes streaks,
 *                                and queues reengagement alerts.
 *   dispatchReengagementAlerts — runs every 30 minutes to flush the alert
 *                                queue via FCM push notifications.
 *   claimStreakFreeze          — onCall: player/parent consumes a streak freeze.
 *
 * Architecture
 * ────────────
 * • enforceLossAvoidance pages through `users` where `armory.lastActiveUtc`
 *   is older than the grace window, processing up to PAGE_SIZE players per
 *   invocation (Cloud Run 9-min timeout safety).
 * • Each player is updated inside a Firestore transaction to avoid
 *   read-then-write races with concurrent workout logs.
 * • `idempotency key`: `armory.decayState.lastDecayRunUtc === todayUtc`
 *   short-circuits the transaction — safe to re-run multiple times/day.
 * • Decay is gated by the `feature_skill_decay_enabled` Remote Config flag
 *   (string param queried from the Functions parameter store, defaulting to
 *   "false" so production is safe until explicitly enabled).
 * • Streak enforcement is gated by `feature_streak_enforcement_enabled`.
 * • COPPA 2.0: alerts for under-13 players are routed to the parent email
 *   stored in `users/{playerEmail}.coppa.parentEmail`.
 * • Multi-tenant: every write includes the player's `clubId` so noisy-
 *   neighbour decay storms are visible in per-tenant cell metrics.
 *
 * Kill switches (Remote Config)
 * ─────────────────────────────
 *   feature_skill_decay_enabled         — default false
 *   feature_streak_enforcement_enabled  — default false
 *   decay_grace_days                    — default 2
 *   decay_pct_per_day                   — default 0.01
 *   decay_max_pct                       — default 0.25
 *   streak_freeze_per_week              — default 1
 */

'use strict';

const {onSchedule}            = require('firebase-functions/v2/scheduler');
const {onCall, HttpsError}    = require('firebase-functions/v2/https');
const logger                  = require('firebase-functions/logger');
const admin                   = require('firebase-admin');
const {defineString}          = require('firebase-functions/params');

const {
  resolveStreak,
  computeDecay,
  utcDateStr,
  isoWeekKey,
} = require('./streakUtils');
const {collectFcmTokensForUids} = require('./src/domains/notificationOps');

// ── Environment params (safe defaults = everything off) ───────────────────────

const RC_DECAY_ENABLED         = defineString('FEATURE_SKILL_DECAY_ENABLED',        {default: 'false'});
const RC_STREAK_ENABLED        = defineString('FEATURE_STREAK_ENFORCEMENT_ENABLED',  {default: 'false'});
const RC_GRACE_DAYS            = defineString('DECAY_GRACE_DAYS',                   {default: '2'});
const RC_PCT_PER_DAY           = defineString('DECAY_PCT_PER_DAY',                  {default: '0.01'});
const RC_MAX_PCT               = defineString('DECAY_MAX_PCT',                      {default: '0.25'});
const RC_FREEZE_PER_WEEK       = defineString('STREAK_FREEZE_PER_WEEK',             {default: '1'});

const REGION       = 'us-east1';
const PAGE_SIZE    = 200;
const PUSH_COOLDOWN_MS = 23 * 60 * 60 * 1000; // 23 h — max 1 push per day

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Lazy Firestore accessor — defers init until first call. */
const db = () => admin.firestore();

/**
 * Read per-invocation Remote Config params (string → typed).
 * Defined as a function so each invocation gets a fresh read.
 */
function readParams() {
  return {
    decayEnabled:      RC_DECAY_ENABLED.value()        === 'true',
    streakEnabled:     RC_STREAK_ENABLED.value()       === 'true',
    graceDays:         parseFloat(RC_GRACE_DAYS.value())  || 2,
    pctPerDay:         parseFloat(RC_PCT_PER_DAY.value()) || 0.01,
    maxPct:            parseFloat(RC_MAX_PCT.value())     || 0.25,
    freezePerWeek:     parseInt(RC_FREEZE_PER_WEEK.value(), 10) || 1,
  };
}

/**
 * Replenish a player's streak freeze allowance if the ISO week has rolled.
 * Returns the `available` count to use for the current sweep.
 *
 * @param {object} freezeDoc  - armory.streakFreeze (may be undefined)
 * @param {number} nowMs
 * @param {number} freezePerWeek
 * @returns {{ available: number, weekKey: string, replenished: boolean }}
 */
function resolveFreeze(freezeDoc, nowMs, freezePerWeek) {
  const currentWeek = isoWeekKey(nowMs);
  if (!freezeDoc || freezeDoc.weekKey !== currentWeek) {
    return {available: freezePerWeek, weekKey: currentWeek, replenished: true};
  }
  return {
    available: typeof freezeDoc.available === 'number' ? freezeDoc.available : 0,
    weekKey: currentWeek,
    replenished: false,
  };
}

/**
 * Determine alert severity (1-3) based on idle days.
 * @param {number} idleDays
 * @returns {1|2|3}
 */
function alertSeverity(idleDays) {
  if (idleDays >= 7) return 3;
  if (idleDays >= 4) return 2;
  return 1;
}

/**
 * Lookup the notification target UID for a player.
 * For COPPA-gated minors: route to the parent's Firebase Auth UID.
 * For all others: return the player's own UID.
 *
 * @param {object}  userData   - Firestore users/{email} data
 * @param {string}  playerUid  - the player's Firebase Auth UID
 * @returns {Promise<string>}
 */
async function resolveNotificationTarget(userData, playerUid) {
  const coppa = userData.coppa || {};
  const isMinor = coppa.status === 'pending' || coppa.status === 'denied'
    || userData.ageGroup === 'U13' || userData.isUnder13 === true;

  if (!isMinor) return playerUid;

  const parentEmail = typeof coppa.parentEmail === 'string' ? coppa.parentEmail.trim() : '';
  if (!parentEmail) return playerUid;

  try {
    const parentRecord = await admin.auth().getUserByEmail(parentEmail);
    return parentRecord.uid;
  } catch {
    return playerUid;
  }
}

// ── enforceLossAvoidance ─────────────────────────────────────────────────────

/**
 * Nightly scheduled sweep — 03:30 UTC.
 *
 * For each player whose `armory.lastActiveUtc` is older than today minus
 * the grace window:
 *   1. Compute XP drain and streak outcome deterministically.
 *   2. Apply changes in a Firestore transaction (idempotent per-day).
 *   3. Queue a reengagement alert doc for FCM dispatch.
 */
exports.enforceLossAvoidance = onSchedule(
    {
      schedule: '30 3 * * *',
      timeZone: 'UTC',
      region: REGION,
      memory: '512MiB',
      timeoutSeconds: 540,
    },
    async () => {
      const params = readParams();

      if (!params.decayEnabled && !params.streakEnabled) {
        logger.info('enforceLossAvoidance: both flags off — skipping sweep');
        return;
      }

      const nowMs    = Date.now();
      const todayStr = utcDateStr(nowMs);

      // Grace cutoff: only sweep players idle beyond graceDays.
      const cutoffDate = utcDateStr(nowMs - params.graceDays * 86_400_000);

      let lastDoc   = null;
      let processed = 0;
      let decayed   = 0;
      let broken    = 0;
      let frozen    = 0;

      // ── Paginate through eligible users ──────────────────────────────────
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let query = db()
            .collection('users')
            .where('armory.lastActiveUtc', '<=', cutoffDate)
            .orderBy('armory.lastActiveUtc', 'asc')
            .limit(PAGE_SIZE);

        if (lastDoc) query = query.startAfter(lastDoc);

        const snap = await query.get();
        if (snap.empty) break;

        logger.info('enforceLossAvoidance: page', {
          size: snap.size,
          cutoffDate,
          todayStr,
        });

        for (const userDoc of snap.docs) {
          try {
            const result = await processSinglePlayer({
              userDoc,
              todayStr,
              nowMs,
              params,
              db: db(),
            });
            processed++;
            if (result.decayXp > 0) decayed++;
            if (result.streakStatus === 'broken') broken++;
            if (result.streakStatus === 'frozen') frozen++;
          } catch (err) {
            logger.error('enforceLossAvoidance: player failed', {
              uid: userDoc.id,
              err: err instanceof Error ? err.message : String(err),
            });
          }
        }

        if (snap.size < PAGE_SIZE) break;
        lastDoc = snap.docs[snap.docs.length - 1];
      }

      logger.info('enforceLossAvoidance: complete', {
        processed, decayed, broken, frozen,
      });
    },
);

/**
 * Process a single player document inside a transaction.
 *
 * @param {object} p
 * @param {FirebaseFirestore.QueryDocumentSnapshot} p.userDoc
 * @param {string}  p.todayStr
 * @param {number}  p.nowMs
 * @param {object}  p.params
 * @param {FirebaseFirestore.Firestore} p.db
 * @returns {Promise<{decayXp: number, streakStatus: string}>}
 */
async function processSinglePlayer({userDoc, todayStr, nowMs, params, db: firestoreDb}) {
  const userEmail = userDoc.id;
  const userData  = userDoc.data() || {};
  const armory    = userData.armory || {};
  const clubId    = userData.clubId || '';

  // Resolve the player's Firebase Auth UID.
  let playerUid;
  try {
    const authRecord = await admin.auth().getUserByEmail(userEmail);
    playerUid = authRecord.uid;
  } catch {
    logger.warn('enforceLossAvoidance: auth lookup failed', {userEmail});
    return {decayXp: 0, streakStatus: 'active'};
  }

  const psRef   = firestoreDb.collection('player_stats').doc(playerUid);
  const userRef = firestoreDb.collection('users').doc(userEmail);

  let outcome = {decayXp: 0, streakStatus: armory.streakStatus || 'active'};

  await firestoreDb.runTransaction(async (tx) => {
    const [freshUser, psSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(psRef),
    ]);

    if (!freshUser.exists) return;

    const freshArmory = (freshUser.data() || {}).armory || {};

    // ── Idempotency guard ─────────────────────────────────────────────────
    const prevRun = (freshArmory.decayState || {}).lastDecayRunUtc;
    if (prevRun === todayStr) return; // already processed today

    const totalXp     = typeof freshArmory.totalXP === 'number' ? freshArmory.totalXP : 0;
    const lastActive  = typeof freshArmory.lastActiveUtc === 'string' ? freshArmory.lastActiveUtc : '';

    // ── Streak data from player_stats ─────────────────────────────────────
    const psData         = psSnap.exists ? psSnap.data() : {};
    const prevStreakDays  = typeof psData.streak_days  === 'number' ? Math.floor(psData.streak_days)  : 0;
    const prevStatus     = typeof psData.streakStatus  === 'string' ? psData.streakStatus  : '';
    const lastTraining   = typeof psData.last_training_utc === 'string' ? psData.last_training_utc : lastActive;

    // ── Freeze resolution ─────────────────────────────────────────────────
    const freeze = resolveFreeze(freshArmory.streakFreeze, nowMs, params.freezePerWeek);

    // ── Streak outcome ────────────────────────────────────────────────────
    let streakResult = {
      newStreakDays: prevStreakDays,
      newStreakStatus: prevStatus || 'active',
      freezeConsumed: false,
      alertKind: '',
      missedDays: 0,
    };
    if (params.streakEnabled) {
      streakResult = resolveStreak({
        lastTrainingUtc: lastTraining,
        prevStreakDays,
        streakStatus: prevStatus,
        freezeAvailable: freeze.available,
        workoutLoggedToday: false,
        nowMs,
        enforcementEnabled: true,
      });
    }

    // ── Decay computation ─────────────────────────────────────────────────
    let decayXp  = 0;
    let idleDays = 0;
    let decayPct = 0;
    if (params.decayEnabled) {
      const result = computeDecay({
        totalXp,
        lastActiveUtc: lastActive,
        nowMs,
        graceDays: params.graceDays,
        pctPerDay: params.pctPerDay,
        maxPct: params.maxPct,
      });
      decayXp  = result.decayXp;
      idleDays = result.idleDays;
      decayPct = result.decayPct;
    }

    // ── Assemble writes ───────────────────────────────────────────────────
    const batchId = crypto.randomUUID ? crypto.randomUUID()
      : `decay-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const decayStateUpdate = {
      lastDecayRunUtc: todayStr,
      idleDays: Math.max(idleDays, streakResult.missedDays),
      totalDecayedXp: admin.firestore.FieldValue.increment(decayXp),
      lastDecayPct: decayPct,
    };

    const newFreeze = {
      available: streakResult.freezeConsumed
        ? Math.max(0, freeze.available - 1)
        : freeze.available,
      weekKey: freeze.weekKey,
      consumedAt: streakResult.freezeConsumed ? new Date().toISOString() : undefined,
    };
    if (!newFreeze.consumedAt) delete newFreeze.consumedAt;

    // User doc (armory map) update — dot notation preserves all other fields.
    const userPatch = {
      'armory.decayState': decayStateUpdate,
      'armory.streakFreeze': newFreeze,
    };
    if (decayXp > 0) {
      userPatch['armory.totalXP'] = admin.firestore.FieldValue.increment(-decayXp);
    }

    tx.set(userRef, userPatch, {merge: true});

    // XP history sub-collection entry (only when XP was actually drained).
    if (decayXp > 0) {
      const histRef = firestoreDb
          .collection('users')
          .doc(userEmail)
          .collection('xpHistory')
          .doc(batchId);
      const newTotal = Math.max(0, totalXp - decayXp);
      tx.set(histRef, {
        date: todayStr,
        amount: -decayXp,
        reason: `Skill decay — ${idleDays} day${idleDays === 1 ? '' : 's'} inactive`,
        runningTotal: newTotal,
        batchId,
        loggedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // player_stats update.
    if (params.streakEnabled) {
      const psPatch = {
        streak_days: streakResult.newStreakDays,
        streakStatus: streakResult.newStreakStatus,
        gracePeriodEndsUtc: utcDateStr(nowMs - (params.graceDays - 1) * 86_400_000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (freeze.replenished) {
        psPatch.streakFreezeAvailable = params.freezePerWeek;
      } else if (streakResult.freezeConsumed) {
        psPatch.streakFreezeAvailable = admin.firestore.FieldValue.increment(-1);
      }
      tx.set(psRef, psPatch, {merge: true});
    }

    // Queue a reengagement alert if warranted.
    const alertKind = streakResult.alertKind || (decayXp > 0 ? 'decay_started' : '');
    if (alertKind) {
      const alertDocId = `${playerUid}_${todayStr.replace(/-/g, '')}`;
      const alertRef = firestoreDb.collection('reengagement_alerts').doc(alertDocId);
      tx.set(alertRef, {
        uid: playerUid,
        userKey: userEmail,
        clubId,
        kind: alertKind,
        severity: alertSeverity(streakResult.missedDays || idleDays),
        scheduledFor: new Date().toISOString(),
        sentAt: null,
        acknowledgedAt: null,
        idleDays: streakResult.missedDays || idleDays,
        decayedXp: decayXp,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: false});
    }

    outcome = {decayXp, streakStatus: streakResult.newStreakStatus};
  });

  return outcome;
}

// ── dispatchReengagementAlerts ─────────────────────────────────────────────

/**
 * Flush the `reengagement_alerts` queue every 30 minutes.
 *
 * Reads un-sent alerts (sentAt == null) whose `scheduledFor` <= now,
 * looks up FCM tokens via `collectFcmTokensForUids`, sends a push with
 * copy that cites `idleDays` and `decayedXp`, then stamps `sentAt`.
 *
 * COPPA routing: for minors the notification target is the parent UID
 * (resolved from `users/{email}.coppa.parentEmail`).
 *
 * Rate limit: enforced by `scheduledFor` plus a per-alert `sentAt` guard —
 * at most 1 push per uid per alert doc (one doc per day per uid).
 */
exports.dispatchReengagementAlerts = onSchedule(
    {
      schedule: 'every 30 minutes',
      region: REGION,
      memory: '256MiB',
      timeoutSeconds: 120,
    },
    async () => {
      const params = readParams();
      if (!params.decayEnabled && !params.streakEnabled) return;

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const cutoffMs = nowMs - PUSH_COOLDOWN_MS;

      const snap = await db()
          .collection('reengagement_alerts')
          .where('sentAt', '==', null)
          .where('scheduledFor', '<=', nowIso)
          .limit(100)
          .get();

      if (snap.empty) return;

      let sent = 0;
      let failed = 0;

      for (const alertDoc of snap.docs) {
        const alert = alertDoc.data() || {};
        const {uid, userKey, kind, severity, idleDays, decayedXp} = alert;

        if (!uid) continue;

        try {
          // COPPA parent routing.
          const userSnap = await db().collection('users').doc(userKey || '').get();
          const userData = userSnap.exists ? userSnap.data() : {};
          const targetUid = await resolveNotificationTarget(userData, uid);

          // Rate limit: check if we sent to this target recently.
          const recentSnap = await db()
              .collection('reengagement_alerts')
              .where('uid', '==', uid)
              .where('sentAt', '>=', new Date(cutoffMs).toISOString())
              .limit(1)
              .get();
          if (!recentSnap.empty) {
            // Already dispatched within cooldown window — skip.
            continue;
          }

          const tokens = await collectFcmTokensForUids([targetUid]);
          if (tokens.length === 0) {
            // No tokens but still mark sentAt so we don't retry indefinitely.
            await alertDoc.ref.update({sentAt: new Date().toISOString()});
            continue;
          }

          const {title, body} = buildNotificationCopy({kind, severity, idleDays, decayedXp});

          await admin.messaging().sendEachForMulticast({
            tokens,
            notification: {title, body},
            data: {
              kind,
              idleDays: String(idleDays || 0),
              decayedXp: String(decayedXp || 0),
              route: '/player/tracker',
            },
            android: {priority: 'high'},
            apns: {payload: {aps: {sound: 'default'}}},
          });

          await alertDoc.ref.update({sentAt: new Date().toISOString()});
          sent++;
        } catch (err) {
          failed++;
          logger.error('dispatchReengagementAlerts: send failed', {
            alertId: alertDoc.id,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }

      logger.info('dispatchReengagementAlerts: done', {sent, failed});
    },
);

/**
 * Build FCM notification title + body from alert metadata.
 * Copy is intentionally empathetic — avoids shame language (Epic 7 EQ).
 *
 * @param {object} p
 * @param {string} p.kind
 * @param {number} p.severity
 * @param {number} p.idleDays
 * @param {number} p.decayedXp
 * @returns {{title: string, body: string}}
 */
function buildNotificationCopy({kind, severity, idleDays, decayedXp}) {
  const days = Math.max(1, Math.round(idleDays || 0));
  const xp   = Math.round(decayedXp || 0);

  if (kind === 'streak_lost') {
    return {
      title: '🔥 Streak lost',
      body: severity >= 3
        ? `It's been ${days} days — your streak reset, but your potential hasn't. Log a session to restart!`
        : `Your streak ended after ${days} day${days === 1 ? '' : 's'} away. Log a workout to build back up.`,
    };
  }

  if (kind === 'streak_warning') {
    return {
      title: '⚠ Streak at risk',
      body: `Log a session today to keep your streak alive — you're ${days} day${days === 1 ? '' : 's'} away from losing it.`,
    };
  }

  // decay_started
  if (xp > 0) {
    return {
      title: '📉 Skill decay active',
      body: severity >= 2
        ? `You've lost ${xp} XP from ${days} days of inactivity. Log a session to stop the drain!`
        : `Skills fade without practice — ${xp} XP decayed. Come back and reclaim it.`,
    };
  }

  return {
    title: '🏃 Ready when you are',
    body: `It's been ${days} days. A quick session keeps your skills sharp — you've got this.`,
  };
}

// ── claimStreakFreeze (onCall) ────────────────────────────────────────────────

/**
 * Consume a streak freeze on behalf of the authenticated player.
 *
 * Client calls:  httpsCallable(functions, 'claimStreakFreeze')({})
 *
 * Server validates:
 *   1. Player has at least 1 freeze available this ISO week.
 *   2. Streak is currently 'active' or 'frozen' (can't freeze an already-broken streak).
 *
 * Returns: { ok: boolean, freezesRemaining: number }
 */
exports.claimStreakFreeze = onCall(
    {region: REGION},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be signed in.');
      }

      const uid   = request.auth.uid;
      const email = (request.auth.token.email || '').toLowerCase().trim();
      if (!email) throw new HttpsError('failed-precondition', 'No email on token.');

      const nowMs     = Date.now();
      const weekKey   = isoWeekKey(nowMs);
      const params    = readParams();
      const userRef   = db().collection('users').doc(email);
      const psRef     = db().collection('player_stats').doc(uid);

      let freezesRemaining = 0;

      await db().runTransaction(async (tx) => {
        const [userSnap, psSnap] = await Promise.all([tx.get(userRef), tx.get(psRef)]);
        if (!userSnap.exists) throw new HttpsError('not-found', 'User doc not found.');

        const armory = (userSnap.data() || {}).armory || {};
        const psData = psSnap.exists ? psSnap.data() : {};

        const freeze   = resolveFreeze(armory.streakFreeze, nowMs, params.freezePerWeek);
        const status   = psData.streakStatus || '';

        if (freeze.available <= 0) {
          throw new HttpsError('resource-exhausted', 'No streak freezes remaining this week.');
        }
        if (status === 'broken') {
          throw new HttpsError('failed-precondition', 'Cannot freeze an already-broken streak.');
        }

        const newAvailable = Math.max(0, freeze.available - 1);
        freezesRemaining = newAvailable;

        tx.set(userRef, {
          armory: {
            streakFreeze: {
              available: newAvailable,
              weekKey,
              consumedAt: new Date().toISOString(),
            },
          },
        }, {merge: true});

        tx.set(psRef, {
          streakStatus: 'frozen',
          streakFreezeAvailable: newAvailable,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
      });

      return {ok: true, freezesRemaining};
    },
);
