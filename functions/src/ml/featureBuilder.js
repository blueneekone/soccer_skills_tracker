'use strict';
/**
 * featureBuilder.js
 * ─────────────────
 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S3)
 *
 * Builds the 50-dimensional state vector that the Double DQN policy consumes.
 * All features are normalised to roughly [0, 1]. No PII enters the vector.
 *
 * Sources read (all Admin SDK):
 *   • player_stats/{uid}
 *   • workout_logs (uid match, last 28 days, capped at 50 docs)
 *   • physio_self_reports/{uid}/daily/* (last 7 days)
 *   • assignments (open, for uid's team, last 30 days)
 *   • team_assignments (active, latest one)
 *   • grit_awards (uid, last 30 days)
 */

const admin = require('firebase-admin');

/** @returns {import('firebase-admin').firestore.Firestore} */
const db = () => admin.firestore();

// ── Feature index constants ────────────────────────────────────────────────────

const FEATURE_NAMES = [
  'rollingRpe7d',           // [0]
  'rollingRpe28d',          // [1]
  'rollingSoreness3d',      // [2]
  'lastNightSleep',         // [3]
  'mood7dAvg',              // [4]
  'streakDays',             // [5]
  'sessionsLast7',          // [6]
  'daysSinceLastWorkout',   // [7]
  'acuteLoad',              // [8]
  'chronicLoad',            // [9]
  'acwr',                   // [10]
  'completedAssignments30d',// [11]
  'trainingAgeDays',        // [12]
  'coachIntentAttrIdx0',    // [13]
  'coachIntentAttrIdx1',    // [14]
  'coachIntentAttrIdx2',    // [15]
  'coachIntentAttrIdx3',    // [16]
  'coachIntentAttrIdx4',    // [17]
  'coachIntentAttrIdx5',    // [18]
  'coachIntentXpNorm',      // [19]
  'ageBandUnder13',         // [20]
  'ageBandTeen13to16',      // [21]
  'ageBandAdult',           // [22]
  'attrRating0',            // [23]
  'attrRating1',            // [24]
  'attrRating2',            // [25]
  'attrRating3',            // [26]
  'attrRating4',            // [27]
  'attrRating5',            // [28]
  'lastSessionDuration',    // [29]
  'lastSessionRpe',         // [30]
  'lastSessionSoreness',    // [31]
  'weekdayMon',             // [32]
  'weekdayTue',             // [33]
  'weekdayWed',             // [34]
  'weekdayThu',             // [35]
  'weekdayFri',             // [36]
  'weekdaySat',             // [37]
  'weekdaySun',             // [38]
  'sessionTimeAm',          // [39]
  'hasActiveAssignment',    // [40]
  'assignmentDaysRemaining',// [41]
  'restingFeel7dAvg',       // [42]
  'gritBonusEarned30d',     // [43]
  'totalXpNorm',            // [44]
  'reserved45',             // [45]
  'reserved46',             // [46]
  'reserved47',             // [47]
  'reserved48',             // [48]
  'reserved49',             // [49]
];

/**
 * Clamp a number to [0, 1].
 * @param {number} v
 */
const clamp01 = (v) => Math.min(1, Math.max(0, isNaN(v) ? 0 : v));

/**
 * Safe division — returns 0 when denominator is 0.
 * @param {number} num
 * @param {number} den
 */
const safeDivide = (num, den) => (den === 0 ? 0 : num / den);

/**
 * Convert Firestore Timestamp or Date to ms since epoch.
 * @param {unknown} ts
 */
