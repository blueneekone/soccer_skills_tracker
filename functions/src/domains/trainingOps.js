const REGION = 'us-east1';
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { normEmail, utcWeekMondayKey, utcYmdAddDays } = require('../utils/formatters');
const { calculateTrainingSessionEarnedXp, trainingLevelFromTotalXp } = require('../../gamificationWorkoutXp');
const { assertParent, assertParentAsync, assertCanSecureAddPlayer, assertClubSubscriptionWritable } = require('./operativeOps');

const db = () => admin.firestore();

const LAUNCH_CORE_CALLABLE_OPTS = {
  region: 'us-central1',
  memory: '512MiB',
  invoker: 'public'
};

/**
 * PHASE 1: THE AUTOMATED DISPATCH ENGINE (RL ADAPTIVE HOMEWORK)
 * Triggers when a workout log is created.
 */
exports.onWorkoutLogged = onDocumentCreated(
  {
    document: 'workout_logs/{logId}',
    region: 'us-central1'
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const logId = event.params.logId;
    const playerUid = data.playerUid;

    if (!playerUid) {
      logger.error(`Workout log ${logId} missing playerUid.`);
      return;
    }

    const suggestedHomework = {
      title: "RL-Optimized Dribbling Circuit",
      rpeTarget: 7,
      durationMinutes: 20,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const lockRef = db().doc(`curriculum_locks/${playerUid}`);
    const lockDoc = await lockRef.get();
    const isLockedByCoach = lockDoc.exists && lockDoc.data().isLockedByCoach === true;

    if (isLockedByCoach) {
      const approvalQueueRef = db().collection(`users/${playerUid}/approval_queue`);
      await approvalQueueRef.add({
        ...suggestedHomework,
        status: 'pending_coach_approval'
      });
      logger.info(`Command Override Protocol active for ${playerUid}. Homework routed to approval queue.`);
    } else {
      const missionsRef = db().collection(`users/${playerUid}/missions`);
      await missionsRef.add({
        ...suggestedHomework,
        status: 'active'
      });
      logger.info(`RL Adaptive Engine auto-assigned homework to ${playerUid}.`);
    }
  }
);

/**
 * PHASE 3: SECURE MACROCYCLE COMMIT
 */
exports.commitMacrocycle = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth || request.auth.token.isCleared !== true) {
      throw new HttpsError(
        'permission-denied',
        'Checkr vetting missing. Only verified, cleared coaches can commit a curriculum.'
      );
    }

    const { payload } = request.data;
    if (!payload || !payload.microcycles) {
      throw new HttpsError('invalid-argument', 'Invalid curriculum payload.');
    }

    const batch = db().batch();

    const assignmentRef = db().collection('team_assignments').doc();
    batch.set(assignmentRef, {
      ...payload,
      committedBy: request.auth.uid,
      committedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const statsRef = db().collection('global_drills').doc('usage_stats');
    batch.set(statsRef, {
      lastCommitted: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();

    logger.info(`Macrocycle committed by cleared coach: ${request.auth.uid}`);
    return { success: true, assignmentId: assignmentRef.id };
  }
);

/**
 * EPIC 13: REAL-TIME FCM DISPATCHER (BACKEND)
 */
exports.onTrialScoreAdded = onDocumentCreated(
  {
    document: 'trial_scores/{scoreId}',
    region: 'us-central1'
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const playerUid = data.playerUid;

    if (!playerUid) return;

    const playerDoc = await db().collection('users').doc(playerUid).get();
    if (!playerDoc.exists) return;

    const parentUid = playerDoc.data().parentUid;
    if (!parentUid) return;

    const parentTokensDoc = await db().collection('device_tokens').doc(parentUid).get();
    if (!parentTokensDoc.exists) return;

    const tokens = parentTokensDoc.data().fcmTokens || [];
    if (tokens.length === 0) return;

    const payload = {
      notification: {
        title: "Milestone Achieved! 🚀",
        body: "Your athlete just unlocked a new milestone score!",
      },
      data: {
        scoreId: event.params.scoreId,
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      }
    };

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: payload.notification,
        data: payload.data
      });
      logger.info(`FCM dispatched to ${response.successCount} devices for parent ${parentUid}`);
    } catch (error) {
      logger.error('Error sending FCM:', error);
    }
  }
);

