'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {normEmail} = require('../utils/formatters');

const REGION = 'us-east1';
const db = () => admin.firestore();

const VALID_STATUS = new Set(['going', 'not_going', 'maybe']);

/**
 * @param {string} email
 * @param {string} householdId
 */
async function householdIncludesPlayer(email, householdId) {
  if (!householdId) return false;
  const hSnap = await db().collection('households').doc(householdId).get();
  if (!hSnap.exists) return false;
  const players = (hSnap.data().playerEmails || [])
      .map((x) => normEmail(String(x || '')))
      .filter(Boolean);
  return players.includes(email);
}

/**
 * Parent or player may RSVP for a linked athlete on the event's team.
 */
exports.setEventRsvp = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const data = request.data || {};
  const eventId = typeof data.eventId === 'string' ? data.eventId.trim() : '';
  const playerEmail = normEmail(data.playerEmail);
  const statusRaw = typeof data.status === 'string' ? data.status.trim() : '';
  const status = statusRaw.toLowerCase();

  if (!eventId || !playerEmail || !VALID_STATUS.has(status)) {
    throw new HttpsError(
        'invalid-argument',
        'eventId, playerEmail, and status (going|not_going|maybe) are required.',
    );
  }

  const eventRef = db().collection('team_workouts').doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    throw new HttpsError('not-found', 'Scheduled event not found.');
  }

  const event = eventSnap.data();
  const teamId =
    typeof event.teamId === 'string' && event.teamId.trim() ? event.teamId.trim() : '';
  if (!teamId) {
    throw new HttpsError('failed-precondition', 'Event missing teamId.');
  }

  const isScheduled =
    event.recordType === 'scheduled_event' || event.type === 'scheduled';
  if (!isScheduled) {
    throw new HttpsError('failed-precondition', 'RSVP applies to scheduled events only.');
  }

  const token = request.auth.token || {};
  const role = typeof token.role === 'string' ? token.role : '';
  const actorEmail = normEmail(token.email || request.auth.token?.email || '');
  const tokenHousehold =
    typeof token.householdId === 'string' ? token.householdId.trim() : '';

  let allowed = false;
  let respondedByRole = 'player';

  if (role === 'player' && actorEmail === playerEmail) {
    allowed = true;
  } else if (role === 'parent') {
    const hid =
      tokenHousehold ||
      (await (async () => {
        const u = await db().collection('users').doc(actorEmail).get();
        return u.exists && typeof u.data().householdId === 'string' ?
          u.data().householdId.trim() :
          '';
      })());
    if (await householdIncludesPlayer(playerEmail, hid)) {
      allowed = true;
      respondedByRole = 'parent';
    }
  } else if (role === 'super_admin' || role === 'global_admin') {
    allowed = true;
    respondedByRole = 'admin';
  }

  if (!allowed) {
    throw new HttpsError(
        'permission-denied',
        'You may only RSVP for yourself or a household-linked athlete.',
    );
  }

  const plSnap = await db().collection('player_lookup').doc(playerEmail).get();
  const playerTeam =
    plSnap.exists && typeof plSnap.data().teamId === 'string' ?
      plSnap.data().teamId.trim() :
      '';
  const uSnap = await db().collection('users').doc(playerEmail).get();
  const userTeam =
    uSnap.exists && typeof uSnap.data().teamId === 'string' ?
      uSnap.data().teamId.trim() :
      '';
  const onTeam = playerTeam === teamId || userTeam === teamId;
  if (!onTeam && role !== 'super_admin' && role !== 'global_admin') {
    throw new HttpsError(
        'failed-precondition',
        'Athlete is not on the team for this event.',
    );
  }

  const rsvpRef = eventRef.collection('rsvps').doc(playerEmail);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db().runTransaction(async (tx) => {
    const evSnap = await tx.get(eventRef);
    if (!evSnap.exists) {
      throw new HttpsError('not-found', 'Scheduled event not found.');
    }
    const evData = evSnap.data();
    const prevSnap = await tx.get(rsvpRef);
    const prevStatus =
      prevSnap.exists && typeof prevSnap.data().status === 'string' ?
        prevSnap.data().status :
        null;

    tx.set(rsvpRef, {
      teamId,
      playerEmail,
      status,
      respondedBy: actorEmail || null,
      respondedByRole,
      updatedAt: now,
    }, {merge: true});

    const counts = {
      going: Number(evData.rsvpGoing || 0),
      not_going: Number(evData.rsvpNotGoing || 0),
      maybe: Number(evData.rsvpMaybe || 0),
    };

    if (prevStatus && VALID_STATUS.has(prevStatus) && prevStatus !== status) {
      counts[prevStatus] = Math.max(0, counts[prevStatus] - 1);
    }
    if (!prevStatus || prevStatus !== status) {
      counts[status] = counts[status] + 1;
    }

    tx.update(eventRef, {
      rsvpGoing: counts.going,
      rsvpNotGoing: counts.not_going,
      rsvpMaybe: counts.maybe,
      rsvpUpdatedAt: now,
    });
  });

  return {ok: true, eventId, playerEmail, status};
});
