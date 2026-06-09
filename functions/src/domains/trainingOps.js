'use strict';

// ── Deconstruction Sprint 4: Training & Gamification Domain ──────────────────
// Extracted from functions/index.js. Contains all logic for:
//   • Workout rep submission (submitWorkoutRep)
//   • Training session logging + XP (logTrainingSession)
//   • Match-day telemetry commits (commitMatchTelemetry)
//   • Homework assignment lifecycle (secureAssignHomework/Delete/Complete)
//   • Team accountability triggers (onRepCreatedUpdateTeamStats)
//   • Gamification XP trigger (onRepCreatedApplyGamificationXp)
//   • Public leaderboard + recruit profile reads
//   • Daily activity XP (logPlayerActivity)
//   • AI tactical analysis (analyzeTacticWithAI)
//   • Epic 8: Intent deploy/cancel/extend + lifecycle triggers + expiry scheduler
// ─────────────────────────────────────────────────────────────────────────────

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onDocumentCreated, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {defineSecret} = require('firebase-functions/params');
const {GoogleGenAI} = require('@google/genai');

const {
  calculateTrainingSessionEarnedXp,
  trainingLevelFromTotalXp,
  computeMatchTelemetryParlayXp,
  grantTrainingXpAfterRepCreated,
} = require('../../gamificationWorkoutXp');

const {
  assertCanSecureAddPlayer,
  assertClubSubscriptionWritable,
  assertParent,
  assertCoachMessageSender,
  assertActorCanAccessTeam,
  assertPlayer,
} = require('../middleware/authBouncers');

const {
  normEmail,
  workoutAttestationHmac,
  leaderboardPublicPlayerKey,
  isLeaderboardPlayerRow,
  computeAgeYears,
  utcYmdAddDays,
  lastActivityToUtcYmd,
  utcWeekMondayKey,
} = require('../utils/formatters');
const {ALPHA_CALLABLE_OPTS} = require('../utils/alphaRunOptions');
const {resolvePublicOperativeAvatarV2} = require('../utils/portraitV1Upgrade');

const REGION = 'us-east1';

/** Launch-critical callables — extra memory + public invoker for browser SDK + CORS preflight. */
const LAUNCH_CORE_CALLABLE_OPTS = {
  region: REGION,
  memory: '512MiB',
  invoker: 'public',
};

const WORKOUT_ATTESTATION_HMAC_SECRET = defineSecret(
    'WORKOUT_ATTESTATION_HMAC_SECRET',
);
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

/** Lazy Firestore accessor — defers init until first invocation. */
const db = () => admin.firestore();

// ── Private helpers ───────────────────────────────────────────────────────────

/** @param {unknown} raw @return {Array<{name:string,sets:number,reps:number}>} */
function parseDrillsPayload(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new HttpsError(
        'invalid-argument',
        'Add at least one drill to the session.',
    );
  }
  if (raw.length > 80) {
    throw new HttpsError('invalid-argument', 'Too many drills in one session.');
  }
  return raw.map((d) => {
    if (!d || typeof d !== 'object') {
      throw new HttpsError('invalid-argument', 'Invalid drill row.');
    }
    const name = typeof d.name === 'string' ? d.name.trim() : '';
    if (!name || name.length > 220) {
      throw new HttpsError(
          'invalid-argument',
          'Each drill needs a valid name.',
      );
    }
    let sets = Number(d.sets);
    let reps = Number(d.reps);
    if (!Number.isFinite(sets) || sets < 1) sets = 1;
    if (!Number.isFinite(reps) || reps < 1) reps = 1;
    sets = Math.min(Math.floor(sets), 999);
    reps = Math.min(Math.floor(reps), 99999);
    return {name, sets, reps};
  });
}

/** XP granted per calendar day (UTC) when `logPlayerActivity` awards. */
const DAILY_ACTIVITY_XP = 50;

/** Max JSON chars sent to Gemini (prompt budget guard). */
const TACTIC_CANVAS_JSON_MAX_CHARS = 120000;

// ── Exports ───────────────────────────────────────────────────────────────────

/**
 * Coach / director: batch FieldValue increments for match-day telemetry.
 * Server-side only (client cannot write player_stats or foreign users/*).
 * Updates player_stats/{playerKey} and mirrors into users/{emailKey}.stats.
 */
exports.commitMatchTelemetry = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const teamId =
      typeof data.teamId === 'string' ? data.teamId.trim().slice(0, 200) : '';
  const rows = Array.isArray(data.rows) ? data.rows : [];
  if (!teamId) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }
  if (rows.length === 0) {
    throw new HttpsError('invalid-argument', 'No stat rows to commit.');
  }
  if (rows.length > 50) {
    throw new HttpsError(
        'invalid-argument',
        'Too many players in one commit (max 50).',
    );
  }

  await assertCanSecureAddPlayer(request, teamId);

  /**
   * @param {unknown} v
   * @param {number} max
   * @return {number}
   */
  const clamp = (v, max) => {
    const n = parseInt(String(v), 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, max);
  };

  const inc = admin.firestore.FieldValue.increment;
  const now = admin.firestore.FieldValue.serverTimestamp();

  const [rosterSnap, usersSnap] = await Promise.all([
    db().collection('rosters').doc(teamId).get(),
    db().collection('users').where('teamId', '==', teamId).get(),
  ]);
  const rosterNames = rosterSnap.exists && Array.isArray(rosterSnap.data().players) ?
    rosterSnap.data().players :
    [];
  const rosterSet = new Set(
      rosterNames
          .map((n) => (typeof n === 'string' ? n.trim() : String(n)))
          .filter(Boolean),
  );
  const nameToUid = {};
  usersSnap.forEach((d) => {
    const dd = d.data() || {};
    const pn =
        typeof dd.playerName === 'string' ? dd.playerName.trim() : '';
    if (pn) nameToUid[pn] = d.id;
  });

  /** @type {Map<string, { g: number, a: number, sh: number, sv: number }>} */
  const ag = new Map();
  for (const row of rows) {
    const playerKey =
        typeof row.playerKey === 'string' ? row.playerKey.trim() : '';
    if (!playerKey) continue;
    const goals = clamp(row.goals, 30);
    const assists = clamp(row.assists, 30);
    const shots = clamp(row.shots, 100);
    const saves = clamp(row.saves, 100);
    if (goals + assists + shots + saves === 0) continue;
    const prev = ag.get(playerKey) || {g: 0, a: 0, sh: 0, sv: 0};
    ag.set(playerKey, {
      g: prev.g + goals,
      a: prev.a + assists,
      sh: prev.sh + shots,
      sv: prev.sv + saves,
    });
  }
  if (ag.size === 0) {
    throw new HttpsError('invalid-argument', 'All stat deltas are zero or invalid.');
  }

  const psKeys = Array.from(ag.keys());
  /** @type {FirebaseFirestore.DocumentReference[]} */
  const psRefs = [];
  for (const k of psKeys) {
    let pid = nameToUid[k] || k;
    if (typeof pid === 'string' && pid.includes('@')) {
      try {
        pid = (await admin.auth().getUserByEmail(normEmail(pid))).uid;
      } catch (_e) {
        /* leave pid — may be roster-only key */
      }
    }
    psRefs.push(db().collection('player_stats').doc(pid));
  }
  const psSnaps = await Promise.all(psRefs.map((r) => r.get()));

  for (let i = 0; i < psKeys.length; i++) {
    const k = psKeys[i];
    const psSnap = psSnaps[i];
    if (psSnap.exists) {
      const tid = psSnap.data().teamId;
      if (tid !== teamId) {
        throw new HttpsError(
            'permission-denied',
            'A player is not on this team.',
        );
      }
    } else {
      if (!rosterSet.has(k)) {
        throw new HttpsError(
            'failed-precondition',
            `Not on active roster: ${k}`,
        );
      }
    }
  }

  const userMirrorOps = [];
  for (let i = 0; i < psKeys.length; i++) {
    const playerKey = psKeys[i];
    const psSnap = psSnaps[i];
    const displayName =
        psSnap.exists &&
        typeof psSnap.data().playerName === 'string' &&
        psSnap.data().playerName.trim() ?
          psSnap.data().playerName.trim() :
          playerKey;
    const em = nameToUid[displayName] || nameToUid[playerKey] || null;
    const d = ag.get(playerKey) || {g: 0, a: 0, sh: 0, sv: 0};
    if (em) {
      userMirrorOps.push({em, d});
    }
  }
  const uRefs = userMirrorOps.map((o) => db().collection('users').doc(o.em));
  const uSnaps = uRefs.length ? await Promise.all(uRefs.map((r) => r.get())) : [];

  const batch = db().batch();
  let writes = 0;
  for (let i = 0; i < psKeys.length; i++) {
    const playerKey = psKeys[i];
    const d = ag.get(playerKey) || {g: 0, a: 0, sh: 0, sv: 0};
    const psRef = psRefs[i];
    const psSnap = psSnaps[i];
    const displayName =
        psSnap.exists &&
        typeof psSnap.data().playerName === 'string' &&
        psSnap.data().playerName.trim() ?
          psSnap.data().playerName.trim() :
          playerKey;

    const matchXp = computeMatchTelemetryParlayXp(d);
    const prevPsXp =
        psSnap.exists &&
        typeof psSnap.data().total_xp === 'number' &&
        !Number.isNaN(psSnap.data().total_xp) ?
          Math.floor(psSnap.data().total_xp) :
          0;
    const nextPsLevel = trainingLevelFromTotalXp(prevPsXp + matchXp).level;

    batch.set(
        psRef,
        {
          teamId,
          playerName: displayName,
          goals: inc(d.g),
          assists: inc(d.a),
          shots: inc(d.sh),
          saves: inc(d.sv),
          total_xp: inc(matchXp),
          current_level: nextPsLevel,
          updatedAt: now,
        },
        {merge: true},
    );
    writes++;
  }
  for (let i = 0; i < userMirrorOps.length; i++) {
    if (!uSnaps[i] || !uSnaps[i].exists) {
      continue;
    }
    const {em, d} = userMirrorOps[i];
    const matchXpU = computeMatchTelemetryParlayXp(d);
    const ud = uSnaps[i].data() || {};
    const rawUx =
        typeof ud.totalXp === 'number' && !Number.isNaN(ud.totalXp) ?
          ud.totalXp :
          typeof ud.xp === 'number' && !Number.isNaN(ud.xp) ?
            ud.xp :
            0;
    const prevUx = Math.max(0, Math.floor(Number(rawUx) || 0));
    const nextUserLevel = trainingLevelFromTotalXp(prevUx + matchXpU).level;

    batch.set(
        db().collection('users').doc(em),
        {
          'stats.goals': inc(d.g),
          'stats.assists': inc(d.a),
          'stats.shots': inc(d.sh),
          'stats.saves': inc(d.sv),
          totalXp: inc(matchXpU),
          xp: inc(matchXpU),
          trainingLevel: nextUserLevel,
          updatedAt: now,
        },
        {merge: true},
    );
    writes++;
  }

  if (writes > 500) {
    throw new HttpsError('failed-precondition', 'Batch too large; try fewer players.');
  }
  await batch.commit();
  return {ok: true, players: ag.size, writes};
});