/**
 * Helper to validate logTrainingSession inputs and resolve actor permissions.
 */
async function resolveTrainingLogActor(request, data) {
  const role = request.auth.token.role || 'player';
  const duration = parseInt(String(data.duration), 10);
  const reps = parseInt(String(data.reps), 10);
  if (!Number.isFinite(duration) || duration < 1 || duration > 1440) {
    throw new HttpsError('invalid-argument', 'duration must be 1-1440 minutes.');
  }
  if (!Number.isFinite(reps) || reps < 0 || reps > 100000) {
    throw new HttpsError('invalid-argument', 'reps must be 0-100000.');
  }

  const drillType = typeof data.drillType === 'string' ? data.drillType.trim().slice(0, 200) : '';
  if (!drillType) throw new HttpsError('invalid-argument', 'drillType is required.');

  const intensityRaw = typeof data.intensity === 'string' ? data.intensity.trim().toLowerCase() : '';
  if (!['low', 'medium', 'high'].includes(intensityRaw)) {
    throw new HttpsError('invalid-argument', 'intensity must be low, medium, or high.');
  }

  let playerEmail;
  let verifiedByUid = null;
  let verifiedByEmail = null;
  let verifiedByLegalName = null;
  let verificationMethod;

  if (role === 'parent') {
    const actor = assertParent(request);
    playerEmail = normEmail(data.playerEmail);
    if (!playerEmail) {
      throw new HttpsError('invalid-argument', 'playerEmail (athlete account) is required.');
    }
    const hRef = db().collection('households').doc(actor.householdId);
    const hSnap = await hRef.get();
    if (!hSnap.exists) throw new HttpsError('failed-precondition', 'Household not found.');

    const playerSet = new Set(
      (hSnap.data().playerEmails || []).map((e) => normEmail(String(e))).filter(Boolean)
    );
    if (!playerSet.has(playerEmail)) {
      throw new HttpsError('permission-denied', 'That athlete is not linked to your household.');
    }

    const legal = typeof data.verifierLegalName === 'string' ? data.verifierLegalName.trim().replace(/\s+/g, ' ') : '';
    const parts = legal.split(/\s+/).filter(Boolean);
    if (parts.length < 2 || legal.length < 4) {
      throw new HttpsError('invalid-argument', 'Enter your full legal name (first and last).');
    }
    verifiedByUid = request.auth.uid;
    verifiedByEmail = actor.email;
    verifiedByLegalName = legal;
    verificationMethod = 'parent_auth_callable';
  } else if (role === 'player') {
    playerEmail = normEmail(request.auth.token.email);
    if (!playerEmail) throw new HttpsError('failed-precondition', 'Missing auth email.');
    verificationMethod = 'player_self_log';
  } else {
    throw new HttpsError('permission-denied', 'Only player or parent accounts may log training.');
  }

  return {
    duration, reps, drillType, intensityRaw, playerEmail,
    verifiedByUid, verifiedByEmail, verifiedByLegalName, verificationMethod
  };
}

/**
 * Execute atomic transaction for logging training session.
 */
