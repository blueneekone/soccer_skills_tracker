'use strict';

/**
 * functions/src/utils/profileSyncer.js
 * ──────────────────────────────────────
 * Master aggregation engine for public player profiles.
 *
 * Reads from:  users/{email}, player_stats/{uid}, workout_logs, trials,
 *              trial_scores, player_metrics, teams, clubs
 * Writes to:   player_stats/{uid}  (performance arrays + trial scores),
 *              public_player_profiles/{uid}  (recruiter-visible index)
 *
 * Extracted verbatim from index.js (function syncPublicPlayerProfile).
 * NOTE: the original file has no 'use strict', so `verifiedVideoUrl` was
 * implicitly global. This module adds an explicit `let` declaration to
 * preserve the same runtime semantics under strict mode.
 */

const admin  = require('firebase-admin');
const logger = require('firebase-functions/logger');

const {
  normEmail,
  utcWeekMondayKeyFromDate,
  parseUtcYmd,
  sanitizePublicDisplayName,
  ageGroupLabel,
  computeAgeYears,
  topAttributesFromMetrics,
} = require('./formatters');

// Lazy accessor — defers Firestore init until handler invocation.
const db = () => admin.firestore();

/**
 * Aggregates XP history, verified trial scores, and recruiter-visible
 * metadata for a single player UID, then writes to:
 *   - player_stats/{uid}         (performance arrays)
 *   - public_player_profiles/{uid} (when recruitProfilePublic === true and age >= 16)
 *
 * If the player has opted out, is a minor, or has no stats doc, the public
 * profile document is deleted to keep the recruiter index clean.
 *
 * @param {string} uid  Firebase Auth UID
 * @return {Promise<void>}
 */
