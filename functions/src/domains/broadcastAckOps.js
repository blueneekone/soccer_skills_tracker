'use strict';

/**
 * Epic 4.16b — broadcast read/ack compliance.
 * Parents acknowledge critical announcements; staff query ack status for outbox.
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {normEmail} = require('../utils/formatters');
const {assertParentAsync} = require('../middleware/authBouncers');

const REGION = 'us-east1';

const db = () => admin.firestore();

/** @param {string} messageId @param {string} uid */
function ackDocId(messageId, uid) {
  return `${messageId}_${uid}`;
}

/**
 * Parse optional ack deadline from callable input (ISO string or epoch ms).
 * @param {unknown} raw
 * @return {FirebaseFirestore.Timestamp | null}
 */
function parseAckDeadline(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return admin.firestore.Timestamp.fromMillis(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const ms = Date.parse(raw.trim());
    if (!Number.isNaN(ms)) {
      return admin.firestore.Timestamp.fromMillis(ms);
    }
  }
  return null;
}

/**
 * @param {FirebaseFirestore.Firestore} firestore
 * @param {string} messageId
 * @param {string} teamId
 * @param {string} callerRole
 * @param {string} callerTeamId
 * @param {string} callerClubId
 */
async function assertStaffCanReadBroadcastAck(
    firestore,
    messageId,
    teamId,
    callerRole,
    callerTeamId,
    callerClubId,
) {
  const snap = await firestore.collection('team_broadcasts').doc(messageId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Broadcast not found.');
  }
  const data = snap.data();
  if (String(data.teamId || '').trim() !== teamId) {
    throw new HttpsError('invalid-argument', 'teamId does not match broadcast.');
  }

  const teamClubId = String(data.teamClubId || '').trim();
  if (callerRole === 'super_admin' || callerRole === 'global_admin') {
    return {broadcast: data, teamClubId};
  }
  if (callerRole === 'coach') {
    if (!callerTeamId || callerTeamId !== teamId) {
      throw new HttpsError('permission-denied', 'Coaches may only view acks for their team.');
    }
    return {broadcast: data, teamClubId};
  }
  if (callerRole === 'director' || callerRole === 'registrar') {
    if (!callerClubId || !teamClubId || callerClubId !== teamClubId) {
      throw new HttpsError('permission-denied', 'Broadcast is outside your club scope.');
    }
    return {broadcast: data, teamClubId};
  }
  throw new HttpsError('permission-denied', 'Staff role required.');
}

/**
 * Parent acknowledges a critical team broadcast.
 * Collection: broadcast_acknowledgements/{messageId}_{uid}
 */
exports.acknowledgeBroadcast = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const actor = await assertParentAsync(request);
  const uid = request.auth.uid;
  const parentEmail = actor.email;

  const data = request.data || {};
  const messageId = typeof data.messageId === 'string' ? data.messageId.trim() : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';

  if (!messageId || !teamId) {
    throw new HttpsError('invalid-argument', 'messageId and teamId are required.');
  }

  const broadcastRef = db().collection('team_broadcasts').doc(messageId);
  const broadcastSnap = await broadcastRef.get();
  if (!broadcastSnap.exists) {
    throw new HttpsError('not-found', 'Announcement not found.');
  }

  const broadcast = broadcastSnap.data();
  if (String(broadcast.teamId || '').trim() !== teamId) {
    throw new HttpsError('invalid-argument', 'teamId does not match announcement.');
  }
  if (broadcast.requiresAck !== true) {
    throw new HttpsError(
        'failed-precondition',
        'This announcement does not require acknowledgment.',
    );
  }

  const eligible = (Array.isArray(broadcast.ackEligibleEmails) ?
    broadcast.ackEligibleEmails :
    broadcast.parentRecipientEmails || [])
      .map((e) => normEmail(String(e)))
      .filter(Boolean);

  if (!eligible.includes(parentEmail)) {
    throw new HttpsError(
        'permission-denied',
        'You are not an eligible guardian for this announcement.',
    );
  }

  const ackRef = db().collection('broadcast_acknowledgements').doc(ackDocId(messageId, uid));
  const existing = await ackRef.get();
  if (existing.exists) {
    return {ok: true, messageId, alreadyAcked: true};
  }

  const FieldValue = admin.firestore.FieldValue;
  const batch = db().batch();
  batch.set(ackRef, {
    messageId,
    teamId,
    parentUid: uid,
    parentEmail,
    acknowledgedAt: FieldValue.serverTimestamp(),
  });
  batch.update(broadcastRef, {
    acknowledgedCount: FieldValue.increment(1),
  });
  await batch.commit();

  return {ok: true, messageId, alreadyAcked: false};
});

/**
 * Staff reads acknowledgment rollup for a broadcast (outbox compliance).
 */
exports.getBroadcastAckStatus = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const callerRole = request.auth.token.role || '';
  const callerTeamId = request.auth.token.teamId || '';
  const callerClubId = request.auth.token.clubId || request.auth.token.tenantId || '';

  const staffRoles = new Set([
    'coach',
    'director',
    'registrar',
    'global_admin',
    'super_admin',
  ]);
  if (!staffRoles.has(callerRole)) {
    throw new HttpsError('permission-denied', 'Staff role required.');
  }

  const data = request.data || {};
  const messageId = typeof data.messageId === 'string' ? data.messageId.trim() : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';

  if (!messageId || !teamId) {
    throw new HttpsError('invalid-argument', 'messageId and teamId are required.');
  }

  const {broadcast} = await assertStaffCanReadBroadcastAck(
      db(),
      messageId,
      teamId,
      callerRole,
      callerTeamId,
      callerClubId,
  );

  const eligible = (Array.isArray(broadcast.ackEligibleEmails) ?
    broadcast.ackEligibleEmails :
    broadcast.parentRecipientEmails || [])
      .map((e) => normEmail(String(e)))
      .filter(Boolean);

  const ackSnap = await db()
      .collection('broadcast_acknowledgements')
      .where('messageId', '==', messageId)
      .get();

  /** @type {Set<string>} */
  const acknowledgedEmails = new Set();
  for (const doc of ackSnap.docs) {
    const em = normEmail(String(doc.data().parentEmail || ''));
    if (em) acknowledgedEmails.add(em);
  }

  const pendingEmails = eligible.filter((em) => !acknowledgedEmails.has(em));

  return {
    ok: true,
    messageId,
    teamId,
    requiresAck: broadcast.requiresAck === true,
    ackDeadline: broadcast.ackDeadline || null,
    totalEligible: eligible.length,
    acknowledgedCount: acknowledgedEmails.size,
    acknowledgedEmails: [...acknowledgedEmails],
    pendingEmails,
  };
});

exports.parseAckDeadline = parseAckDeadline;
exports.ackDocId = ackDocId;