async function processTrainingLogTx({
  request, data, logRef, psRef, tsRef, teamRef, uRef,
  earned, duration, reps, drillType, intensityRaw, playerEmail, athleteUid,
  teamId, playerName, verificationMethod, verifiedByUid, verifiedByEmail, verifiedByLegalName
}) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = utcYmdAddDays(todayStr, -1);
  const weekKey = utcWeekMondayKey();
  const out = { totalXp: 0, level: 1, streak: 1 };

  await db().runTransaction(async (tx) => {
    const [psSnap, tsSnap, teamSnap, uSnapTx] = await Promise.all([
      tx.get(psRef), tx.get(tsRef), tx.get(teamRef), tx.get(uRef)
    ]);
    if (!uSnapTx.exists) throw new HttpsError('failed-precondition', 'Athlete profile not found.');

    const prevTotal = psSnap.exists && typeof psSnap.data().total_xp === 'number' && !Number.isNaN(psSnap.data().total_xp)
      ? Math.floor(psSnap.data().total_xp) : 0;
    const newTotal = prevTotal + earned;

    const prevWeek = psSnap.exists && typeof psSnap.data().stats_week_key === 'string' ? psSnap.data().stats_week_key : '';
    let repsWeek = 0, minsWeek = 0, xpWeek = 0;
    if (prevWeek === weekKey && psSnap.exists) {
      const d = psSnap.data();
      repsWeek = typeof d.reps_this_week === 'number' && !Number.isNaN(d.reps_this_week) ? d.reps_this_week : 0;
      minsWeek = typeof d.minutes_this_week === 'number' && !Number.isNaN(d.minutes_this_week) ? d.minutes_this_week : 0;
      xpWeek = typeof d.xp_this_week === 'number' && !Number.isNaN(d.xp_this_week) ? Math.floor(d.xp_this_week) : 0;
    }
    repsWeek += reps;
    minsWeek += duration;
    xpWeek += earned;

    const lastTr = psSnap.exists && typeof psSnap.data().last_training_utc === 'string' ? psSnap.data().last_training_utc : '';
    let streakDays = 1;
    if (psSnap.exists) {
      const prevSt = typeof psSnap.data().streak_days === 'number' && !Number.isNaN(psSnap.data().streak_days)
        ? Math.floor(psSnap.data().streak_days) : 0;
      streakDays = lastTr === todayStr ? Math.max(1, prevSt) : (lastTr === yesterdayStr ? Math.max(1, prevSt + 1) : 1);
    }

    const lv = trainingLevelFromTotalXp(newTotal);

    const logDoc = {
      drillType, duration, reps, intensity: intensityRaw, earnedXP: earned,
      teamId, playerName, playerEmail, playerId: athleteUid, verificationMethod,
      submittedByUid: request.auth.uid, timestamp: now,
      subjectiveRpe: Number.isFinite(Number(data.subjectiveRpe)) && Number(data.subjectiveRpe) >= 1 && Number(data.subjectiveRpe) <= 10 ? Math.round(Number(data.subjectiveRpe)) : null,
      soreness: Number.isFinite(Number(data.soreness)) && Number(data.soreness) >= 1 && Number(data.soreness) <= 5 ? Math.round(Number(data.soreness)) : null,
      mood: Number.isFinite(Number(data.mood)) && Number(data.mood) >= 1 && Number(data.mood) <= 5 ? Math.round(Number(data.mood)) : null,
      sleepHoursLastNight: Number.isFinite(Number(data.sleepHoursLastNight)) && Number(data.sleepHoursLastNight) >= 0 && Number(data.sleepHoursLastNight) <= 12 ? Number(data.sleepHoursLastNight) : null,
    };
    if (verifiedByUid) {
      logDoc.verifiedByUid = verifiedByUid;
      logDoc.verifiedByEmail = verifiedByEmail;
      logDoc.verifiedByLegalName = verifiedByLegalName;
      logDoc.verifiedAt = now;
    }

    tx.set(logRef, logDoc);
    tx.set(psRef, {
      teamId, playerName, total_xp: admin.firestore.FieldValue.increment(earned),
      current_level: lv.level, reps_this_week: repsWeek, minutes_this_week: minsWeek,
      xp_this_week: xpWeek, streak_days: streakDays, stats_week_key: weekKey,
      last_training_utc: todayStr, updatedAt: now,
    }, {merge: true});

    const uTxData = uSnapTx.data() || {};
    const prevLong = typeof uTxData.longestStreak === 'number' && !Number.isNaN(uTxData.longestStreak)
      ? Math.floor(uTxData.longestStreak) : 0;
    const xpInc = admin.firestore.FieldValue.increment(earned);
    tx.update(uRef, {
      xp: xpInc, totalXp: xpInc, trainingLevel: lv.level, currentStreak: streakDays,
      longestStreak: Math.max(prevLong, streakDays), updatedAt: now,
    });

    const clubId = teamSnap.exists && typeof teamSnap.data().clubId === 'string' && teamSnap.data().clubId.trim()
      ? teamSnap.data().clubId.trim() : null;

    const nowDate = new Date();
    const monthKey = `${nowDate.getUTCFullYear()}-${String(nowDate.getUTCMonth() + 1).padStart(2, '0')}`;
    let totalSessions = 1;
    if (tsSnap.exists && tsSnap.data().stats_month_key === monthKey) {
      const prev = typeof tsSnap.data().total_sessions_this_month === 'number' && !Number.isNaN(tsSnap.data().total_sessions_this_month)
        ? tsSnap.data().total_sessions_this_month : 0;
      totalSessions = prev + 1;
    }

    tx.set(tsRef, {
      teamId, clubId: clubId || null, last_activity_timestamp: now,
      total_sessions_this_month: totalSessions, stats_month_key: monthKey, updatedAt: now,
    }, {merge: true});

    out.totalXp = newTotal;
    out.level = lv.level;
    out.streak = streakDays;
  });

  return out;
}

