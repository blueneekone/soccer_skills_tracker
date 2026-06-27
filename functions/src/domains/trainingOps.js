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
  getSeasonOneCardRewardsForLevelRange,
} = require('../../gamificationWorkoutXp');

const {
  assertCanSecureAddPlayer,
  assertClubSubscriptionWritable,
  assertParent,
  assertParentAsync,
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
 * Map Firestore query failures to actionable HttpsError (never bare INTERNAL).
 * @param {string} context
 * @param {unknown} err
 * @returns {never}
 */
function rethrowFirestoreQueryError(context, err) {
  if (err instanceof HttpsError) throw err;
  const raw =
      err && typeof err === 'object' && 'message' in err ?
        String(/** @type {{ message: unknown }} */ (err).message) :
        String(err);
  logger.error(`logTrainingSession: ${context}`, err);
  const needsIndex = /index|FAILED_PRECONDITION|create_composite/i.test(raw);
  const suffix = needsIndex ?
    ' If this persists, staff may need to finish building the drill_completions index.' :
    '';
  throw new HttpsError(
      'failed-precondition',
      `${context} unavailable.${suffix}`,
  );
}

/**
 * Read normalized cadence from a stored intent prescription (B2).
 * @param {unknown} prescription
 * @returns {{ sessionsPerWindow: number, windowDays: number } | undefined}
 */
function cadenceFromIntentPrescription(prescription) {
  if (!prescription || typeof prescription !== 'object' || Array.isArray(prescription)) {
    return undefined;
  }
  const raw = /** @type {{ cadence?: unknown }} */ (prescription).cadence;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const spw = Number(/** @type {{ sessionsPerWindow?: unknown }} */ (raw).sessionsPerWindow);
  const wd = Number(/** @type {{ windowDays?: unknown }} */ (raw).windowDays);
  if (
    !Number.isFinite(spw) || spw < 1 || spw > 21 || Math.floor(spw) !== spw ||
    !Number.isFinite(wd) || wd < 1 || wd > 30 || Math.floor(wd) !== wd
  ) {
    return undefined;
  }
  return {sessionsPerWindow: Math.floor(spw), windowDays: Math.floor(wd)};
}

/** Multi-day XP goals without explicit cadence get server-side 5×/7 (FORGE-CADENCE-DEFAULT mirror). */
const HIGH_XP_CADENCE_THRESHOLD = 300;
const DEFAULT_HIGH_XP_CADENCE = {sessionsPerWindow: 5, windowDays: 7};

/**
 * Inject default cadence when requiredXp is high and coach did not set cadence.
 * Coach explicit cadence always wins.
 * @param {object|undefined} prescription
 * @param {number|undefined} requiredXp
 * @returns {object|undefined}
 */
function applyHighXpCadenceDefault(prescription, requiredXp) {
  const req = Math.floor(Number(requiredXp) || 0);
  if (req < HIGH_XP_CADENCE_THRESHOLD) return prescription;
  if (prescription && cadenceFromIntentPrescription(prescription)) return prescription;
  const base = prescription || {sets: 1, bilateral: false};
  logger.info(
      'applyHighXpCadenceDefault: injecting 5×/week cadence for high requiredXp intent',
      {requiredXp: req},
  );
  return {...base, cadence: {...DEFAULT_HIGH_XP_CADENCE}};
}

/**
 * Epic 2/3: server-side XP, workout_logs, player_stats/{uid}, team_stats.
 */
exports.logTrainingSession = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  try {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const role = request.auth.token.role || 'player';

  const duration = parseInt(String(data.duration), 10);
  const reps = parseInt(String(data.reps), 10);
  if (!Number.isFinite(duration) || duration < 1 || duration > 120) {
    throw new HttpsError(
        'invalid-argument',
        'duration must be 1-120 minutes.',
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

  // Coach-intent target attribute: sanitize to [a-z0-9_], max 60 chars.
  // When present, xpByAttribute is incremented on users/{email} (intent lifecycle trigger)
  // and player_stats/{uid} (RL featureBuilder). Free logs without attributeId are unchanged.
  const attributeIdRaw =
      typeof data.attributeId === 'string' ?
        data.attributeId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 60) :
        '';

  const intentIdRaw =
      typeof data.intentId === 'string' ?
        data.intentId.trim().slice(0, 128) :
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
    const actor = await assertParentAsync(request);
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
  const playerName =
      typeof u.playerName === 'string' && u.playerName.trim() ?
        u.playerName.trim() :
        null;
  if (!playerName) {
    throw new HttpsError(
        'failed-precondition',
        'Athlete profile is missing display name.',
    );
  }
  const rawTeamId = typeof u.teamId === 'string' ? u.teamId.trim() : '';
  const teamId =
      rawTeamId && rawTeamId !== 'admin' ? rawTeamId : null;
  const vpcStatus = typeof u.vpcStatus === 'string' ? u.vpcStatus : '';
  const clubIdFromUser =
      typeof u.clubId === 'string' && u.clubId.trim() ? u.clubId.trim() : '';
  const teamlessOk =
      !teamId &&
      (vpcStatus === 'verified' || vpcStatus === 'not_required') &&
      !!clubIdFromUser;
  if (!teamId && !teamlessOk) {
    throw new HttpsError(
        'failed-precondition',
        vpcStatus !== 'verified' && vpcStatus !== 'not_required' ?
          'VPC clearance is required before training without a team.' :
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

  const todayStr = new Date().toISOString().slice(0, 10);

  // B2 cadence anti-cheat: one credited session per UTC day per cadence assignment.
  if (attributeIdRaw && intentIdRaw) {
    const intentRef = db().collection('team_assignments').doc(intentIdRaw);
    /** @type {FirebaseFirestore.DocumentSnapshot} */
    let intentSnap;
    try {
      intentSnap = await intentRef.get();
    } catch (e) {
      rethrowFirestoreQueryError('Cadence assignment lookup', e);
    }
    if (intentSnap.exists) {
      const intentData = intentSnap.data();
      const cadence = cadenceFromIntentPrescription(intentData.prescription);
      const requiredXp = Number(intentData.requiredXp) || 0;
      const enforceDailyCreditCap =
        Boolean(cadence) || requiredXp >= HIGH_XP_CADENCE_THRESHOLD;
      if (enforceDailyCreditCap) {
        const todayStartMs = Date.UTC(
            parseInt(todayStr.slice(0, 4), 10),
            parseInt(todayStr.slice(5, 7), 10) - 1,
            parseInt(todayStr.slice(8, 10), 10),
        );
        const todayStart = admin.firestore.Timestamp.fromMillis(todayStartMs);
        const tomorrowStart = admin.firestore.Timestamp.fromMillis(todayStartMs + 86_400_000);
        /** @type {FirebaseFirestore.QuerySnapshot} */
        let existingSnap;
        try {
          existingSnap = await db()
              .collection('drill_completions')
              .where('playerUid', '==', athleteUid)
              .where('attributeId', '==', attributeIdRaw)
              .where('loggedAt', '>=', todayStart)
              .where('loggedAt', '<', tomorrowStart)
              .get();
        } catch (e) {
          rethrowFirestoreQueryError('Cadence limit check', e);
        }
        const hasToday = existingSnap.docs.some((d) => {
          const row = d.data();
          const rowIntent = typeof row.intentId === 'string' ? row.intentId.trim() : '';
          return rowIntent === intentIdRaw;
        });
        if (hasToday) {
          throw new HttpsError(
              'failed-precondition',
              'Cadence limit: one session per day toward this assignment.',
          );
        }
      }
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const yesterdayStr = utcYmdAddDays(todayStr, -1);
  const weekKey = utcWeekMondayKey();

  const logRef = db().collection('workout_logs').doc();
  const logId = logRef.id;
  const psRef = db().collection('player_stats').doc(athleteUid);
  const tsRef = teamId ? db().collection('team_stats').doc(teamId) : null;
  const teamRef = teamId ? db().collection('teams').doc(teamId) : null;

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

  // Subjective physiological fields (Phase 3, Epic 4 — RL pipeline).
  // Parsed before transaction so physio tx.get can run with other reads.
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
  const restingFeel =
      Number.isFinite(Number(data.restingFeel)) &&
      Number(data.restingFeel) >= 1 &&
      Number(data.restingFeel) <= 5 ?
        Math.round(Number(data.restingFeel)) :
        null;
  const sessionNotes =
      typeof data.sessionNotes === 'string' ?
        data.sessionNotes.trim().slice(0, 500) :
        '';

  const physioComplete =
      verificationMethod === 'player_self_log' &&
      soreness != null &&
      mood != null &&
      sleepHoursLastNight != null &&
      restingFeel != null;
  const physioRef = physioComplete ?
    db()
        .collection('physio_self_reports')
        .doc(athleteUid)
        .collection('daily')
        .doc(todayStr) :
    null;

  try {
    await db().runTransaction(async (tx) => {
    const psSnap = await tx.get(psRef);
    const uSnapTx = await tx.get(uRef);
    const tsSnap = tsRef ? await tx.get(tsRef) : null;
    const teamSnap = teamRef ? await tx.get(teamRef) : null;
    let physioSnap = null;
    if (physioComplete) {
      physioSnap = await tx.get(physioRef);
    }
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
      restingFeel,
    };
    if (sessionNotes) logDoc.sessionNotes = sessionNotes;
    if (assignmentIdRaw) logDoc.assignmentId = assignmentIdRaw;
    if (verifiedByUid) {
      logDoc.verifiedByUid = verifiedByUid;
      logDoc.verifiedByEmail = verifiedByEmail;
      logDoc.verifiedByLegalName = verifiedByLegalName;
      logDoc.verifiedAt = now;
    }

    tx.set(logRef, logDoc);

    const psSetData = {
      teamId: teamId || null,
      // T1-10: denormalize clubId onto player_stats so the Firestore read rule can use
      // tokenClubMatchesDoc() (zero gets) instead of teamClubId() (1 get).
      clubId:
        teamSnap && teamSnap.exists &&
        typeof teamSnap.data().clubId === 'string' &&
        teamSnap.data().clubId.trim() ?
          teamSnap.data().clubId.trim() :
          (typeof uSnapTx.data()?.clubId === 'string' &&
          uSnapTx.data().clubId.trim() ?
            uSnapTx.data().clubId.trim() :
            null),
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
    };
    // xpByAttribute: feeds RL featureBuilder (player_stats/{uid}.xpByAttribute).
    if (attributeIdRaw) {
      psSetData[`xpByAttribute.${attributeIdRaw}`] =
          admin.firestore.FieldValue.increment(earned);
    }
    tx.set(psRef, psSetData, {merge: true});

    const uTxData = uSnapTx.data() || {};
    const prevLong =
        typeof uTxData.longestStreak === 'number' && !Number.isNaN(uTxData.longestStreak) ?
          Math.floor(uTxData.longestStreak) :
          0;
    const xpInc = admin.firestore.FieldValue.increment(earned);
    const uUpdateData = {
      xp: xpInc,
      totalXp: xpInc,
      trainingLevel: lv.level,
      currentStreak: streakDays,
      longestStreak: Math.max(prevLong, streakDays),
      updatedAt: now,
    };
    // xpByAttribute: feeds onUserXpUpdateIntentLifecycle trigger (users/{email}.xpByAttribute).
    if (attributeIdRaw) {
      uUpdateData[`xpByAttribute.${attributeIdRaw}`] =
          admin.firestore.FieldValue.increment(earned);
    }
    // T1-8: grant Season 1 cards for newly reached levels into users/{email}.ownedSeasonOneCards.
    const prevLevel = trainingLevelFromTotalXp(prevTotal).level;
    const newLevelCards = getSeasonOneCardRewardsForLevelRange(prevLevel, lv.level);
    if (newLevelCards.length > 0) {
      uUpdateData.ownedSeasonOneCards =
          admin.firestore.FieldValue.arrayUnion(...newLevelCards);
    }
    tx.update(uRef, uUpdateData);

    const clubId =
        teamId && teamSnap && teamSnap.exists &&
        typeof teamSnap.data().clubId === 'string' &&
        teamSnap.data().clubId.trim() ?
          teamSnap.data().clubId.trim() :
          (typeof uTxData.clubId === 'string' && uTxData.clubId.trim() ?
            uTxData.clubId.trim() :
            null);

    // B2 cadence: audit row feeds HQ progress + intent lifecycle session gate.
    if (attributeIdRaw) {
      const dcRef = db().collection('drill_completions').doc();
      const dcDoc = {
        playerUid: athleteUid,
        userKey: playerEmail,
        clubId: clubId || clubIdFromUser || null,
        drillId: intentIdRaw || 'player_workout_log',
        drillTitle: drillType,
        attributeId: attributeIdRaw,
        xpAwarded: earned,
        outcome: 'success',
        loggedAt: now,
        source: 'logTrainingSession',
        workoutLogId: logId,
      };
      if (intentIdRaw) dcDoc.intentId = intentIdRaw;
      tx.set(dcRef, dcDoc);
    }

    // RL physio: first workout log of the UTC day mirrors daily self-report (Train strip).
    if (physioComplete && !physioSnap.exists) {
      tx.set(physioRef, {
        uid: athleteUid,
        dateUtc: todayStr,
        sleepHours: sleepHoursLastNight,
        soreness,
        mood,
        restingFeel,
        source: 'logTrainingSession',
        workoutLogId: logId,
        createdAt: now,
      });
    }

    if (teamId && tsRef) {
      const nowDate = new Date();
      const monthKey =
          `${nowDate.getUTCFullYear()}-` +
          `${String(nowDate.getUTCMonth() + 1).padStart(2, '0')}`;

      let totalSessions = 1;
      if (tsSnap && tsSnap.exists) {
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
    }

    out.totalXp = newTotal;
    out.level = lv.level;
    out.streak = streakDays;
  });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.error('logTrainingSession: transaction failed', e);
    throw new HttpsError(
        'failed-precondition',
        'Training session could not be saved. Retry in a moment or ask staff.',
    );
  }

  try {
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
  } catch (e) {
    logger.error('logTrainingSession: security_audit write failed (non-fatal)', e);
  }

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
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.error('logTrainingSession: unhandled', e);
    throw new HttpsError(
        'failed-precondition',
        'Transmit failed — try again or ask staff.',
    );
  }
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
 * B3: Normalize a single bundle drill entry — same validation rules as the
 * top-level prescription fields (sets required int 1–99; others optional).
 * Throws HttpsError on any malformed field so the whole deploy is rejected.
 * @param {unknown} raw
 * @param {number} index - position in drills[] for error messages
 * @returns {object}
 */
function normalizeDrillEntry(raw, index) {
  const pfx = `prescription.drills[${index}]`;
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpsError('invalid-argument', `${pfx} must be an object.`);
  }
  const drillTitle = typeof raw.drillTitle === 'string' ? raw.drillTitle.trim() : '';
  const teamDrillId = typeof raw.teamDrillId === 'string' ? raw.teamDrillId.trim() : '';
  const clubDrillId = typeof raw.clubDrillId === 'string' ? raw.clubDrillId.trim() : '';
  const legacyDrillId = typeof raw.drillId === 'string' ? raw.drillId.trim() : '';
  const sets = Number(raw.sets);
  if (!Number.isFinite(sets) || sets < 1 || sets > 99 || Math.floor(sets) !== sets) {
    throw new HttpsError('invalid-argument', `${pfx}.sets must be an integer 1–99.`);
  }
  let repsPerSet;
  if (raw.repsPerSet !== undefined && raw.repsPerSet !== null) {
    repsPerSet = Number(raw.repsPerSet);
    if (!Number.isFinite(repsPerSet) || repsPerSet < 1 || repsPerSet > 999 || Math.floor(repsPerSet) !== repsPerSet) {
      throw new HttpsError('invalid-argument', `${pfx}.repsPerSet must be an integer 1–999.`);
    }
    repsPerSet = Math.floor(repsPerSet);
  }
  const bilateral = raw.bilateral === true;
  let targetDurationMin;
  if (raw.targetDurationMin !== undefined && raw.targetDurationMin !== null) {
    targetDurationMin = Number(raw.targetDurationMin);
    if (!Number.isFinite(targetDurationMin) || targetDurationMin < 1 || targetDurationMin > 120) {
      throw new HttpsError('invalid-argument', `${pfx}.targetDurationMin must be 1–120.`);
    }
    targetDurationMin = Math.floor(targetDurationMin);
  }
  let targetRpe;
  if (raw.targetRpe !== undefined && raw.targetRpe !== null) {
    targetRpe = Number(raw.targetRpe);
    if (!Number.isFinite(targetRpe) || targetRpe < 1 || targetRpe > 10) {
      throw new HttpsError('invalid-argument', `${pfx}.targetRpe must be 1–10.`);
    }
    targetRpe = Math.round(targetRpe);
  }
  const rawVideoUrl = typeof raw.videoUrl === 'string' ? raw.videoUrl.trim() : '';
  const validVideoUrl =
    rawVideoUrl &&
    (rawVideoUrl.startsWith('http://') || rawVideoUrl.startsWith('https://')) &&
    rawVideoUrl.length <= 2048 ?
      rawVideoUrl :
      undefined;
  const rawCues = typeof raw.cues === 'string' ? raw.cues.trim() : '';
  const validCues = rawCues ? rawCues.slice(0, 2000) : undefined;
  const out = {sets: Math.floor(sets), bilateral};
  if (teamDrillId) out.teamDrillId = teamDrillId.slice(0, 128);
  if (clubDrillId) out.clubDrillId = clubDrillId.slice(0, 128);
  if (legacyDrillId) out.drillId = legacyDrillId.slice(0, 128);
  if (drillTitle) out.drillTitle = drillTitle.slice(0, 200);
  if (repsPerSet !== undefined) out.repsPerSet = repsPerSet;
  if (targetDurationMin !== undefined) out.targetDurationMin = targetDurationMin;
  if (targetRpe !== undefined) out.targetRpe = targetRpe;
  if (validVideoUrl) out.videoUrl = validVideoUrl;
  if (validCues) out.cues = validCues;
  return out;
}

/**
 * PRESCRIPTION-schema — validate and normalize optional coach prescription on deploy.
 * @param {unknown} raw
 * @returns {object|undefined}
 */
function normalizePrescription(raw, requiredXp) {
  if (raw === undefined || raw === null) {
    return applyHighXpCadenceDefault(undefined, requiredXp);
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpsError('invalid-argument', 'prescription must be an object.');
  }
  const drillTitle = typeof raw.drillTitle === 'string' ? raw.drillTitle.trim() : '';
  const teamDrillId = typeof raw.teamDrillId === 'string' ? raw.teamDrillId.trim() : '';
  const clubDrillId = typeof raw.clubDrillId === 'string' ? raw.clubDrillId.trim() : '';
  const legacyDrillId = typeof raw.drillId === 'string' ? raw.drillId.trim() : '';
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
    if (!Number.isFinite(targetDurationMin) || targetDurationMin < 1 || targetDurationMin > 120) {
      throw new HttpsError('invalid-argument', 'prescription.targetDurationMin must be 1–120.');
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
  const rawVideoUrl = typeof raw.videoUrl === 'string' ? raw.videoUrl.trim() : '';
  const validVideoUrl =
    rawVideoUrl &&
    (rawVideoUrl.startsWith('http://') || rawVideoUrl.startsWith('https://')) &&
    rawVideoUrl.length <= 2048 ?
      rawVideoUrl :
      undefined;
  const rawCues = typeof raw.cues === 'string' ? raw.cues.trim() : '';
  const validCues = rawCues ? rawCues.slice(0, 2000) : undefined;
  let cadence;
  if (raw.cadence !== undefined && raw.cadence !== null) {
    if (typeof raw.cadence !== 'object' || Array.isArray(raw.cadence)) {
      throw new HttpsError('invalid-argument', 'prescription.cadence must be an object.');
    }
    const spw = Number(raw.cadence.sessionsPerWindow);
    const wd = Number(raw.cadence.windowDays);
    if (!Number.isFinite(spw) || spw < 1 || spw > 21 || Math.floor(spw) !== spw) {
      throw new HttpsError('invalid-argument', 'prescription.cadence.sessionsPerWindow must be an integer 1–21.');
    }
    if (!Number.isFinite(wd) || wd < 1 || wd > 30 || Math.floor(wd) !== wd) {
      throw new HttpsError('invalid-argument', 'prescription.cadence.windowDays must be an integer 1–30.');
    }
    cadence = {sessionsPerWindow: Math.floor(spw), windowDays: Math.floor(wd)};
  }
  const out = {sets: Math.floor(sets), bilateral};
  if (teamDrillId) out.teamDrillId = teamDrillId.slice(0, 128);
  if (clubDrillId) out.clubDrillId = clubDrillId.slice(0, 128);
  if (legacyDrillId) out.drillId = legacyDrillId.slice(0, 128);
  if (drillTitle) out.drillTitle = drillTitle.slice(0, 200);
  if (repsPerSet !== undefined) out.repsPerSet = repsPerSet;
  if (targetDurationMin !== undefined) out.targetDurationMin = targetDurationMin;
  if (targetRpe !== undefined) out.targetRpe = targetRpe;
  if (validVideoUrl) out.videoUrl = validVideoUrl;
  if (validCues) out.cues = validCues;
  if (cadence) out.cadence = cadence;
  // B4a: optional coach opt-in flag — only emit when strictly true.
  if (raw.requiresParentVerification === true) out.requiresParentVerification = true;
  const benchmarkDrillId =
    typeof raw.benchmarkDrillId === 'string' ? raw.benchmarkDrillId.trim() : '';
  if (benchmarkDrillId) out.benchmarkDrillId = benchmarkDrillId.slice(0, 64);
  if (raw.benchmarkTargetValue !== undefined && raw.benchmarkTargetValue !== null) {
    const targetVal = Number(raw.benchmarkTargetValue);
    if (Number.isFinite(targetVal) && targetVal > 0) {
      out.benchmarkTargetValue = targetVal;
    }
  }
  // B3: validate drills[] bundle entries.
  if (raw.drills !== undefined && raw.drills !== null) {
    if (!Array.isArray(raw.drills)) {
      throw new HttpsError('invalid-argument', 'prescription.drills must be an array.');
    }
    if (raw.drills.length < 1 || raw.drills.length > 8) {
      throw new HttpsError('invalid-argument', 'prescription.drills must have 1–8 entries.');
    }
    out.drills = raw.drills.map((entry, i) => normalizeDrillEntry(entry, i));
  }
  return applyHighXpCadenceDefault(out, requiredXp);
}

/**
 * Resolve coach-selected target (Auth uid or users/{email} doc id) to Firebase Auth uid.
 * Backfills users.uid when missing on legacy parent-provisioned operatives.
 * @param {string} rawTarget
 * @param {FirebaseFirestore.QueryDocumentSnapshot[]} rosterDocs
 * @return {Promise<string|null>}
 */
async function resolveTeamPlayerAuthUid(rawTarget, rosterDocs) {
  const trimmed = typeof rawTarget === 'string' ? rawTarget.trim() : '';
  if (!trimmed) return null;

  const rosterByEmail = new Map(
      rosterDocs.map((d) => [d.id.toLowerCase(), d]),
  );

  if (!trimmed.includes('@')) {
    const byStoredUid = rosterDocs.find((d) => {
      const u = d.data().uid;
      return typeof u === 'string' && u.trim() === trimmed;
    });
    if (byStoredUid) return trimmed;
    return trimmed;
  }

  const userDoc = rosterByEmail.get(trimmed.toLowerCase());
  if (!userDoc) return null;

  const data = userDoc.data() || {};
  const storedUid =
    typeof data.uid === 'string' && data.uid.trim() && !data.uid.includes('@') ?
      data.uid.trim() :
      '';
  if (storedUid) return storedUid;

  try {
    const ur = await admin.auth().getUserByEmail(userDoc.id);
    await userDoc.ref.set({uid: ur.uid}, {merge: true});
    return ur.uid;
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') return null;
    throw e;
  }
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
  const rawTargetUids = scope === 'players' && Array.isArray(data.targetUids)
    ? data.targetUids.filter((u) => typeof u === 'string' && u.trim()).map((u) => u.trim())
    : [];
  let targetUids = rawTargetUids;
  const priority = Number.isFinite(Number(data.priority)) && Number(data.priority) >= 1
    ? Math.floor(Number(data.priority))
    : 100;
  const prescription = normalizePrescription(data.prescription, requiredXp);
  const missionKindRaw = typeof data.missionKind === 'string' ? data.missionKind.trim() : 'standard';
  const missionKind = missionKindRaw === 'benchmark' ? 'benchmark' : 'standard';
  if (missionKind === 'benchmark') {
    const benchmarkId =
      prescription && typeof prescription.benchmarkDrillId === 'string' ?
        prescription.benchmarkDrillId.trim() :
        '';
    if (!benchmarkId) {
      throw new HttpsError('invalid-argument', 'benchmarkDrillId is required for benchmark missions.');
    }
  }

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

  // When scoped to specific players, resolve email keys to Auth uids and verify team membership.
  if (scope === 'players' && rawTargetUids.length > 0) {
    const teamDoc = await db().collection('teams').doc(teamId).get();
    if (!teamDoc.exists) throw new HttpsError('not-found', 'Team not found.');
    const rosterSnap = await db().collection('users').where('teamId', '==', teamId).get();
    const teamPlayerUids = new Set(
        Array.isArray(teamDoc.data()?.playerUids) ?
          teamDoc.data().playerUids.filter((u) => typeof u === 'string' && u.trim()) :
          [],
    );
    const rosterAuthUids = new Set();
    for (const d of rosterSnap.docs) {
      const u = d.data().uid;
      if (typeof u === 'string' && u.trim() && !u.includes('@')) {
        rosterAuthUids.add(u.trim());
      }
    }

    const resolvedUids = [];
    for (const raw of rawTargetUids) {
      const uid = await resolveTeamPlayerAuthUid(raw, rosterSnap.docs);
      if (!uid) {
        throw new HttpsError('failed-precondition', `Could not resolve player target ${raw}.`);
      }
      if (!rosterAuthUids.has(uid) && !teamPlayerUids.has(uid)) {
        const onTeamByEmail = rosterSnap.docs.some(
            (d) => d.id.toLowerCase() === raw.toLowerCase() || d.data().uid === uid,
        );
        if (!onTeamByEmail) {
          throw new HttpsError('failed-precondition', `UID ${uid} is not on team ${teamId}.`);
        }
      }
      resolvedUids.push(uid);
    }
    targetUids = resolvedUids;
  }

  const clientDeployId = typeof data.clientDeployId === 'string'
    ? data.clientDeployId.trim().slice(0, 64)
    : '';
  if (clientDeployId) {
    const dupSnap = await db().collection('team_assignments')
        .where('teamId', '==', teamId)
        .where('tenantId', '==', tenantId)
        .where('assignedByUid', '==', request.auth.uid)
        .where('clientDeployId', '==', clientDeployId)
        .limit(1)
        .get();
    if (!dupSnap.empty && dupSnap.docs.length > 0) {
      const existing = dupSnap.docs[0];
      const existingData = existing.data();
      const existingExpires = existingData.expiresAt;
      const expiresIso = existingExpires && typeof existingExpires.toDate === 'function'
        ? existingExpires.toDate().toISOString()
        : '';
      return {
        intentId: existing.id,
        status: existingData.status || 'active',
        expiresAt: expiresIso,
        targetCount: existingData.scope === 'players'
          ? (Array.isArray(existingData.targetUids) ? existingData.targetUids.length : 0)
          : 0,
      };
    }
  }

  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + durationDays * 86_400_000,
  );

  // Snapshot per-player XP baseline for delta progress/fulfillment since deploy.
  const xpBaselineByUid = await captureXpBaselineForIntent({
    teamId,
    targetAttributeId,
    scope,
    targetUids,
  });

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
    xpBaselineByUid,
    intentVersion: 1,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (prescription) intentPayload.prescription = prescription;
  if (missionKind === 'benchmark') intentPayload.missionKind = 'benchmark';
  if (clientDeployId) intentPayload.clientDeployId = clientDeployId;
  await intentRef.set(intentPayload);

  const auditRow = {
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
  };
  if (clientDeployId) auditRow.clientDeployId = clientDeployId;
  await db().collection('security_audit').add(auditRow);

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

/**
 * B4a — Player submits advisory completion proof for a coach-verified intent.
 * Writes to completion_verifications/{auto} via Admin SDK (CF-only path).
 * ADVISORY: does NOT touch XP, workout_logs, or intent fulfilment — those are
 * already awarded by logTrainingSession before this callable is ever invoked.
 * Returns { verificationId, status: 'pending' }.
 */
exports.submitCompletionProof = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const playerUid = request.auth.uid;
  const data = request.data || {};

  // Validate intentId (required, non-empty string).
  const intentId = typeof data.intentId === 'string' ? data.intentId.trim() : '';
  if (!intentId) {
    throw new HttpsError('invalid-argument', 'intentId is required.');
  }

  // Validate proofNote (optional, string, trim, <= 500 chars).
  let proofNote = null;
  if (data.proofNote !== undefined && data.proofNote !== null) {
    if (typeof data.proofNote !== 'string') {
      throw new HttpsError('invalid-argument', 'proofNote must be a string.');
    }
    const trimmed = data.proofNote.trim();
    if (trimmed.length > 500) {
      throw new HttpsError('invalid-argument', 'proofNote must be 500 characters or fewer.');
    }
    proofNote = trimmed || null;
  }

  // B4c — validate optional mediaStoragePath (COPPA-safe private path).
  // Validation is deferred until after householdId is resolved from the user doc,
  // so the prefix check can include the caller's actual householdId and uid.
  const rawMediaStoragePath =
    data.mediaStoragePath !== undefined && data.mediaStoragePath !== null
      ? data.mediaStoragePath
      : null;

  // Resolve player context from users/{email} doc (Admin SDK).
  // Caller must be a player — their email is on the Auth token.
  const playerEmail = typeof request.auth.token.email === 'string'
    ? request.auth.token.email.toLowerCase().trim()
    : '';
  if (!playerEmail) {
    throw new HttpsError('failed-precondition', 'Player email required for proof submission.');
  }
  const userKey = playerEmail;

  const userSnap = await db().collection('users').doc(userKey).get();
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'Player profile not found.');
  }
  const userDoc = userSnap.data() || {};
  const householdId = typeof userDoc.householdId === 'string' ? userDoc.householdId.trim() : '';
  const clubId = typeof userDoc.clubId === 'string' ? userDoc.clubId.trim()
    : typeof userDoc.tenantId === 'string' ? userDoc.tenantId.trim() : '';
  const teamId = typeof userDoc.teamId === 'string' ? userDoc.teamId.trim() : '';

  // B4c — validate mediaStoragePath now that householdId + playerUid are known.
  // Path must be: households/{callerHouseholdId}/proof_media/{callerUid}/<anything>
  // Reject cross-household / cross-user paths with permission-denied.
  let mediaStoragePath = null;
  if (rawMediaStoragePath !== null) {
    if (typeof rawMediaStoragePath !== 'string') {
      throw new HttpsError('invalid-argument', 'mediaStoragePath must be a string.');
    }
    if (rawMediaStoragePath.length > 512) {
      throw new HttpsError('invalid-argument', 'mediaStoragePath must be 512 characters or fewer.');
    }
    const expectedPrefix = `households/${householdId}/proof_media/${playerUid}/`;
    if (!rawMediaStoragePath.startsWith(expectedPrefix)) {
      throw new HttpsError(
          'permission-denied',
          'mediaStoragePath must be within your own household proof_media folder.',
      );
    }
    mediaStoragePath = rawMediaStoragePath;
  }

  // Create completion_verifications/{auto} — Admin SDK write only.
  const ref = await db().collection('completion_verifications').add({
    playerUid,
    userKey,
    playerEmail,
    householdId: householdId || null,
    clubId: clubId || null,
    teamId: teamId || null,
    intentId,
    proofNote,
    mediaStoragePath,
    mediaApproved: false,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {verificationId: ref.id, status: 'pending'};
});

/**
 * B4b — Parent reviews an advisory completion proof for their household child.
 * ADVISORY: does NOT touch player XP, training logs, or intent fulfilment.
 * Only transitions completion_verifications/{vId}.status: 'pending' → 'approved'|'rejected'.
 * Caller must be authenticated PARENT. Household membership is verified via Firestore.
 * Returns { verificationId, status: decision }.
 */
exports.parentReviewCompletionProof = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  // 1. Require authenticated parent role (throws unauthenticated / permission-denied if not).
  const parent = await assertParentAsync(request);

  // 2. Validate inputs.
  const data = request.data || {};

  const verificationId = typeof data.verificationId === 'string' ? data.verificationId.trim() : '';
  if (!verificationId) {
    throw new HttpsError('invalid-argument', 'verificationId is required.');
  }

  const decision = typeof data.decision === 'string' ? data.decision.trim() : '';
  if (decision !== 'approved' && decision !== 'rejected') {
    throw new HttpsError('invalid-argument', "decision must be 'approved' or 'rejected'.");
  }

  // 3. Load the verification record via Admin SDK.
  const cvRef = db().collection('completion_verifications').doc(verificationId);
  const cvSnap = await cvRef.get();
  if (!cvSnap.exists) {
    throw new HttpsError('not-found', 'Completion verification record not found.');
  }
  const cv = cvSnap.data() || {};

  // 4. Verify household membership: the record's userKey must be in the parent's
  //    household.playerEmails (mirrors parentGrantVpcConsent membership check).
  const hSnap = await db().collection('households').doc(parent.householdId).get();
  if (!hSnap.exists) {
    throw new HttpsError('failed-precondition', 'Parent household not found.');
  }
  const h = hSnap.data() || {};

  const playerSet = new Set(
      (h.playerEmails || []).map((e) => normEmail(String(e))).filter(Boolean),
  );
  const recordUserKey = typeof cv.userKey === 'string' ? normEmail(cv.userKey) : '';
  if (!recordUserKey || !playerSet.has(recordUserKey)) {
    throw new HttpsError(
        'permission-denied',
        'This completion record does not belong to a player in your household.',
    );
  }

  // 5. Only allow transition from 'pending' — reject re-review of already-decided records.
  if (cv.status !== 'pending') {
    throw new HttpsError(
        'failed-precondition',
        `This record has already been reviewed (status: ${cv.status}).`,
    );
  }

  // 6. Update: status + reviewer metadata + B4c mediaApproved flag.
  // DO NOT touch XP, training logs, or fulfillment — stays advisory.
  // mediaApproved: true only on 'approved'; false on 'rejected' (harmless when no media).
  await cvRef.update({
    status: decision,
    reviewedByUid: request.auth.uid,
    reviewedByEmail: parent.email,
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    mediaApproved: decision === 'approved',
  });

  return {verificationId, status: decision};
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
 * Count intent-scoped sessions inside a rolling cadence window.
 * When intentId is set, only drill_completions tagged with that intentId count.
 * @param {string} uid
 * @param {string} attributeId
 * @param {string|undefined} intentId
 * @param {number} windowDays
 * @returns {Promise<number>}
 */
async function countCadenceSessionsForIntent(uid, attributeId, intentId, windowDays) {
  const windowStart = admin.firestore.Timestamp.fromMillis(
      Date.now() - windowDays * 86_400_000,
  );
  const snap = await db()
      .collection('drill_completions')
      .where('playerUid', '==', uid)
      .where('loggedAt', '>=', windowStart)
      .get();
  const scopeIntent = typeof intentId === 'string' ? intentId.trim() : '';
  const distinctDays = new Set();
  for (const d of snap.docs) {
    const row = d.data();
    if (row.attributeId !== attributeId) continue;
    if (scopeIntent) {
      const rowIntent = typeof row.intentId === 'string' ? row.intentId.trim() : '';
      if (rowIntent !== scopeIntent) continue;
    }
    const loggedAt = row.loggedAt;
    const ms =
      loggedAt && typeof loggedAt.toMillis === 'function' ?
        loggedAt.toMillis() :
        typeof loggedAt?.seconds === 'number' ?
          loggedAt.seconds * 1000 :
          0;
    if (ms > 0) {
      distinctDays.add(new Date(ms).toISOString().slice(0, 10));
    }
  }
  return distinctDays.size;
}

/**
 * Team-scope intent completion: auth uids only (no email doc-id fallback).
 * @param {Array<{ id: string, data: () => Record<string, unknown> }>} docs
 * @return {string[]}
 */
function rosterAuthUidsFromUserDocs(docs) {
  const uids = new Set();
  for (const d of docs) {
    const raw = d.data().uid;
    if (typeof raw !== 'string') continue;
    const uid = raw.trim();
    if (!uid || uid.includes('@')) continue;
    uids.add(uid);
  }
  return [...uids];
}

/**
 * Snapshot xpByAttribute[targetAttributeId] for in-scope roster players at deploy.
 * Keys by auth uid and users/{email} doc id so Forge roster rows resolve either way.
 * @param {{ teamId: string, targetAttributeId: string, scope: string, targetUids: string[] }} input
 */
async function captureXpBaselineForIntent(input) {
  const {teamId, targetAttributeId, scope, targetUids} = input;
  const rosterSnap = await db().collection('users').where('teamId', '==', teamId).get();
  const playerDocs = rosterSnap.docs.filter((d) => d.data().role === 'player');
  const inScopeAuthUids = scope === 'players'
    ? new Set(targetUids)
    : new Set(rosterAuthUidsFromUserDocs(playerDocs));
  const xpBaselineByUid = {};

  const writeBaselineKeys = (keys, xp) => {
    for (const key of keys) {
      if (key) xpBaselineByUid[key] = xp;
    }
  };

  for (const d of playerDocs) {
    const data = d.data();
    const authUid =
      typeof data.uid === 'string' && data.uid.trim() && !data.uid.includes('@') ?
        data.uid.trim() :
        '';
    const inScope =
      scope === 'team' ?
        true :
        (authUid && inScopeAuthUids.has(authUid));
    if (!inScope) continue;
    const xp = Number(data.xpByAttribute?.[targetAttributeId] ?? 0);
    writeBaselineKeys([authUid, d.id.includes('@') ? d.id : ''], xp);
  }

  for (const uid of inScopeAuthUids) {
    if (xpBaselineByUid[uid] !== undefined) continue;
    const q = await db().collection('users').where('uid', '==', uid).limit(3).get();
    if (q.empty) {
      xpBaselineByUid[uid] = 0;
      continue;
    }
    for (const d of q.docs) {
      const xp = Number(d.data().xpByAttribute?.[targetAttributeId] ?? 0);
      const authUid =
        typeof d.data().uid === 'string' && d.data().uid.trim() && !d.data().uid.includes('@') ?
          d.data().uid.trim() :
          uid;
      writeBaselineKeys([authUid, d.id.includes('@') ? d.id : ''], xp);
    }
  }

  return xpBaselineByUid;
}

exports.captureXpBaselineForIntent = captureXpBaselineForIntent;

/** XP earned since deploy baseline — mirrored from client intentProgress.ts */
function computeIntentEarnedXp(currentXp, baselineXp) {
  return Math.max(0, Number(currentXp) - Number(baselineXp || 0));
}

/** Whether earned XP meets intent requirement — mirrored from client intentProgress.ts */
function intentXpFulfilled(earned, requiredXp) {
  return requiredXp > 0 && earned >= requiredXp;
}

exports.rosterAuthUidsFromUserDocs = rosterAuthUidsFromUserDocs;
exports.computeIntentEarnedXp = computeIntentEarnedXp;
exports.intentXpFulfilled = intentXpFulfilled;

/**
 * When XP + cadence (if any) are met, append uid to fulfilledByUids.
 * @param {{
 *   uid: string,
 *   teamId: string,
 *   xpByAttribute: Record<string, number>,
 *   attributeFilter?: string[],
 * }} input
 */
async function tryFulfillActiveIntentsForPlayer(input) {
  const {uid, teamId, xpByAttribute} = input;
  const attrFilter = input.attributeFilter;
  if (!uid || !teamId) return;

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
    if (!attrId) continue;
    if (attrFilter && !attrFilter.includes(attrId)) continue;

    const scope = intent.scope || 'team';
    const targetUids = Array.isArray(intent.targetUids) ? intent.targetUids : [];
    const inScope = scope === 'team' || targetUids.includes(uid);
    if (!inScope) continue;

    const requiredXp = Number(intent.requiredXp) || 0;
    const playerXp = Number(xpByAttribute[attrId] || 0);
    const baselineXp = Number(intent.xpBaselineByUid?.[uid] ?? 0);
    const earnedXp = computeIntentEarnedXp(playerXp, baselineXp);
    if (!intentXpFulfilled(earnedXp, requiredXp)) continue;

    const cadence = cadenceFromIntentPrescription(intent.prescription) ||
      (requiredXp >= HIGH_XP_CADENCE_THRESHOLD ? {...DEFAULT_HIGH_XP_CADENCE} : undefined);
    if (cadence) {
      const sessionCount = await countCadenceSessionsForIntent(
          uid,
          attrId,
          intentDoc.id,
          cadence.windowDays,
      );
      if (sessionCount < cadence.sessionsPerWindow) continue;
    }

    const alreadyFulfilled = Array.isArray(intent.fulfilledByUids) &&
      intent.fulfilledByUids.includes(uid);
    if (alreadyFulfilled) continue;

    const newFulfilled = [...(intent.fulfilledByUids || []), uid];

    let intentComplete = false;
    if (scope === 'team') {
      const rosterSnap = await db()
          .collection('users')
          .where('teamId', '==', teamId)
          .where('role', '==', 'player')
          .get();
      const rosterUids = rosterAuthUidsFromUserDocs(rosterSnap.docs);
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
}

exports.tryFulfillActiveIntentsForPlayer = tryFulfillActiveIntentsForPlayer;

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

        await tryFulfillActiveIntentsForPlayer({
          uid,
          teamId,
          xpByAttribute: xpAfter,
          attributeFilter: changedAttrs,
        });
      } catch (e) {
        logger.error('[onUserXpUpdateIntentLifecycle] error:', e);
      }
    },
);

/**
 * B2 cadence: when a drill completion lands, re-check intents whose XP threshold
 * was already met but session count was not (e.g. final session of N).
 */
exports.onDrillCompletionIntentLifecycle = onDocumentCreated(
    {
      document: 'drill_completions/{recordId}',
      region: REGION,
    },
    async (event) => {
      try {
        const data = event.data && event.data.data ? event.data.data() : null;
        if (!data) return;

        const uid = typeof data.playerUid === 'string' ? data.playerUid.trim() : '';
        const userKey = typeof data.userKey === 'string' ? data.userKey.trim().toLowerCase() : '';
        const attributeId = typeof data.attributeId === 'string' ? data.attributeId.trim() : '';
        if (!uid || !userKey || !attributeId) return;

        const userSnap = await db().collection('users').doc(userKey).get();
        if (!userSnap.exists) return;
        const user = userSnap.data() || {};
        const teamId = typeof user.teamId === 'string' ? user.teamId.trim() : '';
        if (!teamId) return;

        const xpByAttribute = user.xpByAttribute && typeof user.xpByAttribute === 'object' ?
          user.xpByAttribute :
          {};

        await tryFulfillActiveIntentsForPlayer({
          uid,
          teamId,
          xpByAttribute,
          attributeFilter: [attributeId],
        });
      } catch (e) {
        logger.error('[onDrillCompletionIntentLifecycle] error:', e);
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
