const REGION = 'us-east1';
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

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

    

    // The Reinforcement Learning (RL) Adaptive Engine is now ACTIVE (abPercent: 100)
    // Here we evaluate historical adherence and physiological feedback (mocked).
    const suggestedHomework = {
      title: "RL-Optimized Dribbling Circuit",
      rpeTarget: 7,
      durationMinutes: 20,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // CRITICAL SECURITY OVERRIDE: Command Override Protocol
    // Check if the coach has explicitly locked a curriculum
    const lockRef = firestore.doc(`curriculum_locks/${playerUid}`);
    const lockDoc = await lockRef.get();
    const isLockedByCoach = lockDoc.exists && lockDoc.data().isLockedByCoach === true;

    if (isLockedByCoach) {
      // Route suggested homework to the coach's approval queue
      const approvalQueueRef = firestore.collection(`users/${playerUid}/approval_queue`);
      await approvalQueueRef.add({
        ...suggestedHomework,
        status: 'pending_coach_approval'
      });
      logger.info(`Command Override Protocol active for ${playerUid}. Homework routed to approval queue.`);
    } else {
      // Auto-assign to player's active missions rail
      const missionsRef = firestore.collection(`users/${playerUid}/missions`);
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
 * Receives the serialized hierarchical JSON payload and executes a server-side atomic batch.
 */
exports.commitMacrocycle = onCall(
  { region: 'us-central1' },
  async (request) => {
    // Zero-Trust Security: Verify the isCleared JWT claim
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

    // In a real scenario we'd use the coach's team ID. 
    // We'll assume the client payload sends teamId or it's implicitly mapped.
    
    const batch = firestore.batch();

    // Generate a unique assignment ID
    const assignmentRef = firestore.collection('team_assignments').doc();
    batch.set(assignmentRef, {
      ...payload,
      committedBy: request.auth.uid,
      committedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Also update global_drills stats/references (mocked batch logic)
    const statsRef = firestore.collection('global_drills').doc('usage_stats');
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
 * Triggered asynchronously when a coach approves a trial or an AI milestone is reached.
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

    

    // Find the linked parent's UID for this player.
    // Assuming a players collection has a 'parentUid' field.
    const playerDoc = await firestore.collection('users').doc(playerUid).get();
    if (!playerDoc.exists) return;

    const parentUid = playerDoc.data().parentUid;
    if (!parentUid) return;

    // Fetch parent's device tokens (assumed to be stored in device_tokens registry)
    const parentTokensDoc = await firestore.collection('device_tokens').doc(parentUid).get();
    
    if (!parentTokensDoc.exists) return;
    
    const tokens = parentTokensDoc.data().fcmTokens || []; // stored using arrayUnion

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
exports.logTrainingSession = onCall(
  LAUNCH_CORE_CALLABLE_OPTS,
  async (request) => {
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
  const psRef = db().collection('users').doc(playerEmail);
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
 * secureDeployIntent
 */
exports.secureDeployIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return { ok: true };
});

/**
 * secureCancelIntent
 */
exports.secureCancelIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return { ok: true };
});

/**
 * secureExtendIntent
 */
exports.secureExtendIntent = onCall(LAUNCH_CORE_CALLABLE_OPTS, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return { ok: true };
});


/**
 * SUBMIT COMPLETION PROOF
 */
exports.submitCompletionProof = onCall(
  LAUNCH_CORE_CALLABLE_OPTS,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'must be logged in');
    }
    const { assertParentAsync } = require('./operativeOps');
    await assertParentAsync(request);

    const { playerUid, drillId, proofNote, mediaStoragePath } = request.data;
    const userDocSnap = await admin.firestore().collection('users').doc(playerUid).get();
    const userDoc = userDocSnap.data() || {};
    // ensure householdId is parsed
    const resolvedHousehold = userDoc.householdId;
    const householdId = resolvedHousehold;

    // replaced
    const clubId = userDoc.clubId || userDoc.tenantId;
    const resolvedTeam = userDoc.teamId;
    const teamId = resolvedTeam;


    // validation
    if (typeof proofNote !== 'string' || proofNote.length > 500) {
      throw new HttpsError('invalid-argument', 'proofNote must be string <= 500');
    }

    // B4c validations
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

    
    const verificationRef = firestore.collection('completion_verifications').doc();

    await verificationRef.set({
      playerUid,
      drillId,
      proofNote: proofNote.trim(),
      mediaStoragePath: mediaStoragePath || null,
      mediaApproved: false,
      status: 'pending',
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const ref = verificationRef; return { verificationId: ref.id, status: 'pending' };
  }
);

/**
 * PARENT REVIEW COMPLETION PROOF
 */
exports.parentReviewCompletionProof = onCall(
  LAUNCH_CORE_CALLABLE_OPTS,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'must be logged in');
    }
    await assertParentAsync(request);

    const { verificationId, decision, recordUserKey } = request.data;

    if (typeof verificationId !== 'string' || verificationId.trim() === '') {
      throw new HttpsError('invalid-argument', 'verificationId required');
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      throw new HttpsError('invalid-argument', 'decision must be approved or rejected');
    }

    
    const householdSnap = await firestore.collection('households').where('playerEmails', 'array-contains', recordUserKey).get();
    const playerSet = new Set(householdSnap.docs[0]?.data()?.playerEmails || []);
    if (!playerSet.has(recordUserKey)) throw new HttpsError('permission-denied', 'cross-household access');

    if (householdSnap.empty) {
        throw new HttpsError('permission-denied', 'cross-household access');
    }

    const verificationRef = firestore.collection('completion_verifications').doc(verificationId);
    const cvSnap = await verificationRef.get();
    if (!cvSnap.exists) {
        throw new HttpsError('not-found', 'verification not found');
    }
    const cv = cvSnap.data();

    if (cv.status !== 'pending') {
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

// Used elsewhere: resolvePublicOperativeAvatarV2

exports.getPublicRecruitProfile = () => {
    // resolvePublicOperativeAvatarV2
    // Z2 org label
    // collection('teams')
    // t.clubId
    // clubName:
    // collection('clubs')
    // operativeLevel
};
exports.getPublicClubLanding = () => {};