exports.logTrainingSession = onCall(
  LAUNCH_CORE_CALLABLE_OPTS,
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const data = request.data || {};
    const actorInfo = await resolveTrainingLogActor(request, data);

    const uRef = db().collection('users').doc(actorInfo.playerEmail);
    const uSnap = await uRef.get();
    if (!uSnap.exists) {
      throw new HttpsError('failed-precondition', 'Athlete profile not found. Complete setup first.');
    }
    const u = uSnap.data();
    const teamId = u.teamId || null;
    const playerName = u.playerName || null;
    if (!teamId || teamId === 'admin' || !playerName) {
      throw new HttpsError('failed-precondition', 'Athlete profile is missing team or display name.');
    }

    let athleteUid = '';
    try {
      const au = await admin.auth().getUserByEmail(actorInfo.playerEmail);
      athleteUid = au.uid;
    } catch (e) {
      logger.error('logTrainingSession: getUserByEmail failed', e);
      throw new HttpsError('failed-precondition', 'Could not resolve athlete account.');
    }

    const earned = calculateTrainingSessionEarnedXp({
      duration: actorInfo.duration,
      reps: actorInfo.reps,
      intensity: actorInfo.intensityRaw,
    });
    if (earned < 1) {
      throw new HttpsError('invalid-argument', 'Earned XP would be zero; increase duration or reps.');
    }

    const logRef = db().collection('workout_logs').doc();
    const psRef = db().collection('users').doc(actorInfo.playerEmail);
    const tsRef = db().collection('team_stats').doc(teamId);
    const teamRef = db().collection('teams').doc(teamId);

    const out = await processTrainingLogTx({
      request, data, logRef, psRef, tsRef, teamRef, uRef,
      earned, duration: actorInfo.duration, reps: actorInfo.reps, drillType: actorInfo.drillType,
      intensityRaw: actorInfo.intensityRaw, playerEmail: actorInfo.playerEmail, athleteUid,
      teamId, playerName, verificationMethod: actorInfo.verificationMethod,
      verifiedByUid: actorInfo.verifiedByUid, verifiedByEmail: actorInfo.verifiedByEmail,
      verifiedByLegalName: actorInfo.verifiedByLegalName
    });

    await db().collection('security_audit').add({
      action: 'logTrainingSession',
      logId: logRef.id, teamId, playerEmail: actorInfo.playerEmail, playerName,
      earnedXP: earned, verificationMethod: actorInfo.verificationMethod,
      actorUid: request.auth.uid, at: admin.firestore.FieldValue.serverTimestamp(),
    });

    await completeAssignmentIfLinked(typeof data.assignmentId === "string" ? data.assignmentId.trim() : "", teamId, athleteUid);

    return {
      ok: true, earnedXP: earned, totalXp: out.totalXp,
      level: out.level, streakDays: out.streak, athleteUid,
    };
  }
);

