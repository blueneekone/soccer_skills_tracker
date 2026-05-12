'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onDocumentCreated, onDocumentWritten} =
    require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {normEmail} = require('../utils/formatters');
const {syncPublicPlayerProfile} = require('../utils/profileSyncer');

const REGION = 'us-east1';

/** Lazy Firestore accessor — defers init until first call. */
const db = () => admin.firestore();

// ── Shared helpers (exported for use by webhooksOps) ─────────────────────────

/**
 * Collect unique FCM tokens from device_tokens for the given Auth UIDs.
 * @param {string[]} uids
 * @return {Promise<string[]>}
 */
async function collectFcmTokensForUids(uids) {
  /** @type {string[]} */
  const out = [];
  for (const uid of uids) {
    if (!uid) continue;
    const snap = await db().collection('device_tokens').doc(uid).get();
    if (!snap.exists) continue;
    const arr = snap.data().tokens;
    if (!Array.isArray(arr)) continue;
    for (const t of arr) {
      if (typeof t === 'string' && t.length > 80) {
        out.push(t);
      }
    }
  }
  return [...new Set(out)];
}
exports.collectFcmTokensForUids = collectFcmTokensForUids;

/**
 * Collect Auth UIDs for players (via player_lookup email keys) and coaches
 * (coachEmail + assistants) on all teams in the club — used for strike alerts.
 * @param {string} clubId
 * @return {Promise<string[]>}
 */
async function collectPlayerCoachUidsForClub(clubId) {
  if (!clubId) return [];
  const teamSnap = await db()
      .collection('teams')
      .where('clubId', '==', clubId)
      .get();
  /** @type {Set<string>} */
  const emails = new Set();
  const teamIds = [];
  for (const doc of teamSnap.docs) {
    teamIds.push(doc.id);
    const d = doc.data() || {};
    const coach =
        typeof d.coachEmail === 'string' ? normEmail(d.coachEmail) : '';
    if (coach) emails.add(coach);
    const asst = d.assistants;
    if (Array.isArray(asst)) {
      for (const a of asst) {
        if (typeof a === 'string') emails.add(normEmail(a));
      }
    }
  }
  for (const tid of teamIds) {
    let plSnap;
    try {
      plSnap = await db()
          .collection('player_lookup')
          .where('teamId', '==', tid)
          .get();
    } catch (e) {
      logger.warn('collectPlayerCoachUidsForClub: player_lookup query failed', {
        tid,
        err: e instanceof Error ? e.message : String(e),
      });
      continue;
    }
    for (const pd of plSnap.docs) {
      const em = normEmail(pd.id);
      if (em && em.includes('@')) emails.add(em);
    }
  }
  /** @type {string[]} */
  const uids = [];
  const emArr = [...emails];
  await Promise.all(
      emArr.map(async (em) => {
        if (!em) return;
        try {
          const ur = await admin.auth().getUserByEmail(em);
          if (ur && ur.uid) uids.push(ur.uid);
        } catch (_e) {
          /* no Firebase Auth user for this roster email */
        }
      }),
  );
  return [...new Set(uids)];
}
exports.collectPlayerCoachUidsForClub = collectPlayerCoachUidsForClub;

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Resolve parent Auth UIDs for a player (team + display name) via
 * player_lookup, users, and households.
 * @param {string} teamId
 * @param {string} playerName
 * @return {Promise<string[]>}
 */
async function resolveParentUidsForTrialPlayer(teamId, playerName) {
  if (!teamId || !playerName) {
    return [];
  }
  const lookupSnap = await db().collection('player_lookup')
      .where('teamId', '==', teamId)
      .where('playerName', '==', playerName)
      .limit(2)
      .get();
  if (lookupSnap.empty) {
    return [];
  }
  if (lookupSnap.size > 1) {
    logger.warn(
        'onTrialScoreAdded: duplicate player_lookup; skip notify.',
    );
    return [];
  }
  const playerEmail = normEmail(lookupSnap.docs[0].id);
  if (!playerEmail) {
    return [];
  }
  const uSnap = await db().collection('users').doc(playerEmail).get();
  if (!uSnap.exists) {
    return [];
  }
  const hid =
      typeof uSnap.data().householdId === 'string' ?
        uSnap.data().householdId.trim() :
        '';
  if (!hid) {
    return [];
  }
  const hSnap = await db().collection('households').doc(hid).get();
  if (!hSnap.exists) {
    return [];
  }
  const pe = hSnap.data().parentEmails;
  if (!Array.isArray(pe) || pe.length === 0) {
    return [];
  }
  /** @type {string[]} */
  const uids = [];
  for (const raw of pe) {
    const em = normEmail(String(raw));
    if (!em || !em.includes('@')) continue;
    try {
      const ur = await admin.auth().getUserByEmail(em);
      if (ur && ur.uid) uids.push(ur.uid);
    } catch (e) {
      logger.warn(
          'onTrialScoreAdded: parent auth lookup failed ' + em + ' ' + e,
      );
    }
  }
  return [...new Set(uids)];
}