async function syncPublicPlayerProfile(uid) {
  if (!uid || typeof uid !== 'string') {
    return;
  }
  const pubRef = db().collection('public_player_profiles').doc(uid);

  let email = '';
  try {
    const au = await admin.auth().getUser(uid);
    email = normEmail(au.email);
  } catch (e) {
    logger.warn('syncPublicPlayerProfile: invalid uid', uid, e);
    return;
  }
  if (!email) {
    return;
  }

  const uRef = db().collection('users').doc(email);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    await pubRef.delete().catch(() => {});
    return;
  }
  const u = uSnap.data() || {};
  const role = typeof u.role === 'string' ? u.role : 'player';
  if (role !== 'player') {
    await pubRef.delete().catch(() => {});
    return;
  }

  // Phase 2, Epic 3 — COPPA 2.0 teen 13-16 gate.
  // Early-return + delete public doc if ageBand is teen13to16 or under13.
  // This is defense-in-depth against a race window: if a player turns 17
  // but re-sync hasn't stamped 'adult' yet, the ageBand field still says
  // 'teen13to16' and we suppress the public profile until the next DOB
  // update triggers a re-sync.  The Firestore rule (ageBandBlocksAdShare)
  // is the client-facing gate; this server-side guard prevents the doc
  // from existing at all.
  const ageBand = u.ageBand || 'adult';
  if (ageBand === 'teen13to16' || ageBand === 'under13') {
    await pubRef.delete().catch(() => {});
    logger.info('syncPublicPlayerProfile: suppressed teen public profile', {uid, ageBand});
    return;
  }

  const psSnap = await db().collection('player_stats').doc(uid).get();
  if (!psSnap.exists) {
    await pubRef.delete().catch(() => {});
    return;
  }
  const ps = psSnap.data() || {};

  const nowAgg = new Date();
  const sixMonthsAgo = new Date(nowAgg);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
  const fourteenDaysAgo = new Date(nowAgg);
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);

  const lgSnap = await db().collection('workout_logs').where('playerId', '==', uid).get();

  /** @type {Record<string, number>} */
  const monthXp = {};
  /** @type {Record<string, number>} */
  const dayXp = {};
  /** @type {Record<string, number>} */
  const weekXp = {};

  lgSnap.forEach((doc) => {
    const lg = doc.data() || {};
    const ts = lg.timestamp;
    const t =
        ts instanceof admin.firestore.Timestamp ?
          ts.toDate() :
          null;
    if (!t) return;
    const earned = Math.floor(Number(lg.earnedXP) || Number(lg.earnedXp) || Number(lg.earned) || 0);
    if (earned <= 0) return;

    if (t >= sixMonthsAgo) {
      const mk =
          `${t.getUTCFullYear()}-` +
          `${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
      monthXp[mk] = (monthXp[mk] || 0) + earned;
    }
    if (t >= fourteenDaysAgo) {
      const dk = t.toISOString().slice(0, 10);
      dayXp[dk] = (dayXp[dk] || 0) + earned;
    }
    const wk = utcWeekMondayKeyFromDate(t);
    weekXp[wk] = (weekXp[wk] || 0) + earned;
  });

  /** @type {Array<{ month: string, xp: number }>} */
  const monthlyXp = Object.keys(monthXp)
      .sort()
      .map((month) => ({month, xp: monthXp[month]}));

  /** @type {Array<{ day: string, xp: number }>} */
  const dailyPerformance = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(
        Date.UTC(nowAgg.getUTCFullYear(), nowAgg.getUTCMonth(), nowAgg.getUTCDate() - i),
    );
    const key = d.toISOString().slice(0, 10);
    dailyPerformance.push({day: key, xp: dayXp[key] || 0});
  }

  const anchorMondayStr = utcWeekMondayKeyFromDate(nowAgg);
  const anchorMonday = parseUtcYmd(anchorMondayStr);
  /** @type {Array<{ week: string, xp: number }>} */
  const weeklyPerformance = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(anchorMonday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const key = d.toISOString().slice(0, 10);
    weeklyPerformance.push({week: key, xp: weekXp[key] || 0});
  }

  const playerNameForTrials =
      typeof ps.playerName === 'string' && ps.playerName.trim() ?
        ps.playerName.trim() :
        (typeof u.playerName === 'string' ? u.playerName.trim() : '');
  const teamIdForTrials =
      typeof u.teamId === 'string' && u.teamId.trim() && u.teamId !== 'admin' ?
        u.teamId.trim() :
        '';

  /** @type {Record<string, string>} */
  const verifiedTrialScores = {};
  if (teamIdForTrials) {
    // Prefer stable identity keys (added in Tier-2 Item 2 fix); fall back to
    // the legacy mutable name-string so pre-fix historical docs still sync.
    let trialSnap = await db().collection('trials')
        .where('teamId', '==', teamIdForTrials)
        .where('playerId', '==', uid)
        .limit(80)
        .get();

    if (trialSnap.empty && email) {
      trialSnap = await db().collection('trials')
          .where('teamId', '==', teamIdForTrials)
          .where('playerEmail', '==', email)
          .limit(80)
          .get();
    }

    if (trialSnap.empty && playerNameForTrials) {
      trialSnap = await db().collection('trials')
          .where('teamId', '==', teamIdForTrials)
          .where('player', '==', playerNameForTrials)
          .limit(80)
          .get();
    }

    if (trialSnap.empty && playerNameForTrials) {
      trialSnap = await db().collection('trials')
          .where('teamId', '==', teamIdForTrials)
          .where('playerName', '==', playerNameForTrials)
          .limit(80)
          .get();
    }

    trialSnap.forEach((d) => {
      const tr = d.data() || {};
      if (tr.isCoach !== true) return;
      const skill =
          typeof tr.skill === 'string' && tr.skill.trim() ?
            tr.skill.trim() :
            '';
      const res =
          typeof tr.result === 'string' ? tr.result.trim() : '';
      if (!skill || !res) return;
      verifiedTrialScores[skill] = res;
    });
  }

  await db().collection('player_stats').doc(uid).set(
      {
        monthly_performance: monthlyXp,
        daily_performance: dailyPerformance,
        weekly_performance: weeklyPerformance,
        verified_trial_scores: verifiedTrialScores,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );

  if (u.recruitProfilePublic !== true) {
    await pubRef.delete().catch(() => {});
    return;
  }

  const dob = u.dateOfBirth;
  const dobBad =
      u.isMinor === true ||
      !dob ||
      !(dob instanceof admin.firestore.Timestamp);
  if (dobBad) {
    await pubRef.delete().catch(() => {});
    return;
  }
  const age = computeAgeYears(dob);
  if (age < 16) {
    await pubRef.delete().catch(() => {});
    return;
  }
  const totalXp =
      typeof ps.total_xp === 'number' && !Number.isNaN(ps.total_xp) ?
        Math.floor(ps.total_xp) :
        0;
  const currentLevel =
      typeof ps.current_level === 'number' && !Number.isNaN(ps.current_level) ?
        Math.floor(ps.current_level) :
        1;

  const playerName =
      typeof ps.playerName === 'string' && ps.playerName.trim() ?
        ps.playerName.trim() :
        (typeof u.playerName === 'string' ? u.playerName.trim() : 'Athlete');
  const displayName = sanitizePublicDisplayName(
      playerName,
      u.isMinor === true,
  );
  const ageGroup = ageGroupLabel(age);
  const position =
      typeof u.primaryPosition === 'string' && u.primaryPosition.trim() ?
        u.primaryPosition.trim().slice(0, 64) :
        'Unlisted';

  /** @type {string[]} */
  let topAttributes = [];
  const metricsSnap = await db().collection('player_metrics').doc(email)
      .collection('seasons')
      .get();
  /**
   * @type {{
   *   physical?: object,
   *   technical?: object,
   *   ua?: admin.firestore.Timestamp
   * } | null}
   */
  let best = null;
  metricsSnap.forEach((d) => {
    const x = d.data() || {};
    const vb = x.verifiedBy;
    if (typeof vb !== 'string' || !vb.length) return;
    const ua = x.updatedAt;
    if (!(ua instanceof admin.firestore.Timestamp)) return;
    if (!best || ua.toMillis() > best.ua.toMillis()) {
      best = {
        physical: x.physical,
        technical: x.technical,
        ua,
      };
    }
  });
  if (best) {
    topAttributes = topAttributesFromMetrics(
        /** @type {Record<string, unknown>} */ (best.physical || {}),
        /** @type {Record<string, unknown>} */ (best.technical || {}),
    );
  }

  const teamId =
      typeof u.teamId === 'string' && u.teamId.trim() && u.teamId !== 'admin' ?
        u.teamId.trim() :
        '';
  /** @type {string} */
  let resolvedClubId = '';
  // Explicit declaration fixes the implicit global in the original index.js.
  let verifiedVideoUrl = null;
  let verifiedVideoScoreId = null;
  try {
    const vSnap = await db().collection('trial_scores')
        .where('playerId', '==', uid)
        .where('status', '==', 'verified')
        .orderBy('verifiedAt', 'desc')
        .limit(1)
        .get();
    if (!vSnap.empty) {
      const vd = vSnap.docs[0].data() || {};
      const vu =
          typeof vd.videoUrl === 'string' && vd.videoUrl.trim() ?
            vd.videoUrl.trim() :
            '';
      if (vu) {
        verifiedVideoUrl = vu;
        verifiedVideoScoreId = vSnap.docs[0].id;
      }
    }
  } catch (e) {
    logger.warn('syncPublicPlayerProfile trial_scores video', e);
  }

  let brandLogoUrl = null;
  let clubNameShort = null;
  if (teamId) {
    const teamSnap = await db().collection('teams').doc(teamId).get();
    const tData = teamSnap.exists ? teamSnap.data() : null;
    const tidClub =
        tData &&
        typeof tData.clubId === 'string' &&
        tData.clubId.trim() ?
          tData.clubId.trim() :
          '';
    const userClub =
        typeof u.clubId === 'string' && u.clubId.trim() ? u.clubId.trim() : '';
    const clubId = tidClub || userClub;
    if (clubId) {
      resolvedClubId = clubId;
      const clubSnap = await db().collection('clubs').doc(clubId).get();
      if (clubSnap.exists) {
        const c = clubSnap.data() || {};
        const logo =
            typeof c.brandLogoUrl === 'string' ? c.brandLogoUrl.trim() : '';
        if (logo) brandLogoUrl = logo;
        const cn =
            typeof c.name === 'string' && c.name.trim() ?
              c.name.trim().slice(0, 80) :
              '';
        if (cn) clubNameShort = cn;
      }
    }
  } else {
    const userClub =
        typeof u.clubId === 'string' && u.clubId.trim() ? u.clubId.trim() : '';
    if (userClub) {
      resolvedClubId = userClub;
    }
  }

  const tier = typeof ps.tier === 'string' ? ps.tier : (typeof u.tier === 'string' ? u.tier : 'ROOKIE');
  const gpa = typeof u.gpa === 'number' ? u.gpa : null;
  const stats = ps.stats || u.stats || {};
  const vanRating = parseInt(stats.VAN || '0', 10) || 0;

  await pubRef.set(
      {
        displayName,
        ageGroup,
        position,
        tier,
        gpa,
        vanRating,
        stats,
        clubId: resolvedClubId || null,
        current_level: currentLevel,
        total_xp: totalXp,
        top_attributes: topAttributes,
        verified_trial_scores: verifiedTrialScores,
        monthly_performance: monthlyXp,
        verified_video_url: verifiedVideoUrl || null,
        verified_video_score_id: verifiedVideoScoreId || null,
        brandLogoUrl: brandLogoUrl || null,
        clubDisplayName: clubNameShort || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );
}

module.exports = {syncPublicPlayerProfile};
