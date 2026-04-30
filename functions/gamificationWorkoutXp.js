/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
/**
 * Server-side gamification math — keep aligned with `src/lib/gamification/level.js`.
 * Cloud Functions must not trust client-computed XP; triggers / callables use this module.
 */

const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

/** Absolute max level (inclusive). */
const MAX_PLAYER_LEVEL = 99;

const DEFAULT_GAMIFICATION_XP = Object.freeze({
  xpPerRep: 10,
  xpPerIntenseMinute: 15,
});

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @return {{ xpPerRep: number, xpPerIntenseMinute: number }}
 */
function resolveXpRulesFromPayload(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const g = /** @type {Record<string, unknown>} */ (o);
  const game =
    g.gamification && typeof g.gamification === "object" ?
      /** @type {Record<string, unknown>} */ (g.gamification) :
      g;
  const xr = Math.max(0, Number(game.xpPerRep));
  const xim = Math.max(0, Number(game.xpPerIntenseMinute));
  return {
    xpPerRep: Number.isFinite(xr) && xr > 0 ? xr : DEFAULT_GAMIFICATION_XP.xpPerRep,
    xpPerIntenseMinute:
      Number.isFinite(xim) && xim > 0 ? xim : DEFAULT_GAMIFICATION_XP.xpPerIntenseMinute,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} workoutData
 * @return {number}
 */
function calculateWorkoutXp(workoutData) {
  const d = workoutData && typeof workoutData === "object" ? workoutData : {};
  const {xpPerRep, xpPerIntenseMinute} = resolveXpRulesFromPayload(
      "sportPayload" in d && d.sportPayload && typeof d.sportPayload === "object" ?
        /** @type {Record<string, unknown>} */ (d.sportPayload) :
        d,
  );
  const drills = Array.isArray(d.drills) ? d.drills : [];
  let acc = 0;

  if (drills.length > 0) {
    for (const raw of drills) {
      if (!raw || typeof raw !== "object") {
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (raw);
      let repCount = 0;
      const sets = Math.max(1, Math.min(999, Math.floor(Number(row.sets) || 0) || 1));
      const r = Math.max(0, Math.floor(Number(row.reps) || 0));
      if (r > 0) {
        repCount = sets * r;
      } else {
        repCount = Math.max(0, Math.floor(Number(row.totalReps) || 0));
      }
      const im = Math.max(0, Number(row.intenseMinutes) || 0);
      acc += repCount * xpPerRep;
      acc += im * xpPerIntenseMinute;
    }
  } else {
    const tr = Math.max(0, Math.floor(Number(d.totalReps) || 0));
    const tim = Math.max(0, Number(d.intenseMinutes) || 0);
    acc = tr * xpPerRep + tim * xpPerIntenseMinute;
  }

  return Math.max(0, Math.floor(acc));
}

/**
 * @param {{ duration: number, reps: number, intensity: string }} p
 * @return {number}
 */
function calculateTrainingSessionEarnedXp(p) {
  const duration = Math.max(0, Math.floor(Number(p.duration) || 0));
  const reps = Math.max(0, Math.floor(Number(p.reps) || 0));
  const ir = String(p.intensity || "low").toLowerCase();
  const mult = ir === "high" ? 1.35 : ir === "medium" ? 1.15 : 1.0;
  return calculateWorkoutXp({
    totalReps: reps,
    intenseMinutes: duration,
    sportPayload: {
      gamification: {
        xpPerRep: 2 * mult,
        xpPerIntenseMinute: 10 * mult,
      },
    },
  });
}

/**
 * @param {number} level Current level (1-based).
 * @return {number} XP needed to advance from this level to the next.
 */
function xpToAdvanceFromLevel(level) {
  const L = Math.floor(Number(level) || 0);
  if (L >= MAX_PLAYER_LEVEL) return 0;
  if (L < 1) return 100;
  return Math.floor(100 * Math.pow(L, 1.5));
}

/**
 * @param {number} totalXp
 * @return {{ level: number }}
 */
function trainingLevelFromTotalXp(totalXp) {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let at = 0;
  for (let guard = 0; guard < 10000; guard++) {
    if (level >= MAX_PLAYER_LEVEL) {
      return {level: MAX_PLAYER_LEVEL};
    }
    const need = xpToAdvanceFromLevel(level);
    if (xp < at + need) {
      return {level};
    }
    at += need;
    level++;
  }
  return {level: MAX_PLAYER_LEVEL};
}

/**
 * `reps/{repId}` payload (submitWorkoutRep) → non-negative XP from drills + session minutes.
 * @param {Record<string, unknown> | null | undefined} repData
 * @return {number}
 */
function calculateRepsEarnedXp(repData) {
  const d = repData && typeof repData === "object" ? repData : {};
  const minutes = Math.max(0, Math.floor(Number(d.minutes) || 0));
  const drillsRaw = Array.isArray(d.drills) ? d.drills : [];
  /** @type {Array<Record<string, unknown>>} */
  const drills = [];
  for (const raw of drillsRaw) {
    if (!raw || typeof raw !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (raw);
    const name = typeof row.name === "string" ? row.name : "Drill";
    const sets = Math.max(1, Math.min(999, Math.floor(Number(row.sets) || 0) || 1));
    const reps = Math.max(0, Math.floor(Number(row.reps) || 0));
    drills.push({name, sets, reps, intenseMinutes: 0});
  }
  if (drills.length === 0) {
    return calculateWorkoutXp({totalReps: 0, intenseMinutes: minutes});
  }
  if (minutes > 0) {
    drills.push({
      name: "_session_conditioning_",
      sets: 1,
      reps: 0,
      intenseMinutes: minutes,
    });
  }
  return calculateWorkoutXp({drills});
}

/**
 * Match-day stat deltas → XP (tuned for coach commits; not client-writable alone).
 * @param {{ g?: number, a?: number, sh?: number, sv?: number }} d
 * @return {number}
 */
function computeMatchTelemetryParlayXp(d) {
  const o = d && typeof d === "object" ? d : {};
  const g = Math.min(30, Math.max(0, Math.floor(Number(o.g) || 0)));
  const a = Math.min(30, Math.max(0, Math.floor(Number(o.a) || 0)));
  const sh = Math.min(100, Math.max(0, Math.floor(Number(o.sh) || 0)));
  const sv = Math.min(100, Math.max(0, Math.floor(Number(o.sv) || 0)));
  return g * 10 + a * 5 + sh * 1 + sv * 2;
}

/**
 * @param {string} ymd yyyy-mm-dd (UTC calendar)
 * @param {number} deltaDays
 * @return {string}
 */
function utcYmdAddDays(ymd, deltaDays) {
  const parts = String(ymd).split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/**
 * Monday UTC date key for weekly counters.
 * @return {string}
 */
function utcWeekMondayKey() {
  const now = new Date();
  const utc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - (dow - 1));
  return utc.toISOString().slice(0, 10);
}

/**
 * @param {unknown} e
 * @return {string}
 */
function normEmail(e) {
  return String(e == null ? "" : e)
      .trim()
      .toLowerCase();
}

/**
 * After a parent/player `reps` doc is created (submitWorkoutRep), grant XP from
 * drill volume + minutes. Idempotent via `gamificationXpGranted` on the rep doc.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {FirebaseFirestore.DocumentSnapshot} repSnap
 * @param {string} repId
 * @return {Promise<void>}
 */
async function grantTrainingXpAfterRepCreated(db, repSnap, repId) {
  if (!repSnap.exists) return;
  const d = repSnap.data() || {};
  if (d.gamificationXpGranted === true) return;

  const earned = calculateRepsEarnedXp(d);
  if (earned < 1) {
    return;
  }

  const playerEmail = normEmail(d.playerEmail);
  if (!playerEmail || !playerEmail.includes("@")) {
    logger.warn("grantTrainingXpAfterRepCreated: missing playerEmail", {repId});
    return;
  }

  let athleteUid = "";
  try {
    const au = await admin.auth().getUserByEmail(playerEmail);
    athleteUid = au.uid;
  } catch (e) {
    logger.error("grantTrainingXpAfterRepCreated: getUserByEmail", {repId, playerEmail, err: e});
    return;
  }

  const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
  const playerName =
      typeof d.player === "string" && d.player.trim() ? d.player.trim() : "";

  const repsTotal = (Array.isArray(d.drills) ? d.drills : []).reduce((acc, raw) => {
    if (!raw || typeof raw !== "object") return acc;
    const row = /** @type {Record<string, unknown>} */ (raw);
    const sets = Math.max(1, Math.min(999, Math.floor(Number(row.sets) || 0) || 1));
    const r = Math.max(0, Math.floor(Number(row.reps) || 0));
    return acc + sets * r;
  }, 0);

  const duration = Math.max(0, Math.floor(Number(d.minutes) || 0));
  const now = admin.firestore.FieldValue.serverTimestamp();
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = utcYmdAddDays(todayStr, -1);
  const weekKey = utcWeekMondayKey();

  const uRef = db.collection("users").doc(playerEmail);
  const psRef = db.collection("player_stats").doc(athleteUid);
  const repRef = db.collection("reps").doc(repId);

  try {
    await db.runTransaction(async (tx) => {
      const [repTx, psSnap, uSnap] = await Promise.all([
        tx.get(repRef),
        tx.get(psRef),
        tx.get(uRef),
      ]);
      if (!repTx.exists) return;
      const repFresh = repTx.data() || {};
      if (repFresh.gamificationXpGranted === true) return;
      if (!uSnap.exists) {
        logger.warn("grantTrainingXpAfterRepCreated: user missing", {playerEmail, repId});
        return;
      }

      const prevTotal =
          psSnap.exists &&
          typeof psSnap.data().total_xp === "number" &&
          !Number.isNaN(psSnap.data().total_xp) ?
            Math.floor(psSnap.data().total_xp) :
            0;
      const newTotal = prevTotal + earned;

      const prevWeek =
          psSnap.exists && typeof psSnap.data().stats_week_key === "string" ?
            psSnap.data().stats_week_key :
            "";
      let repsWeek = 0;
      let minsWeek = 0;
      let xpWeek = 0;
      if (prevWeek === weekKey && psSnap.exists) {
        const sd = psSnap.data();
        const rw = sd.reps_this_week;
        repsWeek = typeof rw === "number" && !Number.isNaN(rw) ? rw : 0;
        minsWeek =
            typeof sd.minutes_this_week === "number" && !Number.isNaN(sd.minutes_this_week) ?
              sd.minutes_this_week :
              0;
        const xw = sd.xp_this_week;
        xpWeek = typeof xw === "number" && !Number.isNaN(xw) ? Math.floor(xw) : 0;
      }
      repsWeek += repsTotal;
      minsWeek += duration;
      xpWeek += earned;

      const lastTr =
          psSnap.exists && typeof psSnap.data().last_training_utc === "string" ?
            psSnap.data().last_training_utc :
            "";
      let streakDays = 1;
      if (psSnap.exists) {
        const sd = psSnap.data();
        const prevSt =
            typeof sd.streak_days === "number" && !Number.isNaN(sd.streak_days) ?
              Math.floor(sd.streak_days) :
              0;
        if (lastTr === todayStr) {
          streakDays = Math.max(1, prevSt);
        } else if (lastTr === yesterdayStr) {
          streakDays = Math.max(1, prevSt + 1);
        } else if (lastTr) {
          streakDays = 1;
        } else {
          streakDays = 1;
        }
      }

      const lv = trainingLevelFromTotalXp(newTotal);
      const xpInc = admin.firestore.FieldValue.increment(earned);

      const uData = uSnap.data() || {};
      const prevLong =
          typeof uData.longestStreak === "number" && !Number.isNaN(uData.longestStreak) ?
            Math.floor(uData.longestStreak) :
            0;

      tx.set(
          psRef,
          {
            teamId: teamId || null,
            playerName: playerName || null,
            total_xp: xpInc,
            current_level: lv.level,
            reps_this_week: repsWeek,
            minutes_this_week: minsWeek,
            xp_this_week: xpWeek,
            streak_days: streakDays,
            stats_week_key: weekKey,
            last_training_utc: todayStr,
            updatedAt: now,
          },
          {merge: true},
      );

      tx.update(uRef, {
        xp: xpInc,
        totalXp: xpInc,
        trainingLevel: lv.level,
        currentStreak: streakDays,
        longestStreak: Math.max(prevLong, streakDays),
        updatedAt: now,
      });

      tx.update(repRef, {
        gamificationXpGranted: true,
        gamificationEarnedXp: earned,
        gamificationGrantedAt: now,
      });
    });
  } catch (e) {
    logger.error("grantTrainingXpAfterRepCreated transaction failed", {repId, err: e});
  }
}

module.exports = {
  MAX_PLAYER_LEVEL,
  xpToAdvanceFromLevel,
  trainingLevelFromTotalXp,
  calculateWorkoutXp,
  calculateTrainingSessionEarnedXp,
  calculateRepsEarnedXp,
  computeMatchTelemetryParlayXp,
  grantTrainingXpAfterRepCreated,
};