/**
 * Epic 1: Server-side workout log + HMAC integrity digest (tamper-evident).
 * - Parent: must be linked household; writes verifiedByUid / verifiedByEmail.
 * - Player: self-log only; verificationMethod player_self_log.
 * Client direct writes to `reps` are disabled in Firestore rules.
 */
exports.submitWorkoutRep = onCall(
    {
      region: REGION,
      secrets: [WORKOUT_ATTESTATION_HMAC_SECRET],
    },
    async (request) => {
      if (!request.auth || !request.auth.uid) {
        throw new HttpsError('unauthenticated', 'Sign in required.');
      }
      const secret = WORKOUT_ATTESTATION_HMAC_SECRET.value();
      if (!secret || typeof secret !== 'string' || secret.length < 16) {
        logger.error('WORKOUT_ATTESTATION_HMAC_SECRET missing or too short.');
        throw new HttpsError(
            'failed-precondition',
            'Server configuration error. Ask an admin to set the ' +
                'attestation secret.',
        );
      }

      const data = request.data || {};
      const role = request.auth.token.role || 'player';
      const mins = parseInt(String(data.minutes), 10);
      if (!Number.isFinite(mins) || mins <= 0 || mins > 1440) {
        throw new HttpsError(
            'invalid-argument',
            'minutes must be between 1 and 1440.',
        );
      }
      const outcomeRaw =
          typeof data.outcome === 'string' ? data.outcome.trim() : '';
      if (!outcomeRaw || outcomeRaw.length > 80) {
        throw new HttpsError('invalid-argument', 'outcome is required.');
      }
      const drills = parseDrillsPayload(data.drills);
      const drillSummary = drills.map((x) => x.name).join(', ');

      /** @type {string} */
      let playerEmail;
      /** @type {string|null} */
      let verifiedByUid = null;
      /** @type {string|null} */
      let verifiedByEmail = null;
      /** @type {string|null} */
      let verifiedByLegalName = null;
      /** @type {string} */
      let verificationMethod;

      if (role === 'parent') {
        const actor = assertParent(request);
        playerEmail = normEmail(data.playerEmail);
        if (!playerEmail) {
          throw new HttpsError(
              'invalid-argument',
              'playerEmail (athlete account) is required.',
          );
        }
        const hRef = db().collection('households').doc(actor.householdId);
        const hSnap = await hRef.get();
        if (!hSnap.exists) {
          throw new HttpsError('failed-precondition', 'Household not found.');
        }
        const h = hSnap.data();
        const playerSet = new Set(
            (h.playerEmails || [])
                .map((e) => normEmail(String(e)))
                .filter(Boolean),
        );
        if (!playerSet.has(playerEmail)) {
          throw new HttpsError(
              'permission-denied',
              'That athlete is not linked to your household.',
          );
        }
        const legal =
            typeof data.verifierLegalName === 'string' ?
              data.verifierLegalName.trim().replace(/\s+/g, ' ') :
              '';
        const parts = legal.split(/\s+/).filter(Boolean);
        if (parts.length < 2 || legal.length < 4) {
          throw new HttpsError(
              'invalid-argument',
              'Enter your full legal name (first and last).',
          );
        }
        verifiedByUid = request.auth.uid;
        verifiedByEmail = actor.email;
        verifiedByLegalName = legal;
        verificationMethod = 'parent_auth_callable';
      } else if (role === 'player') {
        playerEmail = normEmail(request.auth.token.email);
        if (!playerEmail) {
          throw new HttpsError('failed-precondition', 'Missing auth email.');
        }
        verificationMethod = 'player_self_log';
      } else {
        throw new HttpsError(
            'permission-denied',
            'Only player or parent accounts may log workouts here.',
        );
      }

      const uRef = db().collection('users').doc(playerEmail);
      const uSnap = await uRef.get();
      if (!uSnap.exists) {
        throw new HttpsError(
            'failed-precondition',
            'Athlete profile not found. Complete setup first.',
        );
      }
      const u = uSnap.data();
      const teamId = u.teamId || null;
      const playerName = u.playerName || null;
      if (!teamId || teamId === 'admin' || !playerName) {
        throw new HttpsError(
            'failed-precondition',
            'Athlete profile is missing team or display name.',
        );
      }

      let athleteUid = '';
      try {
        const au = await admin.auth().getUserByEmail(playerEmail);
        athleteUid = au.uid;
      } catch (e) {
        logger.error('submitWorkoutRep: getUserByEmail failed', e);
        throw new HttpsError(
            'failed-precondition',
            'Could not resolve athlete account.',
        );
      }

      const repRef = db().collection('reps').doc();
      const repId = repRef.id;
      const tsSeconds = Math.floor(Date.now() / 1000);
      const attestationPayload = {
        v: 1,
        repId,
        teamId,
        player: playerName,
        minutes: mins,
        outcome: outcomeRaw,
        drillSummary,
        ts: tsSeconds,
        verificationMethod,
      };
      const attestationDigest =
          workoutAttestationHmac(secret, attestationPayload);
      const now = admin.firestore.FieldValue.serverTimestamp();

      const repDoc = {
        timestamp: now,
        teamId,
        player: playerName,
        playerEmail,
        minutes: mins,
        drills,
        drillSummary,
        outcome: outcomeRaw,
        verificationMethod,
        attestationAlg: 'HMAC-SHA256-v1',
        attestationDigest,
        attestationPayload: attestationPayload,
        submittedByUid: request.auth.uid,
        submittedAt: now,
      };
      if (verifiedByUid) {
        repDoc.verifiedByUid = verifiedByUid;
        repDoc.verifiedByEmail = verifiedByEmail;
        repDoc.verifiedByLegalName = verifiedByLegalName;
        repDoc.verifiedAt = now;
      }

      const statsRef = db().collection('player_stats').doc(athleteUid);
      const batch = db().batch();
      batch.set(repRef, repDoc);
      batch.set(
          statsRef,
          {
            teamId,
            totalMins: admin.firestore.FieldValue.increment(mins),
            totalWorkouts: admin.firestore.FieldValue.increment(1),
            lastActive: now,
          },
          {merge: true},
      );
      batch.set(db().collection('security_audit').doc(), {
        action: 'submitWorkoutRep',
        repId,
        teamId,
        playerEmail,
        playerName,
        verificationMethod,
        actorUid: request.auth.uid,
        at: now,
      });

      await batch.commit();

      return {ok: true, repId, verificationMethod};
    },
);

