const { getFirestore } = require('firebase-admin/firestore');
'use strict';
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const db = () => admin.firestore();

exports.syncMatchStats = onDocumentCreated(
  {
    document: 'matches/{matchId}/events/{eventId}',
    region: 'us-east1'
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const playerId = data.playerId;
    const type = data.type;

    if (!playerId || playerId === 'unknown_player') return;
    if (type !== 'GOAL' && type !== 'ASSIST') return;

    try {
      await db().runTransaction(async (tx) => {
        const userRef = db().collection('users').doc(playerId);
        const userSnap = await tx.get(userRef);

        if (!userSnap.exists) return;

        const userData = userSnap.data();
        const scoutsSix = userData.scoutsSix || {};

        if (type === 'GOAL') {
          scoutsSix.goals = (scoutsSix.goals || 0) + 1;
        } else if (type === 'ASSIST') {
          scoutsSix.assists = (scoutsSix.assists || 0) + 1;
        }

        tx.update(userRef, { scoutsSix });
      });
      logger.info(`Successfully synced ${type} for player ${playerId}`);
    } catch (err) {
      logger.error(`Error syncing match stats for ${playerId}:`, err);
    }
  }
);


const { onCall, HttpsError: HttpsErrorMatch } = require('firebase-functions/v2/https');
const { stripProtectedFields: stripProtectedFieldsMatch } = require('../utils/rbacUtil');

exports.commitMatchTelemetry = onCall(
  { region: 'us-east1', enforceAppCheck: true },
  async (request) => {
    const uid = request.auth?.uid;
    const authStore = { isAuthenticated: !!uid };
    if (!uid) throw new HttpsErrorMatch('unauthenticated', 'Must be signed in.');
    
    // B815 Defensive Hydration
    const firestore = getFirestore();
    if (!firestore || !authStore.isAuthenticated) return;

    try {
      const payload = stripProtectedFieldsMatch(request.data || {});
      const telemetryId = payload.telemetryId || `tlm_${Date.now()}`;
      
      await firestore.collection('match_telemetry').doc(telemetryId).set({
        ...payload,
        submittedBy: uid,
        timestamp: new Date()
      });
      return { success: true, telemetryId };
    } catch (err) {
      if (err instanceof HttpsErrorMatch) throw err;
      logger.error('Error committing match telemetry:', err);
      throw new HttpsErrorMatch('internal', 'Failed to commit telemetry.');
    }
  }
);