// ── Exported callable + trigger functions ─────────────────────────────────────

/**
 * Authenticated users register web push tokens for their Auth uid.
 */
exports.registerDeviceToken = onCall({region: REGION}, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = request.auth.uid;
  const raw = request.data && request.data.fcmToken;
  const fcmToken = typeof raw === 'string' ? raw.trim() : '';
  if (!fcmToken || fcmToken.length < 80 || fcmToken.length > 4096) {
    throw new HttpsError(
        'invalid-argument',
        'fcmToken must be a valid FCM registration token string.',
    );
  }
  await db().collection('device_tokens').doc(uid).set(
      {
        tokens: admin.firestore.FieldValue.arrayUnion(fcmToken),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
  );
  return {ok: true};
});

/**
 * Player OS: coach deploy -> assigned_missions/{missionId} -> FCM to player.
 * Resolves Auth uid from `targetPlayerKey` email when `playerId` is omitted.
 */
exports.onMissionAssigned = onDocumentCreated(
    {
      document: 'assigned_missions/{missionId}',
      region: REGION,
    },
    async (event) => {
      const missionId = event.params.missionId;
      const snap = event.data;
      if (!snap) {
        logger.error('onMissionAssigned: missing event.data', {missionId});
        return;
      }
      const data = snap.data() || {};
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      let playerId =
          typeof data.playerId === 'string' ? data.playerId.trim() : '';

      if (!teamId) {
        logger.error('onMissionAssigned: missing teamId', {missionId});
        return;
      }

      if (!playerId) {
        const targetPlayerKey =
            typeof data.targetPlayerKey === 'string' ?
              data.targetPlayerKey.trim().toLowerCase() :
              '';
        if (!targetPlayerKey || !targetPlayerKey.includes('@')) {
          logger.error('onMissionAssigned: missing playerId and valid targetPlayerKey', {
            missionId,
            teamId,
          });
          return;
        }
        try {
          const ur = await admin.auth().getUserByEmail(targetPlayerKey);
          playerId = ur.uid || '';
        } catch (e) {
          logger.error('onMissionAssigned: auth lookup failed', {
            missionId,
            teamId,
            targetPlayerKey,
            err: e instanceof Error ? e.message : String(e),
          });
          return;
        }
      }

      if (!playerId) {
        logger.error('onMissionAssigned: could not resolve playerId', {
          missionId,
          teamId,
        });
        return;
      }

      logger.info('onMissionAssigned: assignment ingested', {
        missionId,
        teamId,
        playerId,
      });

      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids([playerId]);
      } catch (e) {
        logger.error('onMissionAssigned: token load failed', {
          missionId,
          playerId,
          err: e instanceof Error ? e.message : String(e),
        });
        return;
      }

      if (tokens.length === 0) {
        logger.info('onMissionAssigned: no device tokens; skip FCM', {
          missionId,
          teamId,
          playerId,
        });
        return;
      }

      const title = 'New Training Mission!';
      const body =
          'Your coach just deployed a new mission. Head to the Armory to accept it.';

      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        try {
          await admin.messaging().sendMulticast({
            tokens: chunk,
            notification: {title, body},
            data: {
              kind: 'assigned_mission',
              missionId: String(missionId),
              teamId,
              playerId,
            },
          });
          logger.info('onMissionAssigned: sendMulticast ok', {
            missionId,
            playerId,
            tokenCount: chunk.length,
          });
        } catch (e) {
          logger.error('onMissionAssigned: sendMulticast failed', {
            missionId,
            playerId,
            err: e instanceof Error ? e.message : String(e),
          });
        }
      }
    },
);

/**
 * Drill library: new row in assignments/ -> FCM to player (device_tokens).
 */