/**
 * Epic 2/3: server-side XP, workout_logs, player_stats/{uid}, team_stats.
 */
exports.logTrainingSession = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const role = request.auth.token.role || 'player';

  const duration = parseInt(String(data.duration), 10);
  const reps = parseInt(String(data.reps), 10);
  if (!Number.isFinite(duration) || duration < 1 || duration > 1440) {
    throw new HttpsError(
        'invalid-argument',
        'duration must be 1-1440 minutes.',
    );
  }
  if (!Number.isFinite(reps) || reps < 0 || reps > 100000) {
    throw new HttpsError(
        'invalid-argument',
        'reps must be 0-100000.',
    );
  }

  const drillType =
      typeof data.drillType === 'string' ?
        data.drillType.trim().slice(0, 200) :
        '';
  if (!drillType) {
    throw new HttpsError('invalid-argument', 'drillType is required.');
  }

  const intensityRaw =
      typeof data.intensity === 'string' ?
        data.intensity.trim().toLowerCase() :
        '';
  if (!['low', 'medium', 'high'].includes(intensityRaw)) {
    throw new HttpsError(
        'invalid-argument',
        'intensity must be low, medium, or high.',
    );
  }

  const assignmentIdRaw =
      typeof data.assignmentId === 'string' ?
        data.assignmentId.trim() :
        '';

  /** @type {string} */
  let playerEmail;
  /** @type {string|null} */
  let verifiedByUid = null;
  /** @type {string|null} */
  let verifiedByEmail = null;
  /** @type {string|null} */
  let verifiedByLegalName = null;
  /** @type {string} */
  let verificationMethod;

  if (role === 'parent') {
    const actor = assertParent(request);
    playerEmail = normEmail(data.playerEmail);
    if (!playerEmail) {
      throw new HttpsError(
          'invalid-argument',
          'playerEmail (athlete account) is required.',
      );
    }
    const hRef = db().collection('households').doc(actor.householdId);
    const hSnap = await hRef.get();
    if (!hSnap.exists) {
      throw new HttpsError('failed-precondition', 'Household not found.');
    }
    const h = hSnap.data();
    const playerSet = new Set(
        (h.playerEmails || [])
            .map((e) => normEmail(String(e)))
            .filter(Boolean),
    );
    if (!playerSet.has(playerEmail)) {
      throw new HttpsError(
          'permission-denied',
          'That athlete is not linked to your household.',
      );
    }
    const legal =
        typeof data.verifierLegalName === 'string' ?
          data.verifierLegalName.trim().replace(/\s+/g, ' ') :
          '';
    const parts = legal.split(/\s+/).filter(Boolean);
    if (parts.length < 2 || legal.length < 4) {
      throw new HttpsError(
          'invalid-argument',
          'Enter your full legal name (first and last).',
      );
    }
    verifiedByUid = request.auth.uid;
    verifiedByEmail = actor.email;
    verifiedByLegalName = legal;
    verificationMethod = 'parent_auth_callable';
  } else if (role === 'player') {
    playerEmail = normEmail(request.auth.token.email);
    if (!playerEmail) {
      throw new HttpsError('failed-precondition', 'Missing auth email.');
    }
    verificationMethod = 'player_self_log';
  } else {
    throw new HttpsError(
        'permission-denied',
        'Only player or parent accounts may log training.',
    );
  }

  const uRef = db().collection('users').doc(playerEmail);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError(
        'failed-precondition',
        'Athlete profile not found. Complete setup first.',
    );
  }
  const u = uSnap.data();
  const teamId = u.teamId || null;
  const playerName = u.playerName || null;
  if (!teamId || teamId === 'admin' || !playerName) {
    throw new HttpsError(
        'failed-precondition',
        'Athlete profile is missing team or display name.',
    );
  }

  let athleteUid = '';
  try {
    const au = await admin.auth().getUserByEmail(playerEmail);
    athleteUid = au.uid;
  } catch (e) {
    logger.error('logTrainingSession: getUserByEmail failed', e);
    throw new HttpsError(
        'failed-precondition',
        'Could not resolve athlete account.',
    );
  }

  const earned = calculateTrainingSessionEarnedXp({
    duration,
    reps,
    intensity: intensityRaw,
  });
  if (earned < 1) {
    throw new HttpsError(
        'invalid-argument',
        'Earned XP would be zero; increase duration or reps.',
    );
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = utcYmdAddDays(todayStr, -1);
  const weekKey = utcWeekMondayKey();

  const logRef = db().collection('workout_logs').doc();
  const logId = logRef.id;
  const psRef = db().collection('player_stats').doc(athleteUid);
  const tsRef = db().collection('team_stats').doc(teamId);
  const teamRef = db().collection('teams').doc(teamId);

  /**
   * @type {{
   *   earnedXP: number,
   *   totalXp: number,
   *   level: number,
   *   streak: number
   * }}
   */
  const out = {
    earnedXP: earned,
    totalXp: 0,
    level: 1,
    streak: 1,
  };

  await db().runTransaction(async (tx) => {
    const [psSnap, tsSnap, teamSnap, uSnapTx] = await Promise.all([
      tx.get(psRef),
      tx.get(tsRef),
      tx.get(teamRef),
      tx.get(uRef),
    ]);
    if (!uSnapTx.exists) {
      throw new HttpsError(
          'failed-precondition',
          'Athlete profile not found.',
      );
    }

    const prevTotal =
        psSnap.exists &&
        typeof psSnap.data().total_xp === 'number' &&
        !Number.isNaN(psSnap.data().total_xp) ?
          Math.floor(psSnap.data().total_xp) :
          0;
    const newTotal = prevTotal + earned;

    const prevWeek =
        psSnap.exists && typeof psSnap.data().stats_week_key === 'string' ?
          psSnap.data().stats_week_key :
          '';
    let repsWeek = 0;
    let minsWeek = 0;
    let xpWeek = 0;
    if (prevWeek === weekKey && psSnap.exists) {
      const d = psSnap.data();
      const rw = d.reps_this_week;
      repsWeek =
          typeof rw === 'number' && !Number.isNaN(rw) ?
            rw :
            0;
      minsWeek =
          typeof d.minutes_this_week === 'number' &&
          !Number.isNaN(d.minutes_this_week) ?
            d.minutes_this_week :
            0;
      const xw = d.xp_this_week;
      xpWeek =
          typeof xw === 'number' && !Number.isNaN(xw) ?
            Math.floor(xw) :
            0;
    }
    repsWeek += reps;
    minsWeek += duration;
    xpWeek += earned;

    const lastTr =
        psSnap.exists && typeof psSnap.data().last_training_utc === 'string' ?
          psSnap.data().last_training_utc :
          '';
    let streakDays = 1;
    if (psSnap.exists) {
      const sd = psSnap.data();
      const prevSt =
          typeof sd.streak_days === 'number' && !Number.isNaN(sd.streak_days) ?
            Math.floor(sd.streak_days) :
            0;
      if (lastTr === todayStr) {
        streakDays = Math.max(1, prevSt);
      } else if (lastTr === yesterdayStr) {
        streakDays = Math.max(1, prevSt + 1);
      } else {
        streakDays = 1;
      }
    }

    const lv = trainingLevelFromTotalXp(newTotal);

    // Subjective physiological fields (Phase 3, Epic 4 — RL pipeline).
    // All optional; missing values stored as null for backward compatibility.
    const subjectiveRpe =
        Number.isFinite(Number(data.subjectiveRpe)) &&
        Number(data.subjectiveRpe) >= 1 &&
        Number(data.subjectiveRpe) <= 10 ?
          Math.round(Number(data.subjectiveRpe)) :
          null;
    const soreness =
        Number.isFinite(Number(data.soreness)) &&
        Number(data.soreness) >= 1 &&
        Number(data.soreness) <= 5 ?
          Math.round(Number(data.soreness)) :
          null;
    const mood =
        Number.isFinite(Number(data.mood)) &&
        Number(data.mood) >= 1 &&
        Number(data.mood) <= 5 ?
          Math.round(Number(data.mood)) :
          null;
    const sleepHoursLastNight =
        Number.isFinite(Number(data.sleepHoursLastNight)) &&
        Number(data.sleepHoursLastNight) >= 0 &&
        Number(data.sleepHoursLastNight) <= 12 ?
          Number(data.sleepHoursLastNight) :
          null;

    const logDoc = {
      drillType,
      duration,
      reps,
      intensity: intensityRaw,
      earnedXP: earned,
      teamId,
      playerName,
      playerEmail,
      playerId: athleteUid,
      verificationMethod,
      submittedByUid: request.auth.uid,
      timestamp: now,
      subjectiveRpe,
      soreness,
      mood,
      sleepHoursLastNight,
    };
    if (verifiedByUid) {
      logDoc.verifiedByUid = verifiedByUid;
      logDoc.verifiedByEmail = verifiedByEmail;
      logDoc.verifiedByLegalName = verifiedByLegalName;
      logDoc.verifiedAt = now;
    }

    tx.set(logRef, logDoc);

    tx.set(
        psRef,
        {
          teamId,
          playerName,
          total_xp: admin.firestore.FieldValue.increment(earned),
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

    const uTxData = uSnapTx.data() || {};
    const prevLong =
        typeof uTxData.longestStreak === 'number' && !Number.isNaN(uTxData.longestStreak) ?
          Math.floor(uTxData.longestStreak) :
          0;
    const xpInc = admin.firestore.FieldValue.increment(earned);
    tx.update(uRef, {
      xp: xpInc,
      totalXp: xpInc,
      trainingLevel: lv.level,
      currentStreak: streakDays,
      longestStreak: Math.max(prevLong, streakDays),
      updatedAt: now,
    });

    const clubId =
        teamSnap.exists &&
        typeof teamSnap.data().clubId === 'string' &&
        teamSnap.data().clubId.trim() ?
          teamSnap.data().clubId.trim() :
          null;

    const nowDate = new Date();
    const monthKey =
        `${nowDate.getUTCFullYear()}-` +
        `${String(nowDate.getUTCMonth() + 1).padStart(2, '0')}`;

    let totalSessions = 1;
    if (tsSnap.exists) {
      const sd = tsSnap.data() || {};
      const prevKey = sd.stats_month_key;
      if (prevKey === monthKey) {
        const prev =
            typeof sd.total_sessions_this_month === 'number' &&
            !Number.isNaN(sd.total_sessions_this_month) ?
              sd.total_sessions_this_month :
              0;
        totalSessions = prev + 1;
      }
    }

    tx.set(
        tsRef,
        {
          teamId,
          clubId: clubId || null,
          last_activity_timestamp: now,
          total_sessions_this_month: totalSessions,
          stats_month_key: monthKey,
          updatedAt: now,
        },
        {merge: true},
    );

    out.totalXp = newTotal;
    out.level = lv.level;
    out.streak = streakDays;
  });

  await db().collection('security_audit').add({
    action: 'logTrainingSession',
    logId,
    teamId,
    playerEmail,
    playerName,
    earnedXP: earned,
    verificationMethod,
    actorUid: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (assignmentIdRaw) {
    try {
      const asRef = db().collection('assignments').doc(assignmentIdRaw);
      const asSnap = await asRef.get();
      if (asSnap.exists) {
        const a = asSnap.data();
        const st = a.status;
        const open = st === 'pending' || st === 'active';
        if (
          open &&
          a.teamId === teamId &&
          typeof a.playerId === 'string' &&
          a.playerId === athleteUid
        ) {
          await asRef.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            completedViaLogSession: true,
          });
        }
      }
    } catch (e) {
      logger.error('logTrainingSession assignment completion', e);
    }
  }

  return {
    ok: true,
    earnedXP: out.earnedXP,
    totalXp: out.totalXp,
    level: out.level,
    streakDays: out.streak,
    athleteUid,
  };
});

/**
 * Epic 11: coach/director assigns homework from global drills catalog.
 * @param {string[]} playerEmails Athlete account emails on the roster.
 */
exports.secureAssignHomework = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const teamId =
      typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const drillId =
      typeof data.drillId === 'string' ? data.drillId.trim() : '';
  const dueRaw = data.dueDate;
  const emailsRaw = data.playerEmails;

  if (!teamId || teamId === 'admin') {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }
  if (!drillId) {
    throw new HttpsError('invalid-argument', 'drillId is required.');
  }
  if (!Array.isArray(emailsRaw) || emailsRaw.length === 0) {
    throw new HttpsError(
        'invalid-argument',
        'playerEmails must be a non-empty array.',
    );
  }
  if (emailsRaw.length > 50) {
    throw new HttpsError(
        'invalid-argument',
        'Assign to at most 50 players per request.',
    );
  }

  let dueDate;
  if (dueRaw instanceof Date && !Number.isNaN(dueRaw.getTime())) {
    dueDate = admin.firestore.Timestamp.fromDate(dueRaw);
  } else if (
    typeof dueRaw === 'string' &&
    dueRaw.trim() &&
    !Number.isNaN(Date.parse(dueRaw))
  ) {
    dueDate = admin.firestore.Timestamp.fromDate(new Date(dueRaw));
  } else if (
    typeof dueRaw === 'number' &&
    Number.isFinite(dueRaw) &&
    dueRaw > 0
  ) {
    dueDate = admin.firestore.Timestamp.fromMillis(dueRaw);
  } else {
    throw new HttpsError(
        'invalid-argument',
        'dueDate must be an ISO string, millis, or Date.',
    );
  }

  const {clubId} = await assertCanSecureAddPlayer(request, teamId);
  await assertClubSubscriptionWritable(clubId, request);

  const drillSnap = await db().collection('drills').doc(drillId).get();
  if (!drillSnap.exists) {
    throw new HttpsError('not-found', 'Drill not found in library.');
  }
  const drillTitle =
      typeof drillSnap.data().title === 'string' ?
        drillSnap.data().title.trim().slice(0, 200) :
        'Drill';

  const batch = db().batch();
  let count = 0;
  const seen = new Set();
  for (const raw of emailsRaw) {
    const em = normEmail(String(raw || ''));
    if (!em || seen.has(em)) continue;
    seen.add(em);
    const uSnap = await db().collection('users').doc(em).get();
    if (!uSnap.exists) continue;
    const u = uSnap.data();
    if (u.teamId !== teamId) {
      throw new HttpsError(
          'failed-precondition',
          `Player ${em} is not on this team.`,
      );
    }
    let uid;
    try {
      const rec = await admin.auth().getUserByEmail(em);
      uid = rec.uid;
    } catch (e) {
      logger.warn('secureAssignHomework: no auth user for', em);
      continue;
    }
    const playerName =
        typeof u.playerName === 'string' ? u.playerName.trim() : '';
    const ref = db().collection('assignments').doc();
    batch.set(ref, {
      teamId,
      playerId: uid,
      player: playerName || 'Player',
      drillId,
      drillTitle,
      dueDate,
      status: 'pending',
      assignedBy: request.auth.uid,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    count++;
  }

  if (count === 0) {
    throw new HttpsError(
        'failed-precondition',
        'No valid athlete accounts could be assigned.',
    );
  }

  await batch.commit();

  await db().collection('security_audit').add({
    action: 'secureAssignHomework',
    teamId,
    drillId,
    count,
    actorUid: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {ok: true, assignedCount: count};
});

/**
 * Epic 11: coach deletes an assignment row.
 */
exports.secureDeleteHomework = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const assignmentId =
      typeof data.assignmentId === 'string' ?
        data.assignmentId.trim() :
        '';
  if (!assignmentId) {
    throw new HttpsError('invalid-argument', 'assignmentId is required.');
  }
  const ref = db().collection('assignments').doc(assignmentId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Assignment not found.');
  }
  const teamId =
      typeof snap.data().teamId === 'string' ?
        snap.data().teamId.trim() :
        '';
  if (!teamId) {
    throw new HttpsError('failed-precondition', 'Invalid assignment.');
  }
  const {clubId} = await assertCanSecureAddPlayer(request, teamId);
  await assertClubSubscriptionWritable(clubId, request);
  await ref.delete();
  return {ok: true};
});

/**
 * Epic 11: player marks homework done without a training log (legacy / quick).
 */
exports.completeAssignmentStatus = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const assignmentId =
      typeof data.assignmentId === 'string' ?
        data.assignmentId.trim() :
        '';
  if (!assignmentId) {
    throw new HttpsError('invalid-argument', 'assignmentId is required.');
  }
  const ref = db().collection('assignments').doc(assignmentId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Assignment not found.');
  }
  const a = snap.data();
  const uid = request.auth.uid;
  let allowed = false;
  if (typeof a.playerId === 'string' && a.playerId === uid) {
    allowed = true;
  } else if (typeof a.player === 'string' && a.player.trim()) {
    const em = normEmail(request.auth.token.email);
    if (em) {
      const uSnap = await db().collection('users').doc(em).get();
      if (
        uSnap.exists &&
        typeof uSnap.data().playerName === 'string' &&
        uSnap.data().playerName.trim() === a.player.trim()
      ) {
        allowed = true;
      }
    }
  }
  if (!allowed) {
    throw new HttpsError(
        'permission-denied',
        'This assignment is not yours to complete.',
    );
  }
  await ref.update({
    status: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return {ok: true};
});

/**
 * Phase 2: aggregate team practice activity when a workout rep is logged
 * (player/parent submitWorkoutRep). Updates team_stats for accountability.
 */
exports.onRepCreatedUpdateTeamStats = onDocumentCreated(
    {
      document: 'reps/{repId}',
      region: REGION,
    },
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const data = snap.data();
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      if (!teamId || teamId === 'admin') return;

      const statsRef = db().collection('team_stats').doc(teamId);
      const teamRef = db().collection('teams').doc(teamId);

      try {
        await db().runTransaction(async (transaction) => {
          const [statsSnap, teamSnap] = await Promise.all([
            transaction.get(statsRef),
            transaction.get(teamRef),
          ]);
          const clubId =
              teamSnap.exists &&
              typeof teamSnap.data().clubId === 'string' &&
              teamSnap.data().clubId.trim() ?
                teamSnap.data().clubId.trim() :
                null;

          const nowDate = new Date();
          const monthKey =
              `${nowDate.getUTCFullYear()}-` +
              `${String(nowDate.getUTCMonth() + 1).padStart(2, '0')}`;

          let totalSessions = 1;
          if (statsSnap.exists) {
            const sd = statsSnap.data() || {};
            const prevKey = sd.stats_month_key;
            if (prevKey === monthKey) {
              const prev =
                  typeof sd.total_sessions_this_month === 'number' &&
                  !Number.isNaN(sd.total_sessions_this_month) ?
                    sd.total_sessions_this_month :
                    0;
              totalSessions = prev + 1;
            }
          }

          transaction.set(
              statsRef,
              {
                teamId,
                clubId: clubId || null,
                last_activity_timestamp:
                  admin.firestore.FieldValue.serverTimestamp(),
                total_sessions_this_month: totalSessions,
                stats_month_key: monthKey,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              {merge: true},
          );
        });
      } catch (err) {
        logger.error('onRepCreatedUpdateTeamStats failed', err);
      }
    },
);

/**
 * Director / super_admin: oversight analytics (coach accountability buckets).
 * Directors are restricted to token clubId only (zero-trust).
 */
exports.getAccountabilityReport = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const role = request.auth.token.role || 'player';
  if (role !== 'director' && role !== 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Only directors and application admins may view this report.',
    );
  }

  let clubId = '';
  if (role === 'super_admin') {
    const data = request.data || {};
    const raw =
        typeof data.clubId === 'string' ? data.clubId.trim() : '';
    if (!raw) {
      throw new HttpsError(
          'invalid-argument',
          'clubId is required for super admin.',
      );
    }
    clubId = raw;
  } else {
    clubId = request.auth.token.clubId || '';
    if (!clubId) {
      throw new HttpsError(
          'failed-precondition',
          'Your account is missing club scope.',
      );
    }
  }

  const teamsSnap = await db().collection('teams')
      .where('clubId', '==', clubId)
      .get();

  const nowMs = Date.now();
  const MS_PER_DAY = 86400000;
  const teams = [];

  for (const tDoc of teamsSnap.docs) {
    const teamId = tDoc.id;
    const td = tDoc.data() || {};
    const teamName =
        typeof td.name === 'string' && td.name.trim() ?
          td.name.trim() :
          teamId;
    const coachEmail =
        typeof td.coachEmail === 'string' && td.coachEmail.trim() ?
          td.coachEmail.trim().toLowerCase() :
          '';

    const statsSnap = await db().collection('team_stats').doc(teamId).get();
    let lastMs = null;
    let sessionsThisMonth = 0;
    if (statsSnap.exists) {
      const sd = statsSnap.data() || {};
      const ts = sd.last_activity_timestamp;
      if (ts && typeof ts.toMillis === 'function') {
        lastMs = ts.toMillis();
      }
      if (typeof sd.total_sessions_this_month === 'number' &&
          !Number.isNaN(sd.total_sessions_this_month)) {
        sessionsThisMonth = sd.total_sessions_this_month;
      }
    }

    let daysSince = null;
    if (lastMs != null) {
      daysSince = Math.floor((nowMs - lastMs) / MS_PER_DAY);
    }

    let status = 'at_risk';
    if (daysSince !== null && daysSince <= 3) {
      status = 'active';
    } else if (daysSince !== null && daysSince <= 6) {
      status = 'warning';
    }

    teams.push({
      teamId,
      teamName,
      coachEmail,
      daysSinceActivity: daysSince,
      lastActivityAt: lastMs != null ?
        new Date(lastMs).toISOString() :
        null,
      sessionsThisMonth,
      status,
    });
  }

  teams.sort((a, b) => {
    const order = {at_risk: 0, warning: 1, active: 2};
    const oa = order[a.status] !== undefined ? order[a.status] : 3;
    const ob = order[b.status] !== undefined ? order[b.status] : 3;
    if (oa !== ob) return oa - ob;
    return (a.teamName || '').localeCompare(b.teamName || '');
  });

  const summary = {
    active: teams.filter((t) => t.status === 'active').length,
    warning: teams.filter((t) => t.status === 'warning').length,
    atRisk: teams.filter((t) => t.status === 'at_risk').length,
  };

  return {
    ok: true,
    clubId,
    generatedAt: new Date().toISOString(),
    summary,
    teams,
  };
});

