/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
/**
 * Server-side gamification math — keep aligned with `src/lib/gamification/level.js`.
 * Cloud Functions must not trust client-computed XP; triggers / callables use this module.
 */

const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {resolveStreak, utcDateStr, isoWeekKey} = require("./streakUtils");
const {evaluateActiveBountiesForPlayer} = require("./bountyVerification");
const {resolveActiveBoostMultiplier} = require("./coOpOps");

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

  const baseEarned = calculateRepsEarnedXp(d);
  if (baseEarned < 1) {
    return;
  }

  const playerEmail = normEmail(d.playerEmail);
  if (!playerEmail || !playerEmail.includes("@")) {
    logger.warn("grantTrainingXpAfterRepCreated: missing playerEmail", {repId});
    return;
  }

  // ── Apply parent-sponsored telemetry boost (Epic 5.4) ────────────────────
  let boostMultiplier         = 1.0;
  let boostSponsorEmail       = null;
  try {
    const boostResult = await resolveActiveBoostMultiplier(db, playerEmail, new Date());
    boostMultiplier   = boostResult.multiplier;
    boostSponsorEmail = boostResult.sponsoredByParentEmail;
  } catch (boostErr) {
    logger.warn("grantTrainingXpAfterRepCreated: boost resolution failed", {repId, err: boostErr});
  }
  const earned = Math.floor(baseEarned * boostMultiplier);

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
  const nowMs = Date.now();
  const todayStr = utcDateStr(nowMs);
  const weekKey = isoWeekKey(nowMs);

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
      const prevSt =
          psSnap.exists &&
          typeof psSnap.data().streak_days === "number" &&
          !Number.isNaN(psSnap.data().streak_days) ?
            Math.floor(psSnap.data().streak_days) :
            0;
      const prevStatus =
          psSnap.exists && typeof psSnap.data().streakStatus === "string" ?
            psSnap.data().streakStatus :
            "";
      const freezeAvail =
          psSnap.exists && typeof psSnap.data().streakFreezeAvailable === "number" ?
            Math.floor(psSnap.data().streakFreezeAvailable) :
            0;

      const streakResult = resolveStreak({
        lastTrainingUtc: lastTr,
        prevStreakDays: prevSt,
        streakStatus: prevStatus,
        freezeAvailable: freezeAvail,
        workoutLoggedToday: true,
        nowMs: Date.now(),
        enforcementEnabled: true,
      });
      const streakDays = streakResult.newStreakDays;

      const lv = trainingLevelFromTotalXp(newTotal);
      const xpInc = admin.firestore.FieldValue.increment(earned);
      const repsInc = admin.firestore.FieldValue.increment(repsTotal);

      const uData = uSnap.data() || {};
      const prevLong =
          typeof uData.longestStreak === "number" && !Number.isNaN(uData.longestStreak) ?
            Math.floor(uData.longestStreak) :
            0;

      // T1-10: denormalize clubId onto player_stats so the Firestore read rule can use
      // tokenClubMatchesDoc() (zero gets) instead of teamClubId() (1 get).
      const psClubId =
          typeof uData.clubId === "string" && uData.clubId.trim() ? uData.clubId.trim() : null;
      tx.set(
          psRef,
          {
            teamId: teamId || null,
            clubId: psClubId,
            playerName: playerName || null,
            total_xp: xpInc,
            total_reps: repsInc,
            current_level: lv.level,
            reps_this_week: repsWeek,
            minutes_this_week: minsWeek,
            xp_this_week: xpWeek,
            streak_days: streakDays,
            streakStatus: streakResult.newStreakStatus,
            stats_week_key: weekKey,
            last_training_utc: todayStr,
            updatedAt: now,
          },
          {merge: true},
      );

      const userUpdateFields = {
        xp: xpInc,
        totalXp: xpInc,
        trainingLevel: lv.level,
        currentStreak: streakDays,
        longestStreak: Math.max(prevLong, streakDays),
        'armory.lastActiveUtc': todayStr,
        updatedAt: now,
      };
      // Stamp Co-Op boost audit field if a parent-sponsored boost was applied.
      if (boostSponsorEmail && boostMultiplier > 1.0) {
        userUpdateFields['armory.lastBoostSponsor'] = boostSponsorEmail;
        userUpdateFields['armory.lastBoostMultiplier'] = boostMultiplier;
        userUpdateFields['armory.lastBoostAt'] = todayStr;
      }
      tx.update(uRef, userUpdateFields);

      // xpHistory entry with optional parent-boost annotation.
      const xpHistoryEntry = {
        date: todayStr,
        amount: earned,
        baseAmount: baseEarned,
        reason: boostSponsorEmail && boostMultiplier > 1.0 ? 'parent_boost' : 'workout',
        sponsoredByParentEmail: boostSponsorEmail || null,
        boostMultiplier: boostMultiplier > 1.0 ? boostMultiplier : null,
        runningTotal: newTotal,
        createdAt: now,
      };
      const xpHistRef = db.collection(`users/${playerEmail}/xpHistory`).doc();
      tx.set(xpHistRef, xpHistoryEntry);

      tx.update(repRef, {
        gamificationXpGranted: true,
        gamificationEarnedXp: earned,
        gamificationBaseXp: baseEarned,
        gamificationBoostMultiplier: boostMultiplier,
        gamificationGrantedAt: now,
      });
    });
  } catch (e) {
    logger.error("grantTrainingXpAfterRepCreated transaction failed", {repId, err: e});
    return;
  }

  // ── Post-transaction: evaluate active Co-Op bounties ──────────────────────
  // Runs outside the XP transaction so a bounty verification failure never
  // rolls back the XP grant.
  try {
    const psSnap = await db.collection("player_stats").doc(athleteUid).get();
    const psData = psSnap.exists ? psSnap.data() : {};
    await evaluateActiveBountiesForPlayer(db, playerEmail, {
      totalReps:    typeof psData.total_reps === "number" ? psData.total_reps : repsTotal,
      totalMinutes: typeof psData.totalMins === "number" ? psData.totalMins : duration,
      streakDays:   typeof psData.streak_days === "number" ? psData.streak_days : 0,
      triggerSource: `reps/${repId}`,
    });
  } catch (e) {
    logger.error("grantTrainingXpAfterRepCreated: bounty evaluation failed", {repId, err: e});
  }
}