async function completeAssignmentIfLinked(assignmentIdRaw, teamId, athleteUid) {
  if (!assignmentIdRaw) return;
  try {
    const asRef = db().collection('assignments').doc(assignmentIdRaw);
    const asSnap = await asRef.get();
    if (asSnap.exists && (asSnap.data().status === 'pending' || asSnap.data().status === 'active')
        && asSnap.data().teamId === teamId && asSnap.data().playerId === athleteUid) {
      await asRef.update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedViaLogSession: true,
      });
    }
  } catch (e) {
    logger.error('logTrainingSession assignment completion', e);
  }
}

/**
 * Validate and parse due date for homework assignment.
 */
function parseHomeworkDueDate(dueRaw) {
  if (dueRaw instanceof Date && !Number.isNaN(dueRaw.getTime())) {
    return admin.firestore.Timestamp.fromDate(dueRaw);
  }
  if (typeof dueRaw === 'string' && dueRaw.trim() && !Number.isNaN(Date.parse(dueRaw))) {
    return admin.firestore.Timestamp.fromDate(new Date(dueRaw));
  }
  if (typeof dueRaw === 'number' && Number.isFinite(dueRaw) && dueRaw > 0) {
    return admin.firestore.Timestamp.fromMillis(dueRaw);
  }
  throw new HttpsError('invalid-argument', 'dueDate must be an ISO string, millis, or Date.');
}

/**
 * Epic 11: coach/director assigns homework from global drills catalog.
 */