exports.onAssignmentCreated = onDocumentCreated(
    {
      document: 'assignments/{assignmentId}',
      region: REGION,
    },
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const data = snap.data();
      if (!data || !data.playerId || !data.teamId) return;
      const playerId =
          typeof data.playerId === 'string' ? data.playerId.trim() : '';
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      if (!playerId || !teamId) return;

      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids([playerId]);
      } catch (e) {
        logger.error('onAssignmentCreated: token load failed', e);
        return;
      }
      if (tokens.length === 0) return;

      const title = 'New Training Assigned!';
      const body = 'Check your Armory for a new drill.';
      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        try {
          await admin.messaging().sendMulticast({
            tokens: chunk,
            notification: {title, body},
            data: {
              kind: 'library_assignment',
              teamId,
            },
          });
        } catch (e) {
          logger.error('onAssignmentCreated FCM failed', e);
        }
      }
    },
);

/**
 * Firestore: new skill trial logged under trials/ — notify linked parents.
 * Path matches client writes (challenges + coach Evals).
 */
exports.onTrialScoreAdded = onDocumentCreated(
    {
      document: 'trials/{scoreId}',
      region: REGION,
    },
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const data = snap.data() || {};
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      const playerName =
          typeof data.player === 'string' ? data.player.trim() :
          (typeof data.playerName === 'string' ? data.playerName.trim() : '');
      const skill =
          typeof data.skill === 'string' && data.skill.trim() ?
            data.skill.trim() :
            'trial drill';
      const score =
          typeof data.result === 'string' && data.result.trim() ?
            data.result.trim() :
            '-';

      if (!teamId || !playerName) {
        return;
      }

      let parentUids = [];
      try {
        parentUids = await resolveParentUidsForTrialPlayer(teamId, playerName);
      } catch (e) {
        logger.error('onTrialScoreAdded: resolve parents failed', e);
        return;
      }
      if (parentUids.length === 0) {
        return;
      }

      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids(parentUids);
      } catch (e) {
        logger.error('onTrialScoreAdded: token load failed', e);
        return;
      }
      if (tokens.length === 0) {
        return;
      }

      const title = 'New Trial Score Logged!';
      const body =
          `${playerName} just logged a ${score} on ${skill}. ` +
          'Tap to view their progress!';

      const scoreId = event.params.scoreId || '';
      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        try {
          await admin.messaging().sendMulticast({
            tokens: chunk,
            notification: {title, body},
            data: {
              kind: 'trial_score',
              teamId,
              scoreId: String(scoreId),
              playerName,
            },
          });
        } catch (e) {
          logger.error('onTrialScoreAdded: sendMulticast failed', e);
        }
      }
    },
);

/**
 * Epic 14: trial_scores -> public profile + FCM on verify.
 * Legacy trials/ still uses onTrialScoreAdded for parents.
 */
exports.onTrialScoreWritten = onDocumentWritten(
    {
      document: 'trial_scores/{scoreId}',
      region: REGION,
    },
    async (event) => {
      const afterSnap = event.data.after;
      const beforeSnap = event.data.before;
      if (!afterSnap || !afterSnap.exists) return;
      const after = afterSnap.data();
      const before =
          beforeSnap && beforeSnap.exists ? beforeSnap.data() : null;
      const pid =
          typeof after.playerId === 'string' ? after.playerId.trim() : '';
      if (!pid) return;

      try {
        await syncPublicPlayerProfile(pid);
      } catch (e) {
        logger.error('onTrialScoreWritten syncPublicProfile', e);
      }

      if (after.status !== 'verified') return;
      if (before && before.status === 'verified') return;

      let tokens = [];
      try {
        tokens = await collectFcmTokensForUids([pid]);
      } catch (e) {
        logger.error('onTrialScoreWritten tokens', e);
        return;
      }
      if (tokens.length === 0) return;

      const title = 'Verification Complete!';
      const body =
          'Your video trial has been approved and added to your global ' +
          'scouting profile.';
      const sid = event.params.scoreId || '';
      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        try {
          await admin.messaging().sendMulticast({
            tokens: chunk,
            notification: {title, body},
            data: {
              kind: 'video_trial_verified',
              scoreId: String(sid),
            },
          });
        } catch (e) {
          logger.error('onTrialScoreWritten FCM', e);
        }
      }
    },
);
