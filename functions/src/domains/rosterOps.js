'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {
  normEmail,
  normOperativeCallsignSlug,
} = require('../utils/formatters');

const REGION = 'us-east1';
const db = () => admin.firestore();

/**
 * Normalize roster name for dedup against rosters/{teamId}.players[].
 * @param {string} name
 */
function normRosterName(name) {
  return String(name || '').trim().toLowerCase();
}

/**
 * Parent claims a name-only roster spot after redeeming a guardian magic uplink.
 * Input: { operativeCallsign: string }
 */
exports.claimRosterSpot = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const role = request.auth.token.role || '';
  if (role !== 'parent') {
    throw new HttpsError('permission-denied', 'Only parents may claim a roster spot.');
  }

  const parentEmail = normEmail(request.auth.token.email);
  if (!parentEmail) {
    throw new HttpsError('invalid-argument', 'No email on session.');
  }

  const rawCallsign =
    typeof request.data?.operativeCallsign === 'string' ?
      request.data.operativeCallsign.trim().slice(0, 200) :
      '';
  const operSlug = normOperativeCallsignSlug(rawCallsign);
  if (!rawCallsign || operSlug.length < 2 || operSlug.length > 32) {
    throw new HttpsError(
        'invalid-argument',
        'operativeCallsign is required (2–32 letters or numbers).',
    );
  }

  const pSnap = await db().collection('users').doc(parentEmail).get();
  if (!pSnap.exists || pSnap.data().role !== 'parent') {
    throw new HttpsError('permission-denied', 'Parent profile not found.');
  }
  const pu = pSnap.data();
  const childName =
    typeof pu.pendingRosterPlayerName === 'string' ?
      pu.pendingRosterPlayerName.trim().slice(0, 200) :
      '';
  const teamId =
    typeof pu.teamId === 'string' ? pu.teamId.trim() : '';
  const clubId =
    typeof pu.clubId === 'string' ? pu.clubId.trim() : '';
  const hid =
    typeof pu.householdId === 'string' ? pu.householdId.trim() : '';

  if (!childName || !teamId || !clubId || !hid) {
    throw new HttpsError(
        'failed-precondition',
        'No pending roster invite on your account. Ask your club to resend the guardian link.',
    );
  }

  const hSnap = await db().collection('households').doc(hid).get();
  if (!hSnap.exists || !hSnap.data().coppaSigned) {
    throw new HttpsError(
        'failed-precondition',
        'Complete household waiver and VPC before claiming a roster spot.',
    );
  }

  const rosterRef = db().collection('rosters').doc(teamId);
  const rosterSnap = await rosterRef.get();
  const rosterNames = rosterSnap.exists && Array.isArray(rosterSnap.data().players) ?
    rosterSnap.data().players.filter((x) => typeof x === 'string') :
    [];
  const targetNorm = normRosterName(childName);
  if (!rosterNames.some((n) => normRosterName(n) === targetNorm)) {
    throw new HttpsError(
        'failed-precondition',
        'This roster name is no longer available. Contact your club registrar.',
    );
  }

  const childEmail = normEmail(`${operSlug}@operative.local`);
  const h = hSnap.data();
  const parentList = Array.isArray(h.parentEmails) ?
    h.parentEmails.map(normEmail).filter(Boolean) :
    [];
  if (!parentList.includes(parentEmail)) {
    throw new HttpsError('permission-denied', 'You are not on this household.');
  }

  const existingPlayers = (h.playerEmails || []).map(normEmail);
  if (existingPlayers.includes(childEmail)) {
    throw new HttpsError('already-exists', 'That callsign is already in use.');
  }

  let childUid;
  try {
    childUid = (await admin.auth().getUserByEmail(childEmail)).uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    childUid = (await admin.auth().createUser({
      email: childEmail,
      password: crypto.randomBytes(32).toString('hex'),
      displayName: childName,
    })).uid;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const mergedPlayers = [...new Set([...existingPlayers, childEmail])];
  const nextRosterNames = rosterNames.filter((n) => normRosterName(n) !== targetNorm);

  await db().runTransaction(async (tx) => {
    const rSnap = await tx.get(rosterRef);
    const names = rSnap.exists && Array.isArray(rSnap.data().players) ?
      rSnap.data().players.filter((x) => typeof x === 'string') :
      [];
    if (!names.some((n) => normRosterName(n) === targetNorm)) {
      throw new HttpsError('failed-precondition', 'Roster name already claimed.');
    }
    tx.set(
        rosterRef,
        {
          players: names.filter((n) => normRosterName(n) !== targetNorm),
          updatedAt: now,
        },
        {merge: true},
    );

    tx.set(db().collection('users').doc(childEmail), {
      uid: childUid,
      email: childEmail,
      role: 'player',
      clubId,
      teamId,
      householdId: hid,
      playerName: childName,
      operativeCallsign: rawCallsign,
      operativeCallsignSlug: operSlug,
      parentProvisioned: true,
      parentProvisionerEmail: parentEmail,
      rosterClaimedFromNameOnly: true,
      updatedAt: now,
    }, {merge: true});

    tx.update(db().collection('users').doc(parentEmail), {
      pendingRosterPlayerName: admin.firestore.FieldValue.delete(),
      updatedAt: now,
    });

    tx.set(db().collection('households').doc(hid), {
      playerEmails: mergedPlayers,
      updatedAt: now,
    }, {merge: true});

    const plRef = db().collection('player_lookup').doc(childEmail);
    tx.set(plRef, {
      email: childEmail,
      playerEmail: childEmail,
      playerName: childName,
      teamId,
      clubId,
      householdId: hid,
      parentEmails: parentList,
      updatedAt: now,
    }, {merge: true});
  });

  await admin.auth().setCustomUserClaims(childUid, {
    role: 'player',
    clubId,
    teamId,
    householdId: hid,
  });

  return {ok: true, playerEmail: childEmail, playerName: childName, teamId};
});
