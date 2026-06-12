'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onDocumentCreated, onDocumentWritten} =
    require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {normEmail} = require('../utils/formatters');
const {syncPublicPlayerProfile} = require('../utils/profileSyncer');
const {
  parentHasCommsConsent,
  resolveIsMinor,
  filterParentsWithCommsConsent,
} = require('./commsPolicy');

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

// ── Phase 3, Epic 5.4 — Parent Co-Op Notification Dispatchers ────────────────

/**
 * Shared helper: send an FCM multicast to a list of UIDs.
 * Resolves UIDs from email keys when needed.
 * Non-fatal — logs errors but never throws.
 *
 * @param {string[]} uids
 * @param {{ title: string, body: string }} notification
 * @param {Record<string, string>} data
 */
async function sendFcmToUids(uids, notification, data) {
  if (uids.length === 0) return;
  let tokens = [];
  try {
    tokens = await collectFcmTokensForUids(uids);
  } catch (e) {
    logger.error('sendFcmToUids: token load failed', {err: e});
    return;
  }
  if (tokens.length === 0) return;
  const chunkSize = 500;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    try {
      await admin.messaging().sendMulticast({tokens: chunk, notification, data});
    } catch (e) {
      logger.error('sendFcmToUids: sendMulticast failed', {err: e});
    }
  }
}

exports.sendFcmToUids = sendFcmToUids;

/**
 * Resolve Auth UIDs for an email array (best-effort, skips missing users).
 * @param {string[]} emails
 * @return {Promise<string[]>}
 */
async function emailsToUids(emails) {
  const uids = [];
  await Promise.all(emails.map(async (em) => {
    const key = normEmail(String(em));
    if (!key || !key.includes('@')) return;
    try {
      const ur = await admin.auth().getUserByEmail(key);
      if (ur && ur.uid) uids.push(ur.uid);
    } catch (_) {}
  }));
  return [...new Set(uids)];
}

/**
 * Notify child player when a parent creates a new bounty for them.
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {object} bountyData
 * @param {string} bountyId
 */
async function dispatchBountyCreated(firestore, bountyData, bountyId) {
  const {playerEmail, title} = bountyData;
  if (!playerEmail) return;
  const uids = await emailsToUids([playerEmail]);
  await sendFcmToUids(
      uids,
      {title: '🎯 New Bounty Created!', body: `A parent set a reward bounty: "${title}". Complete the goal to earn your reward!`},
      {kind: 'bounty_created', bountyId: String(bountyId)},
  );
}
exports.dispatchBountyCreated = dispatchBountyCreated;

/**
 * Notify both parent and child when a bounty is verified (criteria met).
 * Called by issueBountyReward before Tremendous order is confirmed.
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {object} bountyData
 * @param {string} bountyId
 */
async function dispatchBountyVerified(firestore, bountyData, bountyId) {
  const {playerEmail, parentEmail, title} = bountyData;
  const allEmails = [playerEmail, parentEmail].filter(Boolean);
  const uids = await emailsToUids(allEmails);
  await sendFcmToUids(
      uids,
      {title: '🏆 Bounty Completed!', body: `"${title}" — Goal achieved! Your reward is being processed.`},
      {kind: 'bounty_verified', bountyId: String(bountyId)},
  );
}
exports.dispatchBountyVerified = dispatchBountyVerified;

/**
 * Notify both parent and child when Tremendous confirms the reward is paid.
 * Called by tremendousWebhook.js on REWARDS.PAID.
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {object} bountyData
 * @param {string} bountyId
 */
async function dispatchBountyPaid(firestore, bountyData, bountyId) {
  const {playerEmail, parentEmail, title} = bountyData;
  const allEmails = [playerEmail, parentEmail].filter(Boolean);
  const uids = await emailsToUids(allEmails);
  await sendFcmToUids(
      uids,
      {title: '💰 Reward Sent!', body: `The reward for "${title}" has been delivered. Check your email!`},
      {kind: 'bounty_paid', bountyId: String(bountyId)},
  );
}
exports.dispatchBountyPaid = dispatchBountyPaid;

/**
 * Notify the child player when a parent activates a telemetry boost.
 * Called by coOpOps.js activateTelemetryBoost.
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {string} playerEmail
 * @param {{ label: string, expiresAt: string }} boostInfo
 */
async function dispatchBoostActivated(firestore, playerEmail, boostInfo) {
  if (!playerEmail) return;
  const uids = await emailsToUids([playerEmail]);
  await sendFcmToUids(
      uids,
      {title: '⚡ XP Boost Activated!', body: `Your parent activated a ${boostInfo.label} boost! Train now for bonus XP.`},
      {kind: 'boost_activated', expiresAt: boostInfo.expiresAt},
  );
}
exports.dispatchBoostActivated = dispatchBoostActivated;

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

// ── Epic 4.3 — Team Broadcast Push ───────────────────────────────────────────