/**
 * Public (no auth): recruit/scout-safe snapshot when player opted in and
 * is 16+.
 * Callable: allow unauthenticated invoke in GCP IAM for production.
 */
exports.getPublicRecruitProfile = onCall(
    {region: REGION, invoker: 'public'},
    async (request) => {
      const data = request.data || {};
      const rawKey =
          typeof data.playerKey === 'string' ? data.playerKey.trim() : '';
      const playerKey = normEmail(rawKey);
      if (!playerKey) {
        throw new HttpsError('invalid-argument', 'playerKey is required.');
      }

      const uRef = db().collection('users').doc(playerKey);
      const uSnap = await uRef.get();
      if (!uSnap.exists) {
        throw new HttpsError('not-found', 'Profile not found.');
      }
      const u = uSnap.data();
      if (u.recruitProfilePublic !== true) {
        throw new HttpsError(
            'permission-denied',
            'Public recruit profile is not enabled for this player.',
        );
      }

      const isMinor = u.isMinor === true;
      const dob = u.dateOfBirth;
      if (isMinor || !dob || !(dob instanceof admin.firestore.Timestamp)) {
        throw new HttpsError(
            'permission-denied',
            'Public profile requires verified age (16+) on file.',
        );
      }
      const age = computeAgeYears(dob);
      if (age < 16) {
        throw new HttpsError(
            'permission-denied',
            'Public recruit profiles are only for players 16+.',
        );
      }

      const metricsSnap = await db().collection('player_metrics').doc(playerKey)
          .collection('seasons')
          .get();

      /** @type {Array<Record<string, unknown>>} */
      const seasons = [];
      metricsSnap.forEach((d) => {
        const x = d.data();
        const vb = x.verifiedBy;
        if (typeof vb === 'string' && vb.length > 0) {
          const row = {
            id: d.id,
            seasonLabel: x.seasonLabel || null,
            physical: x.physical || null,
            technical: x.technical || null,
            verifiedBy: vb,
          };
          const ua = x.updatedAt;
          if (ua && typeof ua.toDate === 'function') {
            row.updatedAt = ua.toDate().toISOString();
          }
          seasons.push(row);
        }
      });

      const rawOa = u.operativeAvatar;
      const operativeAvatar = resolvePublicOperativeAvatarV2(rawOa);

      // Z2 org label — OPERATIVE_ID_CARD §5; not roster teamName
      let clubId =
          typeof u.clubId === 'string' && u.clubId.trim() ?
            u.clubId.trim() :
            '';
      if (!clubId && typeof u.teamId === 'string' && u.teamId.trim()) {
        const teamSnap = await db().collection('teams').doc(u.teamId.trim()).get();
        if (teamSnap.exists) {
          const t = teamSnap.data() || {};
          const tidClub =
              typeof t.clubId === 'string' && t.clubId.trim() ?
                t.clubId.trim() :
                '';
          if (tidClub) clubId = tidClub;
        }
      }
      let clubName =
          typeof u.clubDisplayName === 'string' && u.clubDisplayName.trim() ?
            u.clubDisplayName.trim() :
            '';
      if (clubId) {
        const clubSnap = await db().collection('clubs').doc(clubId).get();
        if (clubSnap.exists) {
          const c = clubSnap.data() || {};
          const docName = typeof c.name === 'string' ? c.name.trim() : '';
          if (docName) clubName = docName;
        }
      }

      const totalXp =
          typeof u.totalXp === 'number' && !Number.isNaN(u.totalXp) ?
            Math.max(0, Math.floor(u.totalXp)) :
            typeof u.xp === 'number' && !Number.isNaN(u.xp) ?
              Math.max(0, Math.floor(u.xp)) :
              0;
      const operativeLevel = trainingLevelFromTotalXp(totalXp).level;

      return {
        ok: true,
        playerKey,
        displayName: typeof u.playerName === 'string' ? u.playerName : null,
        clubName: clubName || null,
        operativeLevel,
        seasons,
        operativeAvatar,
      };
    },
);