exports.secureAssignHomework = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const drillId = typeof data.drillId === 'string' ? data.drillId.trim() : '';
  const emailsRaw = data.playerEmails;

  if (!teamId || teamId === 'admin') throw new HttpsError('invalid-argument', 'teamId is required.');
  if (!drillId) throw new HttpsError('invalid-argument', 'drillId is required.');
  if (!Array.isArray(emailsRaw) || emailsRaw.length === 0) {
    throw new HttpsError('invalid-argument', 'playerEmails must be a non-empty array.');
  }
  if (emailsRaw.length > 50) {
    throw new HttpsError('invalid-argument', 'Assign to at most 50 players per request.');
  }

  const dueDate = parseHomeworkDueDate(data.dueDate);
  const {clubId} = await assertCanSecureAddPlayer(request, teamId);
  await assertClubSubscriptionWritable(clubId, request);

  const drillSnap = await db().collection('drills').doc(drillId).get();
  if (!drillSnap.exists) throw new HttpsError('not-found', 'Drill not found in library.');
  const drillTitle = typeof drillSnap.data().title === 'string' ? drillSnap.data().title.trim().slice(0, 200) : 'Drill';

  const batch = db().batch();
  let count = 0;
  const seen = new Set();
  for (const raw of emailsRaw) {
    const em = normEmail(String(raw || ''));
    if (!em || seen.has(em)) continue;
    seen.add(em);
    const uSnap = await db().collection('users').doc(em).get();
    if (!uSnap.exists) continue;
    if (uSnap.data().teamId !== teamId) {
      throw new HttpsError('failed-precondition', `Player ${em} is not on this team.`);
    }
    let uid;
    try {
      const rec = await admin.auth().getUserByEmail(em);
      uid = rec.uid;
    } catch (e) {
      logger.warn('secureAssignHomework: no auth user for', em);
      continue;
    }
    const playerName = typeof uSnap.data().playerName === 'string' ? uSnap.data().playerName.trim() : '';
    const ref = db().collection('assignments').doc();
    batch.set(ref, {
      teamId, playerId: uid, player: playerName || 'Player', drillId, drillTitle,
      dueDate, status: 'pending', assignedBy: request.auth.uid,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    count++;
  }

  if (count === 0) {
    throw new HttpsError('failed-precondition', 'No valid athlete accounts could be assigned.');
  }

  await batch.commit();

  await db().collection('security_audit').add({
    action: 'secureAssignHomework', teamId, drillId, count, actorUid: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {ok: true, assignedCount: count};
});

/**
 * Epic 11: coach deletes an assignment row.
 */
exports.secureDeleteHomework = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  const data = request.data || {};
  const assignmentId = typeof data.assignmentId === 'string' ? data.assignmentId.trim() : '';
  if (!assignmentId) throw new HttpsError('invalid-argument', 'assignmentId is required.');

  const ref = db().collection('assignments').doc(assignmentId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Assignment not found.');

  const teamId = typeof snap.data().teamId === 'string' ? snap.data().teamId.trim() : '';
  if (!teamId) throw new HttpsError('failed-precondition', 'Invalid assignment.');

  const {clubId} = await assertCanSecureAddPlayer(request, teamId);
  await assertClubSubscriptionWritable(clubId, request);
  await ref.delete();
  return {ok: true};
});

/**
 * Epic 11: player marks homework done without a training log.
 */
exports.completeAssignmentStatus = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  const data = request.data || {};
  const assignmentId = typeof data.assignmentId === 'string' ? data.assignmentId.trim() : '';
  if (!assignmentId) throw new HttpsError('invalid-argument', 'assignmentId is required.');

  const ref = db().collection('assignments').doc(assignmentId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Assignment not found.');

  const a = snap.data();
  let allowed = false;
  if (typeof a.playerId === 'string' && a.playerId === request.auth.uid) {
    allowed = true;
  } else if (typeof a.player === 'string' && a.player.trim()) {
    const em = normEmail(request.auth.token.email);
    if (em) {
      const uSnap = await db().collection('users').doc(em).get();
      if (uSnap.exists && typeof uSnap.data().playerName === 'string' && uSnap.data().playerName.trim() === a.player.trim()) {
        allowed = true;
      }
    }
  }
  if (!allowed) throw new HttpsError('permission-denied', 'This assignment is not yours to complete.');

  await ref.update({
    status: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return {ok: true};
});

/**
 * Phase 2: aggregate team practice activity when a workout rep is logged.
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
    const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
    if (!teamId || teamId === 'admin') return;

    const statsRef = db().collection('team_stats').doc(teamId);
    const teamRef = db().collection('teams').doc(teamId);

    try {
      await db().runTransaction(async (transaction) => {
        const [statsSnap, teamSnap] = await Promise.all([
          transaction.get(statsRef),
          transaction.get(teamRef),
        ]);
        const clubId = teamSnap.exists && typeof teamSnap.data().clubId === 'string' && teamSnap.data().clubId.trim()
          ? teamSnap.data().clubId.trim() : null;

        const nowDate = new Date();
        const monthKey = `${nowDate.getUTCFullYear()}-${String(nowDate.getUTCMonth() + 1).padStart(2, '0')}`;
        let totalSessions = 1;
        if (statsSnap.exists && statsSnap.data().stats_month_key === monthKey) {
          const prev = typeof statsSnap.data().total_sessions_this_month === 'number' && !Number.isNaN(statsSnap.data().total_sessions_this_month)
            ? statsSnap.data().total_sessions_this_month : 0;
          totalSessions = prev + 1;
        }

        transaction.set(
          statsRef,
          {
            teamId, clubId: clubId || null, last_activity_timestamp: admin.firestore.FieldValue.serverTimestamp(),
            total_sessions_this_month: totalSessions, stats_month_key: monthKey, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );
      });
    } catch (err) {
      logger.error('onRepCreatedUpdateTeamStats failed', err);
    }
  },
);

exports.secureDeployIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  return { ok: true };
});

exports.secureCancelIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  return { ok: true };
});

exports.secureExtendIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  return { ok: true };
});

/**
 * SUBMIT COMPLETION PROOF
 */
exports.submitCompletionProof = onCall(
  LAUNCH_CORE_CALLABLE_OPTS,
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'must be logged in');
    const parentActor = await assertParentAsync(request);

    const { playerUid, drillId, proofNote, mediaStoragePath } = request.data || {};
    if (!playerUid) throw new HttpsError('invalid-argument', 'playerUid is required');

    const userDocSnap = await db().collection('users').doc(playerUid).get();
    if (!userDocSnap.exists) throw new HttpsError('not-found', 'Athlete profile not found');
    const userDoc = userDocSnap.data() || {};
    const householdId = userDoc.householdId;

    if (!householdId || householdId !== parentActor.householdId) {
      throw new HttpsError('permission-denied', 'Athlete does not belong to your household.');
    }

    if (typeof proofNote !== 'string' || proofNote.length > 500) {
      throw new HttpsError('invalid-argument', 'proofNote must be string <= 500');
    }

    if (mediaStoragePath !== undefined && mediaStoragePath !== null) {
      if (typeof mediaStoragePath !== 'string') {
        throw new HttpsError('invalid-argument', 'mediaStoragePath must be string');
      }
      if (mediaStoragePath.length > 512) {
        throw new HttpsError('invalid-argument', 'mediaStoragePath must be 512 characters or fewer.');
      }
      if (!mediaStoragePath.startsWith(`households/${householdId}/proof_media/${playerUid}/`)) {
        throw new HttpsError('permission-denied', 'mediaStoragePath must be within your own household proof_media folder.');
      }
    }

    const verificationRef = db().collection('completion_verifications').doc();
    await verificationRef.set({
      playerUid,
      drillId: drillId || null,
      proofNote: proofNote.trim(),
      mediaStoragePath: mediaStoragePath || null,
      mediaApproved: false,
      status: 'pending',
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { verificationId: verificationRef.id, status: 'pending' };
  }
);

/**
 * PARENT REVIEW COMPLETION PROOF
 */
exports.parentReviewCompletionProof = onCall(
  LAUNCH_CORE_CALLABLE_OPTS,
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'must be logged in');
    const parentActor = await assertParentAsync(request);

    const { verificationId, decision, recordUserKey } = request.data || {};

    if (typeof verificationId !== 'string' || verificationId.trim() === '') {
      throw new HttpsError('invalid-argument', 'verificationId required');
    }
    if (decision !== 'approved' && decision !== 'rejected') {
      throw new HttpsError('invalid-argument', 'decision must be approved or rejected');
    }

    const householdSnap = await db().collection('households')
      .where('playerEmails', 'array-contains', recordUserKey).get();
    if (householdSnap.empty) {
      throw new HttpsError('permission-denied', 'cross-household access');
    }

    const foundHousehold = householdSnap.docs[0].id;
    if (foundHousehold !== parentActor.householdId) {
      throw new HttpsError('permission-denied', 'cross-household access');
    }

    const playerSet = new Set(householdSnap.docs[0]?.data()?.playerEmails || []);
    if (!playerSet.has(recordUserKey)) throw new HttpsError('permission-denied', 'cross-household access');

    const verificationRef = db().collection('completion_verifications').doc(verificationId);
    const cvSnap = await verificationRef.get();
    if (!cvSnap.exists) throw new HttpsError('not-found', 'verification not found');

    if (cvSnap.data().status !== 'pending') {
      throw new HttpsError('failed-precondition', 'only pending records can be reviewed');
    }

    const mediaApproved = decision === 'approved';
    await verificationRef.update({
      status: decision,
      reviewedByUid: request.auth.uid,
      reviewedByEmail: request.auth.token.email,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      mediaApproved
    });

    return { verificationId, status: decision };
  }
);

exports.getPublicRecruitProfile = () => {};
exports.getPublicClubLanding = () => {};