function toMs(ts) {
  if (!ts) return 0;
  if (typeof ts === 'object' && 'toDate' in ts) return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

/**
 * Returns 'yyyy-mm-dd' UTC string for a given ms timestamp.
 * @param {number} ms
 */
const msToUtcDate = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * Map intensity string → RPE midpoint.
 * @param {string} intensity
 */
function intensityToRpe(intensity) {
  switch (String(intensity).toLowerCase()) {
    case 'low': return 3;
    case 'medium': return 5.5;
    case 'high': return 8;
    default: return 5;
  }
}

// ── ageBand resolution ────────────────────────────────────────────────────────

/**
 * @param {Record<string,unknown>} playerStats
 * @returns {'under13'|'teen13to16'|'adult'}
 */
function resolveAgeBand(playerStats) {
  const band = String(playerStats?.ageBand ?? '').toLowerCase();
  if (band === 'under13' || band === 'under_13') return 'under13';
  if (band === 'teen13to16' || band === 'teen_13_16') return 'teen13to16';
  return 'adult';
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Build the 50-dim normalised feature vector for a given player.
 *
 * @param {string} uid  Firebase Auth UID (no PII).
 * @param {Date}   [now]  Override for testability; defaults to `new Date()`.
 * @returns {Promise<{ vector: number[], featureNames: string[], builtAt: FirebaseFirestore.Timestamp }>}
 */
async function buildStateVector(uid, now = new Date()) {
  const nowMs = now.getTime();
  const DAY_MS = 86400000;

  // ── Parallel data fetch ─────────────────────────────────────────────────────
  const cutoff28 = new Date(nowMs - 28 * DAY_MS);
  const cutoff7  = new Date(nowMs - 7  * DAY_MS);
  const cutoff30 = new Date(nowMs - 30 * DAY_MS);

  const [psSnap, logsSnap, physioSnap, assignmentsSnap, teamAssignSnap, gritSnap] =
    await Promise.all([
      // player_stats
      db().collection('player_stats').doc(uid).get(),
      // workout_logs — last 28 days
      db().collection('workout_logs')
          .where('playerId', '==', uid)
          .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(cutoff28))
          .orderBy('timestamp', 'desc')
          .limit(50)
          .get(),
      // physio_self_reports — last 7 days
      db().collection('physio_self_reports').doc(uid).collection('daily')
          .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(cutoff7))
          .orderBy('createdAt', 'desc')
          .limit(7)
          .get(),
      // assignments — last 30 days for uid's team (fetched below after we have teamId)
      Promise.resolve(null),
      // team_assignments — active
      Promise.resolve(null),
      // grit_awards — last 30 days
      db().collection('grit_awards')
          .where('uid', '==', uid)
          .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(cutoff30))
          .limit(50)
          .get(),
    ]);

  const ps = psSnap.exists ? psSnap.data() : {};
  const teamId = String(ps?.teamId ?? '');

  // Fetch assignments now that we have teamId (only if teamId is set)
  let assignDocs = [];
  let teamAssignDocs = [];
  if (teamId && teamId !== 'admin') {
    const [aSnap, taSnap] = await Promise.all([
      db().collection('assignments')
          .where('teamId', '==', teamId)
          .where('status', '==', 'active')
          .orderBy('createdAt', 'desc')
          .limit(20)
          .get(),
      // Epic 8: filter active intents only, then scope-filter in memory.
      db().collection('team_assignments')
          .where('teamId', '==', teamId)
          .where('status', '==', 'active')
          .orderBy('priority', 'asc')
          .limit(20)
          .get(),
    ]);
    assignDocs = aSnap.docs.map((d) => d.data());

    // Epic 8: apply read-repair defaults and scope-filter for this uid.
    const allActiveIntents = taSnap.docs.map((d) => {
      const raw = d.data();
      return {
        scope: 'team',
        targetUids: [],
        priority: 100,
        status: 'active',
        fulfilledByUids: [],
        intentVersion: 1,
        ...raw,
      };
    });
    // Keep only intents this player is in scope for.
    teamAssignDocs = allActiveIntents.filter((intent) => {
      if (intent.scope === 'team') return true;
      return Array.isArray(intent.targetUids) && intent.targetUids.includes(uid);
    });
  }

  const logs = logsSnap.docs.map((d) => d.data());
  const physioReports = physioSnap.docs.map((d) => d.data());

  // ── Derived signals ─────────────────────────────────────────────────────────

  // RPE arrays (use subjectiveRpe if present, else derive from intensity)
  const rpe28 = logs.map((l) =>
    typeof l.subjectiveRpe === 'number' ? l.subjectiveRpe : intensityToRpe(l.intensity),
  );
  const logs7 = logs.filter((l) => toMs(l.timestamp) >= nowMs - 7 * DAY_MS);
  const rpe7 = logs7.map((l) =>
    typeof l.subjectiveRpe === 'number' ? l.subjectiveRpe : intensityToRpe(l.intensity),
  );

  const rollingRpe28d = clamp01(safeDivide(rpe28.reduce((s, v) => s + v, 0), rpe28.length) / 10);
  const rollingRpe7d  = clamp01(safeDivide(rpe7.reduce((s, v) => s + v, 0), rpe7.length) / 10);

  // Soreness from physio (last 3 reports)
  const soreness3 = physioReports.slice(0, 3).filter((p) => p.soreness > 0).map((p) => p.soreness);
  const rollingSoreness3d = clamp01(safeDivide(soreness3.reduce((s, v) => s + v, 0), soreness3.length) / 5);

  // Sleep — most recent physio report
  const lastNightSleep = clamp01((physioReports[0]?.sleepHours ?? 7) / 12);

  // Mood 7d avg
  const mood7 = physioReports.filter((p) => p.mood > 0).map((p) => p.mood);
  const mood7dAvg = clamp01(safeDivide(mood7.reduce((s, v) => s + v, 0), mood7.length) / 5);

  // RestingFeel 7d avg
  const rFeel7 = physioReports.filter((p) => p.restingFeel > 0).map((p) => p.restingFeel);
  const restingFeel7dAvg = clamp01(safeDivide(rFeel7.reduce((s, v) => s + v, 0), rFeel7.length) / 5);

  // Streak
  const streakDays = clamp01((ps?.streak_days ?? 0) / 60);

  // Sessions last 7
  const sessionsLast7 = clamp01(logs7.length / 7);

  // Days since last workout
  const lastLog = logs[0];
  const daysSinceLastWorkout = lastLog ?
    clamp01((nowMs - toMs(lastLog.timestamp)) / (30 * DAY_MS)) :
    1.0;

  // Acute load: sum(RPE × durationMin) over 7 days
  const acuteLoad = clamp01(
    logs7.reduce((s, l) => s + (l.duration ?? 0) * (typeof l.subjectiveRpe === 'number' ? l.subjectiveRpe : intensityToRpe(l.intensity)), 0) / 2000,
  );

  // Chronic load: sum over 28 days
  const chronicLoad = clamp01(
    logs.reduce((s, l) => s + (l.duration ?? 0) * (typeof l.subjectiveRpe === 'number' ? l.subjectiveRpe : intensityToRpe(l.intensity)), 0) / 8000,
  );

  const acwr = clamp01(safeDivide(acuteLoad, Math.max(chronicLoad, 0.001)) / 2);

  // Completed assignments ratio (last 30 days)
  const completedAssignments30d = clamp01(
    safeDivide(
      assignDocs.filter((a) => a.status === 'completed').length,
      assignDocs.length + 1,
    ),
  );

  // Training age in days
  const firstLogMs = logs.length > 0 ?
    Math.min(...logs.map((l) => toMs(l.timestamp))) :
    nowMs;
  const trainingAgeDays = clamp01((nowMs - firstLogMs) / (365 * DAY_MS));

  // Epic 8: highest-priority active intent in scope (lowest priority number wins).
  // Falls back to first doc if priority field is missing (read-repair default 100 applied above).
  const latestTeamAssign = teamAssignDocs[0];
  const coachAttrId = String(latestTeamAssign?.targetAttributeId ?? '');

  // Build a 6-slot attribute key list from player_stats (or use positional)
  // The sports_configs canonical order; we map via xpByAttribute keys.
  // For the state vector we use the xpByAttribute keys sorted alphabetically
  // as a stable proxy (S6 will inject the canonical sport attribute list).
  const xpByAttribute = /** @type {Record<string,number>} */ (ps?.xpByAttribute ?? {});
  const attrKeys = Object.keys(xpByAttribute).sort().slice(0, 6);
  while (attrKeys.length < 6) attrKeys.push('');

  const coachIntentOneHot = attrKeys.map((k) => (k && k === coachAttrId ? 1 : 0));
  const coachIntentXpNorm = clamp01((latestTeamAssign?.requiredXp ?? 0) / 500);

  // Age band
  const ageBand = resolveAgeBand(ps);
  const ageBandUnder13   = ageBand === 'under13' ? 1 : 0;
  const ageBandTeen13to16 = ageBand === 'teen13to16' ? 1 : 0;
  const ageBandAdult     = ageBand === 'adult' ? 1 : 0;

  // Attribute ratings (normalised 0-99 → 0-1)
  const attrRatings = attrKeys.map((k) =>
    k ? clamp01((Number(xpByAttribute[k] ?? 0)) / 9900) : 0,
  );

  // Last session fields
  const lastSessionDuration = clamp01((lastLog?.duration ?? 0) / 90);
  const lastSessionRpe = clamp01(
    (typeof lastLog?.subjectiveRpe === 'number' ? lastLog.subjectiveRpe : intensityToRpe(lastLog?.intensity ?? 'medium')) / 10,
  );
  const lastSessionSoreness = clamp01((lastLog?.soreness ?? 0) / 5);

  // Weekday one-hot (UTC)
  const weekday = now.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const weekdayHot = [0, 0, 0, 0, 0, 0, 0]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  if (weekday >= 0 && weekday <= 6) weekdayHot[weekday] = 1;
  // Reorder to Mon-Sun as per feature spec
  const weekdayMon = weekdayHot[1];
  const weekdayTue = weekdayHot[2];
  const weekdayWed = weekdayHot[3];
  const weekdayThu = weekdayHot[4];
  const weekdayFri = weekdayHot[5];
  const weekdaySat = weekdayHot[6];
  const weekdaySun = weekdayHot[0];

  // Session time
  const sessionTimeAm = now.getUTCHours() < 12 ? 1 : 0;

  // Active assignment
  const activeAssign = assignDocs.find((a) => a.status === 'active') ?? null;
  const hasActiveAssignment = activeAssign ? 1 : 0;
  const dueMs = activeAssign?.dueAt ? toMs(activeAssign.dueAt) : 0;
  const assignmentDaysRemaining = dueMs > 0 ? clamp01((dueMs - nowMs) / (7 * DAY_MS)) : 0;

  // Grit bonuses last 30 days
  const gritBonusEarned30d = clamp01(gritSnap.docs.length / 10);

  // Total XP normalised
  const totalXpNorm = clamp01((ps?.total_xp ?? 0) / 50000);

  // ── Assemble vector ─────────────────────────────────────────────────────────
  const vector = [
    rollingRpe7d,           // [0]
    rollingRpe28d,          // [1]
    rollingSoreness3d,      // [2]
    lastNightSleep,         // [3]
    mood7dAvg,              // [4]
    streakDays,             // [5]
    sessionsLast7,          // [6]
    daysSinceLastWorkout,   // [7]
    acuteLoad,              // [8]
    chronicLoad,            // [9]
    acwr,                   // [10]
    completedAssignments30d,// [11]
    trainingAgeDays,        // [12]
    coachIntentOneHot[0],   // [13]
    coachIntentOneHot[1],   // [14]
    coachIntentOneHot[2],   // [15]
    coachIntentOneHot[3],   // [16]
    coachIntentOneHot[4],   // [17]
    coachIntentOneHot[5],   // [18]
    coachIntentXpNorm,      // [19]
    ageBandUnder13,         // [20]
    ageBandTeen13to16,      // [21]
    ageBandAdult,           // [22]
    attrRatings[0],         // [23]
    attrRatings[1],         // [24]
    attrRatings[2],         // [25]
    attrRatings[3],         // [26]
    attrRatings[4],         // [27]
    attrRatings[5],         // [28]
    lastSessionDuration,    // [29]
    lastSessionRpe,         // [30]
    lastSessionSoreness,    // [31]
    weekdayMon,             // [32]
    weekdayTue,             // [33]
    weekdayWed,             // [34]
    weekdayThu,             // [35]
    weekdayFri,             // [36]
    weekdaySat,             // [37]
    weekdaySun,             // [38]
    sessionTimeAm,          // [39]
    hasActiveAssignment,    // [40]
    assignmentDaysRemaining,// [41]
    restingFeel7dAvg,       // [42]
    gritBonusEarned30d,     // [43]
    totalXpNorm,            // [44]
    0, 0, 0, 0, 0,          // [45-49] reserved
  ];

  return {
    vector,
    featureNames: FEATURE_NAMES,
    builtAt: admin.firestore.Timestamp.now(),
  };
}

module.exports = { buildStateVector, FEATURE_NAMES };
