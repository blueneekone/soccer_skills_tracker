'use strict';

/**
 * functions/src/domains/profileTriggers.js
 * ──────────────────────────────────────────
 * Firestore document listeners that re-aggregate the public player profile
 * whenever source documents change.
 *
 * Triggers exported:
 *   updatePublicProfile        — onDocumentWritten  player_stats/{statId}
 *   updatePublicProfileOnTrial — onDocumentWritten  trials/{scoreId}
 *   onWorkoutLogCreated        — onDocumentCreated  workout_logs/{logId}
 *
 * Extracted verbatim from index.js.
 * index.js re-exports these via:
 *   const profileTriggers = require('./src/domains/profileTriggers');
 *   exports.updatePublicProfile        = profileTriggers.updatePublicProfile;
 *   exports.updatePublicProfileOnTrial = profileTriggers.updatePublicProfileOnTrial;
 *   exports.onWorkoutLogCreated        = profileTriggers.onWorkoutLogCreated;
 */

const {onDocumentWritten, onDocumentCreated} =
    require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin  = require('firebase-admin');

const {syncPublicPlayerProfile} = require('../utils/profileSyncer');
const {normEmail}               = require('../utils/formatters');

const REGION = 'us-east1';

// Lazy accessor — defers Firestore init until handler invocation.
const db = () => admin.firestore();

// ── Triggers ──────────────────────────────────────────────────────────────────

/**
 * Epic 16: sanitized global index for recruiter search (Admin SDK only writes).
 * `statId` may be Auth UID or legacy keyed doc — resolve before syncing public profile.
 */
const updatePublicProfile = onDocumentWritten(
    {
      document: 'player_stats/{statId}',
      region: REGION,
    },
    async (event) => {
      const statId = event.params.statId;
      if (!statId) return;

      const after =
          event.data && event.data.after ? event.data.after.data() : null;
      const teamId = after ? after.teamId : null;

      try {
        try {
          const au = await admin.auth().getUser(statId);
          await syncPublicPlayerProfile(au.uid);
          return;
        } catch (_err) {
          /* Not a UID — proceed to name resolution. */
        }

        if (!teamId) return;

        const snap = await db().collection('users')
            .where('teamId', '==', teamId)
            .where('playerName', '==', statId)
            .limit(1)
            .get();

        if (snap.empty) return;
        const rawId = snap.docs[0].id;
        let playerUid = rawId;
        if (typeof rawId === 'string' && rawId.includes('@')) {
          const ur = await admin.auth().getUserByEmail(normEmail(rawId));
          playerUid = ur.uid;
        }
        await syncPublicPlayerProfile(playerUid);
      } catch (e) {
        logger.error('updatePublicProfile player_stats', e);
      }
    },
);

/**
 * Epic 16: refresh public index when coach-verified trials change.
 */
const updatePublicProfileOnTrial = onDocumentWritten(
    {
      document: 'trials/{scoreId}',
      region: REGION,
    },
    async (event) => {
      const after = event.data && event.data.after ?
        event.data.after.data() :
        null;
      const before = event.data && event.data.before ?
        event.data.before.data() :
        null;
      const data = after || before;
      if (!data) return;
      const teamId =
          typeof data.teamId === 'string' ? data.teamId.trim() : '';
      const playerName =
          typeof data.player === 'string' ? data.player.trim() :
          (typeof data.playerName === 'string' ? data.playerName.trim() : '');
      if (!teamId || !playerName) return;
      try {
        const snap = await db().collection('users')
            .where('teamId', '==', teamId)
            .where('playerName', '==', playerName)
            .limit(3)
            .get();
        if (snap.empty) return;
        for (const doc of snap.docs) {
          const rawId = doc.id;
          let playerUid = rawId;
          if (typeof rawId === 'string' && rawId.includes('@')) {
            try {
              const ur = await admin.auth().getUserByEmail(normEmail(rawId));
              playerUid = ur.uid;
            } catch (e) {
              logger.warn('updatePublicProfileOnTrial uid', e);
              continue;
            }
          }
          await syncPublicPlayerProfile(playerUid);
        }
      } catch (e) {
        logger.error('updatePublicProfileOnTrial', e);
      }
    },
);

/**
 * Rebuild public profile whenever a new workout log is created
 * (XP history, daily/weekly performance arrays).
 */
const onWorkoutLogCreated = onDocumentCreated(
    {
      document: 'workout_logs/{logId}',
      region: REGION,
    },
    async (event) => {
      try {
        const snap = event.data;
        if (!snap) {
          return;
        }
        const data = snap.data();
        if (!data || !data.playerId) return;
        await syncPublicPlayerProfile(data.playerId);
      } catch (e) {
        logger.error('onWorkoutLogCreated rebuild failed', e);
      }
    },
);

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  updatePublicProfile,
  updatePublicProfileOnTrial,
  onWorkoutLogCreated,
};