/**
 * Public (no auth): marketing storefront landing by clubs.marketing.publicSlug.
 */
exports.getPublicClubLanding = onCall(
    {region: REGION, invoker: 'public'},
    async (request) => {
      const data = request.data || {};
      const raw =
          typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : '';
      if (!raw || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw) || raw.length > 80) {
        throw new HttpsError('invalid-argument', 'Invalid slug.');
      }

      const snap = await db().collection('clubs')
          .where('marketing.publicSlug', '==', raw)
          .limit(1)
          .get();
      if (snap.empty) {
        return {ok: false, notFound: true};
      }

      const clubDoc = snap.docs[0];
      const clubId = clubDoc.id;
      const c = clubDoc.data() || {};
      const m = c.marketing && typeof c.marketing === 'object' ? c.marketing : {};
      const metaPixelId =
          typeof m.metaPixelId === 'string' ? m.metaPixelId.trim().slice(0, 64) : '';
      const googleAnalyticsId =
          typeof m.googleAnalyticsId === 'string' ?
            m.googleAnalyticsId.trim().slice(0, 64) :
            '';

      /** @type {Array<Record<string, unknown>>} */
      const athletes = [];
      try {
        const profSnap = await db().collection('public_player_profiles')
            .where('clubId', '==', clubId)
            .orderBy('current_level', 'desc')
            .limit(8)
            .get();
        profSnap.forEach((d) => {
          const p = d.data() || {};
          athletes.push({
            id: d.id,
            displayName: p.displayName || null,
            ageGroup: p.ageGroup || null,
            position: p.position || null,
            current_level: p.current_level || 1,
            total_xp: p.total_xp || 0,
            verified_trial_scores: p.verified_trial_scores || {},
            brandLogoUrl: p.brandLogoUrl || null,
            clubDisplayName: p.clubDisplayName || null,
          });
        });
      } catch (e) {
        logger.warn('getPublicClubLanding athletes query', e);
      }

      const sportRaw = typeof c.sport === 'string' ? c.sport.trim().toLowerCase() : '';
      const sport =
          sportRaw &&
          [
            'soccer', 'basketball', 'baseball', 'football', 'volleyball',
            'hockey', 'lacrosse', 'generic',
          ].includes(sportRaw) ?
            sportRaw :
            'generic';

      return {
        ok: true,
        clubId,
        slug: raw,
        clubName: typeof c.name === 'string' ? c.name : '',
        sport,
        brandLogoUrl: typeof c.brandLogoUrl === 'string' ? c.brandLogoUrl : '',
        brandPrimaryHex:
          typeof c.brandPrimaryHex === 'string' ? c.brandPrimaryHex : '',
        brandAccentHex:
          typeof c.brandAccentHex === 'string' ? c.brandAccentHex : '',
        metaPixelId: metaPixelId || null,
        googleAnalyticsId: googleAnalyticsId || null,
        athletes,
      };
    },
);