/**
 * Level → Season 1 card IDs granted when a player first reaches that level.
 * Cards are granted via FieldValue.arrayUnion into users/{email}.ownedSeasonOneCards.
 * @type {Record<number, string[]>}
 */
const SEASON_ONE_LEVEL_REWARDS = {
  1:  ['card_001_base'],
  2:  ['card_002_base'],
  3:  ['card_004_base'],
  4:  ['card_008_base'],
  5:  ['card_009_base'],
  6:  ['card_013_base'],
  7:  ['card_016_base'],
  8:  ['card_017_base'],
  9:  ['card_003_base'],
  10: ['card_006_base'],
  11: ['card_010_base'],
  12: ['card_012_base'],
  13: ['card_018_base'],
  14: ['card_020_base'],
  15: ['card_001_holo'],
  16: ['card_005_base'],
  17: ['card_011_base'],
  18: ['card_014_base'],
  19: ['card_019_base'],
  20: ['card_007_base'],
  21: ['card_015_base'],
  22: ['card_021_base'],
  25: ['card_007_radiant'],
  30: ['card_015_alt_art'],
};

/**
 * Returns the Season 1 card IDs earned for every level crossed from
 * `prevLevel + 1` up to (and including) `newLevel`. Used in logTrainingSession
 * to populate users/{email}.ownedSeasonOneCards via FieldValue.arrayUnion.
 *
 * @param {number} prevLevel Level before XP was applied.
 * @param {number} newLevel  Level after XP was applied.
 * @return {string[]}
 */
function getSeasonOneCardRewardsForLevelRange(prevLevel, newLevel) {
  const cards = [];
  for (let lvl = prevLevel + 1; lvl <= newLevel; lvl++) {
    const reward = SEASON_ONE_LEVEL_REWARDS[lvl];
    if (reward) cards.push(...reward);
  }
  return cards;
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
  SEASON_ONE_LEVEL_REWARDS,
  getSeasonOneCardRewardsForLevelRange,
};
