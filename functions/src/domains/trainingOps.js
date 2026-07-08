const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

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

    const firestore = admin.firestore();

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
    const firestore = admin.firestore();
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

    const firestore = admin.firestore();

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