/**
 * Player-only: idempotent daily XP + streak update (UTC dates).
 * At most one award per UTC day per user (`lastActivityDate`).
 */
exports.logPlayerActivity = onCall({region: REGION}, async (request) => {
  const emailKey = assertPlayer(request);
  const uRef = db().collection('users').doc(emailKey);

  /** @type {{ result: Record<string, unknown> }} */
  const out = {result: {}};

  await db().runTransaction(async (tx) => {
    const snap = await tx.get(uRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }
    const u = snap.data();
    const docRole = typeof u.role === 'string' ? u.role : 'player';
    if (docRole !== 'player') {
      throw new HttpsError(
          'permission-denied',
          'Gamification is only for player profiles.',
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = utcYmdAddDays(todayStr, -1);
    const lastStr = lastActivityToUtcYmd(u.lastActivityDate);

    const prevXp = Number(u.xp);
    const safeXp = Number.isFinite(prevXp) ? Math.floor(prevXp) : 0;
    const prevCur = Number(u.currentStreak);
    const safeCur = Number.isFinite(prevCur) ? Math.floor(prevCur) : 0;
    const prevLong = Number(u.longestStreak);
    const safeLong = Number.isFinite(prevLong) ? Math.floor(prevLong) : 0;

    if (lastStr === todayStr) {
      out.result = {
        ok: true,
        awarded: false,
        xp: safeXp,
        xpDelta: 0,
        currentStreak: safeCur,
        longestStreak: safeLong,
        lastActivityDate: lastStr,
      };
      return;
    }

    let newStreak;
    if (lastStr === yesterdayStr) {
      newStreak = safeCur + 1;
    } else {
      newStreak = 1;
    }

    const newXp = safeXp + DAILY_ACTIVITY_XP;
    const newLongest = Math.max(safeLong, newStreak);

    tx.update(uRef, {
      xp: newXp,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: todayStr,
    });

    out.result = {
      ok: true,
      awarded: true,
      xp: newXp,
      xpDelta: DAILY_ACTIVITY_XP,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: todayStr,
    };
  });

  return out.result;
});

/**
 * Epic 4.1: Gemini analysis of a saved tactical board (server-only API key).
 * Callers: coach, director, super_admin (team scoped like tactics rules).
 */
exports.analyzeTacticWithAI = onCall(
    {
      region: REGION,
      secrets: [GEMINI_API_KEY],
      ...ALPHA_CALLABLE_OPTS,
    },
    async (request) => {
      const actor = assertCoachMessageSender(request);
      const data = request.data || {};
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      const tacticId =
          typeof data.tacticId === 'string' ? data.tacticId.trim() : '';
      if (!teamId || !tacticId) {
        throw new HttpsError(
            'invalid-argument',
            'teamId and tacticId are required.',
        );
      }

      const tSnap = await db().collection('teams').doc(teamId).get();
      assertActorCanAccessTeam(actor, teamId, tSnap);

      const tacRef = db().collection('teams').doc(teamId)
          .collection('tactics').doc(tacticId);
      const tacSnap = await tacRef.get();
      if (!tacSnap.exists) {
        throw new HttpsError('not-found', 'Tactic not found.');
      }
      const tac = tacSnap.data();
      const name =
          typeof tac.name === 'string' && tac.name.trim() ?
            tac.name.trim() :
            'Untitled tactic';
      const canvasState = tac.canvasState;

      let canvasJson;
      try {
        const forJson =
            canvasState === undefined || canvasState === null ?
              null :
              canvasState;
        canvasJson =
            typeof canvasState === 'string' ?
              canvasState :
              JSON.stringify(forJson, null, 0);
      } catch (e) {
        throw new HttpsError(
            'failed-precondition',
            'Tactic canvasState could not be serialized.',
        );
      }
      if (canvasJson.length > TACTIC_CANVAS_JSON_MAX_CHARS) {
        canvasJson =
            canvasJson.slice(0, TACTIC_CANVAS_JSON_MAX_CHARS) +
            '\n...[truncated for model context]';
      }

      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 16) {
        logger.error('GEMINI_API_KEY missing or too short.');
        throw new HttpsError(
            'failed-precondition',
            'AI is not configured. Ask an admin to set GEMINI_API_KEY.',
        );
      }

      const systemPersona = [
        'You are an Expert UEFA Pro License Soccer Coach. You read',
        'structured tactical board data (normalized coordinates, objects,',
        'and layers) and give concise, practical coaching feedback.',
        'Stay evidence-based; do not invent players or formations not',
        'implied by the data. Use football terminology appropriate for',
        'elite youth and semi-pro coaches.',
      ].join(' ');

      const userPrompt = [
        systemPersona,
        '',
        '---',
        'Tactic name: ' + name,
        '',
        'Canvas state JSON (spatial layout, normalized X/Y where',
        'applicable):',
        canvasJson,
        '',
        'Respond with:',
        '1) Two or three short bullets on spatial distribution (width,',
        '   depth, compactness, rest-defence if visible).',
        '2) One bullet naming a plausible tactical weakness (e.g.',
        '   vulnerable to counters on the wings, half-space underloaded).',
        '3) One bullet with a single concrete improvement for the next',
        '   session (drill or positional tweak).',
        'Keep total under ~220 words. No AI self-introduction.',
      ].join('\n');

      const ai = new GoogleGenAI({apiKey});

      let analysisText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userPrompt,
        });
        if (response && typeof response.text === 'string') {
          analysisText = response.text;
        } else if (
          response &&
          response.candidates &&
          response.candidates[0] &&
          response.candidates[0].content &&
          response.candidates[0].content.parts
        ) {
          const parts = response.candidates[0].content.parts;
          analysisText = parts
              .map((p) => (typeof p.text === 'string' ? p.text : ''))
              .join('');
        }
      } catch (err) {
        logger.error('analyzeTacticWithAI: Gemini request failed', err);
        throw new HttpsError(
            'internal',
            'AI analysis failed. Try again later.',
        );
      }

      analysisText = (analysisText || '').trim();
      if (!analysisText) {
        throw new HttpsError(
            'internal',
            'AI returned an empty analysis.',
        );
      }

      return {
        ok: true,
        tacticId,
        teamId,
        tacticName: name,
        analysis: analysisText,
        model: 'gemini-2.5-flash',
      };
    },
);