/**
 * Fires when safeSportBroadcast writes a team_broadcasts doc.
 * Resolves player UIDs for the team (via player_lookup) and CC'd parent UIDs
 * (consent re-validated via commsPolicy before push — COPPA defence in depth).
 * Non-fatal: errors are logged and swallowed; never throws out of the trigger.
 */
exports.onTeamBroadcastCreated = onDocumentCreated(
    {
      document: 'team_broadcasts/{msgId}',
      region: REGION,
    },
    async (event) => {
      const msgId = event.params.msgId;
      const snap = event.data;
      if (!snap) {
        logger.warn('onTeamBroadcastCreated: missing event.data', {msgId});
        return;
      }

      const data = snap.data() || {};
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      if (!teamId) {
        logger.warn('onTeamBroadcastCreated: missing teamId', {msgId});
        return;
      }

      const pushTitle =
          typeof data.subject === 'string' && data.subject.trim()
            ? data.subject.trim().slice(0, 100)
            : 'Team Announcement';
      const pushBody =
          typeof data.bodyPreview === 'string' && data.bodyPreview
            ? data.bodyPreview.slice(0, 140)
            : typeof data.body === 'string'
              ? data.body.slice(0, 140)
              : '';
      const rawCcParents = Array.isArray(data.ccParentEmails)
        ? data.ccParentEmails
        : [];

      // ── 1. Resolve player emails from player_lookup ──────────────────────
      /** @type {string[]} */
      const playerEmails = [];
      try {
        const plSnap = await db()
            .collection('player_lookup')
            .where('teamId', '==', teamId)
            .get();
        for (const pd of plSnap.docs) {
          const em = normEmail(pd.data().email || pd.id);
          if (em && em.includes('@')) playerEmails.push(em);
        }
      } catch (e) {
        logger.warn('onTeamBroadcastCreated: player_lookup query failed', {
          teamId,
          err: e instanceof Error ? e.message : String(e),
        });
      }

      // ── 2. Player emails → Auth UIDs (best-effort) ────────────────────────
      /** @type {string[]} */
      const playerUids = [];
      await Promise.all(
          playerEmails.map(async (em) => {
            try {
              const ur = await admin.auth().getUserByEmail(em);
              if (ur && ur.uid) playerUids.push(ur.uid);
            } catch (_) {
              /* no Auth account for this roster email */
            }
          }),
      );

      // ── 3. Consent-filter CC'd parents (COPPA secondary guard) ───────────
      // ccParentEmails in the doc are already consent-filtered by the
      // safeSportBroadcast callable; this is a defence-in-depth re-check.
      /** @type {string[]} */
      const consentedParentEmails = [];
      for (const raw of rawCcParents) {
        const pEmail = normEmail(String(raw));
        if (!pEmail || !pEmail.includes('@')) continue;
        let allowed = false;
        for (const playerEmail of playerEmails) {
          try {
            if (await parentHasCommsConsent(db(), pEmail, playerEmail)) {
              allowed = true;
              break;
            }
          } catch (e) {
            logger.warn('onTeamBroadcastCreated: consent check error', {
              pEmail,
              playerEmail,
              err: e instanceof Error ? e.message : String(e),
            });
          }
        }
        if (allowed) consentedParentEmails.push(pEmail);
      }

      // ── 4. Consented parent emails → Auth UIDs ────────────────────────────
      /** @type {string[]} */
      const parentUids = [];
      await Promise.all(
          consentedParentEmails.map(async (em) => {
            try {
              const ur = await admin.auth().getUserByEmail(em);
              if (ur && ur.uid) parentUids.push(ur.uid);
            } catch (_) {
              /* no Auth account for this parent email */
            }
          }),
      );

      // ── 5. Merge and push ─────────────────────────────────────────────────
      const allUids = [...new Set([...playerUids, ...parentUids])];
      if (allUids.length === 0) {
        logger.info('onTeamBroadcastCreated: no push recipients resolved', {
          teamId,
          msgId,
        });
        return;
      }

      try {
        await sendFcmToUids(
            allUids,
            {title: pushTitle, body: pushBody},
            {category: 'push_announcements'},
        );
        logger.info('onTeamBroadcastCreated: push dispatched', {
          teamId,
          msgId,
          playerCount: playerUids.length,
          parentCount: parentUids.length,
        });
      } catch (e) {
        logger.error('onTeamBroadcastCreated: sendFcmToUids failed', {
          teamId,
          msgId,
          err: e instanceof Error ? e.message : String(e),
        });
      }
    },
);

// ── Epic 4.5 Slice A — Deployment Calendar → Team Broadcast ──────────────────