// ── Epic 8: Intent-Based Homework Triggers ────────────────────────────────────

/**
 * PRESCRIPTION-schema — validate and normalize optional coach prescription on deploy.
 * @param {unknown} raw
 * @returns {object|undefined}
 */
function normalizePrescription(raw) {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpsError('invalid-argument', 'prescription must be an object.');
  }
  const drillTitle = typeof raw.drillTitle === 'string' ? raw.drillTitle.trim() : '';
  const sets = Number(raw.sets);
  if (!Number.isFinite(sets) || sets < 1 || sets > 99 || Math.floor(sets) !== sets) {
    throw new HttpsError('invalid-argument', 'prescription.sets must be an integer 1–99.');
  }
  let repsPerSet;
  if (raw.repsPerSet !== undefined && raw.repsPerSet !== null) {
    repsPerSet = Number(raw.repsPerSet);
    if (!Number.isFinite(repsPerSet) || repsPerSet < 1 || repsPerSet > 999 || Math.floor(repsPerSet) !== repsPerSet) {
      throw new HttpsError('invalid-argument', 'prescription.repsPerSet must be an integer 1–999.');
    }
    repsPerSet = Math.floor(repsPerSet);
  }
  const bilateral = raw.bilateral === true;
  let targetDurationMin;
  if (raw.targetDurationMin !== undefined && raw.targetDurationMin !== null) {
    targetDurationMin = Number(raw.targetDurationMin);
    if (!Number.isFinite(targetDurationMin) || targetDurationMin < 1 || targetDurationMin > 480) {
      throw new HttpsError('invalid-argument', 'prescription.targetDurationMin must be 1–480.');
    }
    targetDurationMin = Math.floor(targetDurationMin);
  }
  let targetRpe;
  if (raw.targetRpe !== undefined && raw.targetRpe !== null) {
    targetRpe = Number(raw.targetRpe);
    if (!Number.isFinite(targetRpe) || targetRpe < 1 || targetRpe > 10) {
      throw new HttpsError('invalid-argument', 'prescription.targetRpe must be 1–10.');
    }
    targetRpe = Math.round(targetRpe);
  }
  const out = {sets: Math.floor(sets), bilateral};
  if (drillTitle) out.drillTitle = drillTitle.slice(0, 200);
  if (repsPerSet !== undefined) out.repsPerSet = repsPerSet;
  if (targetDurationMin !== undefined) out.targetDurationMin = targetDurationMin;
  if (targetRpe !== undefined) out.targetRpe = targetRpe;
  return out;
}

/**
 * Epic 8 — Deploy a macro-goal intent to team_assignments.
 * Coach/director picks a target attribute + XP bounty; the RL engine resolves
 * individualized drills per player at inference time.
 */
exports.secureDeployIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const targetAttributeId = typeof data.targetAttributeId === 'string' ? data.targetAttributeId.trim() : '';
  const requiredXp = Number(data.requiredXp);
  const durationDays = Number(data.durationDays);
  const scope = data.scope === 'players' ? 'players' : 'team';
  const targetUids = scope === 'players' && Array.isArray(data.targetUids)
    ? data.targetUids.filter((u) => typeof u === 'string' && u.trim()).map((u) => u.trim())
    : [];
  const priority = Number.isFinite(Number(data.priority)) && Number(data.priority) >= 1
    ? Math.floor(Number(data.priority))
    : 100;
  const prescription = normalizePrescription(data.prescription);

  if (!teamId || teamId === 'admin') throw new HttpsError('invalid-argument', 'teamId is required.');
  if (!tenantId) throw new HttpsError('invalid-argument', 'tenantId is required.');
  if (!clubId) throw new HttpsError('invalid-argument', 'clubId is required.');
  if (!targetAttributeId) throw new HttpsError('invalid-argument', 'targetAttributeId is required.');
  if (!Number.isFinite(requiredXp) || requiredXp < 1 || requiredXp > 100000) {
    throw new HttpsError('invalid-argument', 'requiredXp must be 1–100000.');
  }
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 90) {
    throw new HttpsError('invalid-argument', 'durationDays must be 1–90.');
  }
  if (scope === 'players' && targetUids.length === 0) {
    throw new HttpsError('invalid-argument', 'targetUids must be non-empty when scope is "players".');
  }
  if (targetUids.length > 100) {
    throw new HttpsError('invalid-argument', 'targetUids may not exceed 100 entries.');
  }

  const {clubId: verifiedClubId} = await assertCanSecureAddPlayer(request, teamId);
  if (verifiedClubId !== clubId) {
    throw new HttpsError('permission-denied', 'clubId mismatch — cross-tenant write denied.');
  }

  // When scoped to specific players, verify each uid is on this team.
  if (scope === 'players' && targetUids.length > 0) {
    const teamDoc = await db().collection('teams').doc(teamId).get();
    if (!teamDoc.exists) throw new HttpsError('not-found', 'Team not found.');
    const rosterSnap = await db().collection('users').where('teamId', '==', teamId).get();
    const teamUids = new Set(rosterSnap.docs.map((d) => d.data().uid || d.id));
    for (const uid of targetUids) {
      if (!teamUids.has(uid)) {
        throw new HttpsError('failed-precondition', `UID ${uid} is not on team ${teamId}.`);
      }
    }
  }

  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + durationDays * 86_400_000,
  );

  const intentRef = db().collection('team_assignments').doc();
  const intentId = intentRef.id;

  const intentPayload = {
    intentId,
    teamId,
    tenantId,
    clubId,
    assignedByUid: request.auth.uid,
    targetAttributeId,
    requiredXp: Math.floor(requiredXp),
    scope,
    targetUids,
    priority,
    status: 'active',
    fulfilledByUids: [],
    intentVersion: 1,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (prescription) intentPayload.prescription = prescription;
  await intentRef.set(intentPayload);

  await db().collection('security_audit').add({
    action: 'secureDeployIntent',
    intentId,
    teamId,
    tenantId,
    clubId,
    targetAttributeId,
    requiredXp,
    scope,
    targetCount: scope === 'players' ? targetUids.length : 'team',
    hasPrescription: Boolean(prescription),
    actorUid: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    intentId,
    status: 'active',
    expiresAt: expiresAt.toDate().toISOString(),
    targetCount: scope === 'players' ? targetUids.length : 0,
  };
});

/**
 * Epic 8 — Cancel an active intent.
 * Allowed: the deploying coach, any director on the same club, super_admin.
 */
exports.secureCancelIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const intentId = typeof data.intentId === 'string' ? data.intentId.trim() : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';

  if (!intentId) throw new HttpsError('invalid-argument', 'intentId is required.');
  if (!teamId) throw new HttpsError('invalid-argument', 'teamId is required.');
  if (!tenantId) throw new HttpsError('invalid-argument', 'tenantId is required.');

  const ref = db().collection('team_assignments').doc(intentId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Intent not found.');

  const intent = snap.data();
  if (intent.teamId !== teamId || intent.tenantId !== tenantId) {
    throw new HttpsError('permission-denied', 'Cross-tenant cancel denied.');
  }
  if (intent.status !== 'active') {
    throw new HttpsError('failed-precondition', `Intent is already ${intent.status}.`);
  }

  await assertCanSecureAddPlayer(request, teamId);

  await ref.update({
    status: 'cancelled',
    lastModifiedByUid: request.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db().collection('security_audit').add({
    action: 'secureCancelIntent',
    intentId,
    teamId,
    tenantId,
    actorUid: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {intentId, status: 'cancelled'};
});

/**
 * Epic 8 — Extend the expiry of an active intent by additional days.
 */
exports.secureExtendIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const intentId = typeof data.intentId === 'string' ? data.intentId.trim() : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';
  const additionalDays = Number(data.additionalDays);

  if (!intentId) throw new HttpsError('invalid-argument', 'intentId is required.');
  if (!teamId) throw new HttpsError('invalid-argument', 'teamId is required.');
  if (!tenantId) throw new HttpsError('invalid-argument', 'tenantId is required.');
  if (!Number.isFinite(additionalDays) || additionalDays < 1 || additionalDays > 90) {
    throw new HttpsError('invalid-argument', 'additionalDays must be 1–90.');
  }

  const ref = db().collection('team_assignments').doc(intentId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Intent not found.');

  const intent = snap.data();
  if (intent.teamId !== teamId || intent.tenantId !== tenantId) {
    throw new HttpsError('permission-denied', 'Cross-tenant extend denied.');
  }
  if (intent.status !== 'active') {
    throw new HttpsError('failed-precondition', `Cannot extend — intent is ${intent.status}.`);
  }

  await assertCanSecureAddPlayer(request, teamId);

  const currentExpiry = intent.expiresAt && typeof intent.expiresAt.toMillis === 'function'
    ? intent.expiresAt.toMillis()
    : Date.now();
  const newExpiresAt = admin.firestore.Timestamp.fromMillis(
    Math.max(currentExpiry, Date.now()) + additionalDays * 86_400_000,
  );

  await ref.update({
    expiresAt: newExpiresAt,
    lastModifiedByUid: request.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db().collection('security_audit').add({
    action: 'secureExtendIntent',
    intentId,
    teamId,
    tenantId,
    additionalDays,
    actorUid: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {intentId, newExpiresAt: newExpiresAt.toDate().toISOString()};
});

/** Server XP grant when a `reps` doc is created (parent/player submitWorkoutRep). */
exports.onRepCreatedApplyGamificationXp = onDocumentCreated(
    {
      document: 'reps/{repId}',
      region: REGION,
    },
    async (event) => {
      try {
        const snap = event.data;
        if (!snap) {
          return;
        }
        const repId = event.params && event.params.repId ? String(event.params.repId) : '';
        if (!repId) {
          return;
        }
        await grantTrainingXpAfterRepCreated(db(), snap, repId);
      } catch (e) {
        logger.error('onRepCreatedApplyGamificationXp failed', e);
      }
    },
);

// ── Epic 8: Intent lifecycle trigger ─────────────────────────────────────────

/**
 * Fires when a user doc is updated. If xpByAttribute changed, check all active
 * intents where this player is in scope. For each intent where the player's XP
 * for the target attribute now meets requiredXp, append their uid to
 * fulfilledByUids. When ALL targeted players have fulfilled, flip status to
 * 'fulfilled'.
 */
exports.onUserXpUpdateIntentLifecycle = onDocumentUpdated(
    {
      document: 'users/{userId}',
      region: REGION,
    },
    async (event) => {
      try {
        const before = event.data && event.data.before ? event.data.before.data() : null;
        const after = event.data && event.data.after ? event.data.after.data() : null;
        if (!before || !after) return;

        const uid = after.uid || event.params.userId;
        if (!uid || typeof uid !== 'string') return;

        // Fast-exit: if xpByAttribute hasn't changed, nothing to do.
        const xpBefore = before.xpByAttribute || {};
        const xpAfter = after.xpByAttribute || {};
        const changedAttrs = Object.keys(xpAfter).filter(
          (k) => (xpAfter[k] || 0) !== (xpBefore[k] || 0),
        );
        if (changedAttrs.length === 0) return;

        const teamId = typeof after.teamId === 'string' ? after.teamId.trim() : '';
        if (!teamId) return;

        // Query active intents for this team where a changed attribute matches.
        // Firestore does not support OR on different fields, so query by teamId+status
        // and filter in memory — the result set is small (< 20 active intents per team).
        const intentsSnap = await db()
          .collection('team_assignments')
          .where('teamId', '==', teamId)
          .where('status', '==', 'active')
          .get();

        if (intentsSnap.empty) return;

        const firestoreBatch = db().batch();
        let batchHasWork = false;

        for (const intentDoc of intentsSnap.docs) {
          const intent = intentDoc.data();
          const attrId = intent.targetAttributeId;
          if (!changedAttrs.includes(attrId)) continue;

          // Check if this player is in scope.
          const scope = intent.scope || 'team';
          const targetUids = Array.isArray(intent.targetUids) ? intent.targetUids : [];
          const inScope = scope === 'team' || targetUids.includes(uid);
          if (!inScope) continue;

          const requiredXp = Number(intent.requiredXp) || 0;
          const playerXp = Number((xpAfter)[attrId] || 0);
          if (playerXp < requiredXp) continue;

          // Player has met the threshold.
          const alreadyFulfilled = Array.isArray(intent.fulfilledByUids) &&
            intent.fulfilledByUids.includes(uid);
          if (alreadyFulfilled) continue;

          const newFulfilled = [...(intent.fulfilledByUids || []), uid];

          // Determine whether ALL targets are now fulfilled.
          let intentComplete = false;
          if (scope === 'team') {
            // Team-wide: check all roster players.
            const rosterSnap = await db()
              .collection('users')
              .where('teamId', '==', teamId)
              .where('role', '==', 'player')
              .get();
            const rosterUids = rosterSnap.docs.map((d) => d.data().uid || d.id);
            intentComplete = rosterUids.length > 0 &&
              rosterUids.every((ru) => newFulfilled.includes(ru));
          } else {
            intentComplete = targetUids.length > 0 &&
              targetUids.every((tu) => newFulfilled.includes(tu));
          }

          firestoreBatch.update(intentDoc.ref, {
            fulfilledByUids: newFulfilled,
            ...(intentComplete ? {
              status: 'fulfilled',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            } : {
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }),
          });
          batchHasWork = true;

          if (intentComplete) {
            logger.info(`[intentLifecycle] Intent ${intentDoc.id} fully fulfilled.`);
          }
        }

        if (batchHasWork) {
          await firestoreBatch.commit();
        }
      } catch (e) {
        logger.error('[onUserXpUpdateIntentLifecycle] error:', e);
      }
    },
);

/**
 * Hourly scheduler: flip status to 'expired' for any active intent whose
 * expiresAt has passed. Runs in us-east1 to match the rest of the functions.
 */
exports.scheduledExpireIntents = onSchedule(
    {
      schedule: 'every 60 minutes',
      region: REGION,
    },
    async () => {
      try {
        const now = admin.firestore.Timestamp.now();
        const expiredSnap = await db()
          .collection('team_assignments')
          .where('status', '==', 'active')
          .where('expiresAt', '<=', now)
          .get();

        if (expiredSnap.empty) return;

        const batch = db().batch();
        for (const doc of expiredSnap.docs) {
          batch.update(doc.ref, {
            status: 'expired',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
        logger.info(`[scheduledExpireIntents] Expired ${expiredSnap.size} intent(s).`);
      } catch (e) {
        logger.error('[scheduledExpireIntents] error:', e);
      }
    },
);