/**
 * Auto-generates a `team_broadcasts` doc for every teamId in a newly-created
 * `deployment_calendar_entries` doc.  The broadcast rides the already-shipped
 * `onTeamBroadcastCreated` push bus (Epic 4.3) for FCM delivery and COPPA
 * consent filtering — this trigger does NOT call sendFcmToUids directly.
 *
 * Parent-email resolution mirrors safeSportBroadcast (comms.js lines 138–185):
 *   1. player_lookup where teamId == teamId  → player emails
 *   2. users/{email} → isMinor flag + householdId
 *   3. households/{householdId}.parentEmails + users.parentEmail → candidates
 *   4. filterParentsWithCommsConsent → ccParentEmails
 *
 * Suppression: entries with visibility === 'staff_only' are skipped.
 * Non-fatal: per-team errors are caught/logged; trigger never throws.
 */
exports.onDeploymentCalendarEntryCreated = onDocumentCreated(
    {
      document: 'deployment_calendar_entries/{entryId}',
      region: REGION,
    },
    async (event) => {
      const entryId = event.params.entryId;
      const snap = event.data;
      if (!snap) {
        logger.warn('onDeploymentCalendarEntryCreated: missing event.data', {entryId});
        return;
      }

      const entry = snap.data() || {};

      if (entry.visibility === 'staff_only') {
        logger.info('onDeploymentCalendarEntryCreated: suppressed staff_only entry', {entryId});
        return;
      }

      const teamIds = Array.isArray(entry.teamIds) ? entry.teamIds : [];
      if (teamIds.length === 0) {
        logger.info('onDeploymentCalendarEntryCreated: no teamIds, skipping', {entryId});
        return;
      }

      const clubId = typeof entry.clubId === 'string' ? entry.clubId.trim() : '';
      const kind = typeof entry.kind === 'string' ? entry.kind.trim() : 'event';
      const title = typeof entry.title === 'string' ? entry.title.trim() : '(untitled)';
      const facilityId =
          typeof entry.facilityId === 'string' ? entry.facilityId.trim() : '';

      let dateStr = '';
      try {
        const d =
            entry.startsAt && typeof entry.startsAt.toDate === 'function'
              ? entry.startsAt.toDate()
              : new Date(entry.startsAt);
        dateStr = d.toLocaleString('en-US', {
          timeZone: 'UTC',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch (_) { /* leave dateStr empty */ }

      const subject = `New ${kind}: ${title}`;
      const bodyLines = [
        `${kind.charAt(0).toUpperCase() + kind.slice(1)}: ${title}`,
      ];
      if (dateStr) bodyLines.push(`When: ${dateStr} UTC`);
      if (facilityId) bodyLines.push(`Location: ${facilityId}`);
      const body = bodyLines.join('\n');

      for (const teamId of teamIds) {
        try {
          if (typeof teamId !== 'string' || !teamId.trim()) continue;

          // ── Resolve ccParentEmails (mirrors safeSportBroadcast lines 138–185) ──
          const rosterSnap = await db()
              .collection('player_lookup')
              .where('teamId', '==', teamId)
              .get();

          const ccParentEmailSet = new Set();
          await Promise.all(
              rosterSnap.docs.map(async (pd) => {
                const playerEmail = normEmail(pd.data().email || pd.id);
                if (!playerEmail) return;
                try {
                  const profSnap = await db().collection('users').doc(playerEmail).get();
                  if (!profSnap.exists) return;
                  const prof = profSnap.data();
                  if (!resolveIsMinor(prof)) return;

                  const parentCandidates = [];
                  const householdId = prof.householdId || '';
                  if (householdId) {
                    const hSnap = await db().collection('households').doc(householdId).get();
                    if (hSnap.exists) {
                      const pe = hSnap.data().parentEmails || [];
                      pe.forEach((p) => {
                        const n = normEmail(String(p));
                        if (n) parentCandidates.push(n);
                      });
                    }
                  }
                  const directParent = normEmail(prof.parentEmail || '');
                  if (directParent) parentCandidates.push(directParent);

                  const consented = await filterParentsWithCommsConsent(
                      db(),
                      parentCandidates,
                      playerEmail,
                  );
                  consented.forEach((p) => ccParentEmailSet.add(p));
                } catch (err) {
                  logger.warn(
                      'onDeploymentCalendarEntryCreated: parent resolution error',
                      {
                        teamId,
                        playerEmail,
                        err: err instanceof Error ? err.message : String(err),
                      },
                  );
                }
              }),
          );

          const ccParentEmails = [...ccParentEmailSet];

          await db().collection('team_broadcasts').add({
            teamId,
            teamClubId: clubId || null,
            channelId: null,
            fromUid: 'system',
            fromEmail: null,
            fromRole: 'director',
            subject,
            body,
            bodyPreview: body.slice(0, 140),
            ccParentEmails,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'deployment_calendar',
            sourceEntryId: entryId,
          });

          logger.info('onDeploymentCalendarEntryCreated: broadcast written', {
            entryId,
            teamId,
            ccParentCount: ccParentEmails.length,
          });
        } catch (err) {
          logger.error('onDeploymentCalendarEntryCreated: per-team error', {
            entryId,
            teamId,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }
    },
);
