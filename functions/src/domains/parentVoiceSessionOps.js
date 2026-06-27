'use strict';

/**
 * COMMS-VOICE-V1 — scheduled parent info voice sessions.
 * Authority: docs/vision/COMMS_PLATFORM_STANDARDS.md §4.3
 *
 * Path: clubs/{clubId}/parent_voice_sessions/{sessionId}
 * v1: join/leave metadata in messaging_audit; vendor token stub behind feature flag.
 * Recording: out of scope — COMMS-VOICE-RECORDING sprint.
 */

const crypto = require('crypto');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {normEmail} = require('../utils/formatters');
const {
  assertCoachMessageSender,
  assertParentAsync,
} = require('../middleware/authBouncers');
const {
  buildTeamBroadcastAudience,
  resolveIsMinor,
  resolvePlayerGuardianEmails,
} = require('./commsPolicy');

const REGION = 'us-east1';
const VOICE_FLAG_DOC = 'feature_flags/commsParentVoice';

/** @return {FirebaseFirestore.Firestore} */
const db = () => admin.firestore();

/**
 * @return {Promise<boolean>}
 */
async function readParentVoiceEnabled() {
  const snap = await db().doc(VOICE_FLAG_DOC).get();
  if (!snap.exists) return false;
  return snap.data().enabled === true;
}

/**
 * @param {string} role
 */
function blockMinorPersona(role) {
  if (role === 'player') {
    throw new HttpsError(
        'permission-denied',
        'SafeSport policy: minors cannot join parent voice sessions.',
    );
  }
}

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function assertNotMinorUser(request) {
  const email = normEmail(request.auth?.token?.email);
  if (!email) return;
  const snap = await db().collection('users').doc(email).get();
  if (snap.exists && resolveIsMinor(snap.data())) {
    throw new HttpsError(
        'permission-denied',
        'SafeSport policy: minors cannot join parent voice sessions.',
    );
  }
}

/**
 * @param {string} parentEmail
 * @param {string} teamId
 */
async function assertParentLinkedToTeam(parentEmail, teamId) {
  const parent = normEmail(parentEmail);
  const rosterSnap = await db()
      .collection('player_lookup')
      .where('teamId', '==', teamId)
      .get();

  for (const doc of rosterSnap.docs) {
    const playerEmail = normEmail(doc.id);
    if (!playerEmail) continue;
    const profSnap = await db().collection('users').doc(playerEmail).get();
    if (!profSnap.exists) continue;
    const guardians = await resolvePlayerGuardianEmails(db(), profSnap.data());
    if (guardians.includes(parent)) return;
  }

  throw new HttpsError(
      'permission-denied',
      'Parent is not linked to a rostered athlete on this team.',
  );
}

/**
 * @param {Record<string, unknown>} teamData
 * @return {string[]}
 */
function resolveTeamCoachEmails(teamData) {
  /** @type {string[]} */
  const out = [];
  if (Array.isArray(teamData.coachEmails)) {
    teamData.coachEmails.forEach((e) => {
      const n = normEmail(String(e));
      if (n) out.push(n);
    });
  } else if (typeof teamData.coachEmail === 'string' && teamData.coachEmail.trim()) {
    const n = normEmail(teamData.coachEmail);
    if (n) out.push(n);
  }
  if (Array.isArray(teamData.assistants)) {
    teamData.assistants.forEach((e) => {
      const n = normEmail(String(e));
      if (n) out.push(n);
    });
  }
  return [...new Set(out)];
}

/**
 * @param {string} teamId
 * @return {Promise<object>}
 */
async function buildSessionScheduleDeliveryReport(teamId, sessionId) {
  const rosterSnap = await db()
      .collection('player_lookup')
      .where('teamId', '==', teamId)
      .get();
  const playerEmails = rosterSnap.docs.map((d) => normEmail(d.data().email || d.id));
  /** @type {Map<string, string[]>} */
  const parentToPlayers = new Map();
  /** @type {Map<string, {isMinor: boolean}>} */
  const playerMeta = new Map();

  await Promise.all(playerEmails.map(async (email) => {
    if (!email) return;
    const profSnap = await db().collection('users').doc(email).get();
    if (!profSnap.exists) return;
    const prof = profSnap.data();
    playerMeta.set(email, {isMinor: resolveIsMinor(prof)});
    const guardians = await resolvePlayerGuardianEmails(db(), prof);
    for (const g of guardians) {
      if (!parentToPlayers.has(g)) parentToPlayers.set(g, []);
      parentToPlayers.get(g).push(email);
    }
  }));

  const audience = await buildTeamBroadcastAudience(
      db(),
      playerEmails,
      playerMeta,
      parentToPlayers,
  );

  return {
    messageId: sessionId,
    audienceScope: 'team_parents',
    rosterAthleteCount: playerEmails.length,
    parentDelivered: audience.parentDelivered,
    parentSkipped: audience.parentSkipped,
    ccParentEmails: audience.ccParentEmails,
    teamId,
  };
}

/**
 * Stub vendor token — replace with Daily/Twilio mint when vendor sprint lands.
 * @param {string} sessionId
 * @param {string} uid
 * @param {string} email
 * @return {string}
 */
function mintStubVendorToken(sessionId, uid, email) {
  const payload = {
    vendor: 'stub-daily',
    sessionId,
    uid,
    email: normEmail(email),
    exp: Date.now() + 60 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Schedule a parent info voice session linked to a calendar event.
 *
 * Input: clubId, teamId, calendarEventId, title (optional)
 */
exports.createParentVoiceSession = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const callerRole = request.auth.token.role || 'player';
  blockMinorPersona(callerRole);

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const calendarEventId =
    typeof data.calendarEventId === 'string' ? data.calendarEventId.trim() : '';
  const titleRaw = typeof data.title === 'string' ? data.title.trim() : '';

  if (!clubId || !teamId || !calendarEventId) {
    throw new HttpsError(
        'invalid-argument',
        'clubId, teamId, and calendarEventId are required.',
    );
  }

  if (callerRole !== 'coach' && callerRole !== 'director' &&
      callerRole !== 'global_admin' && callerRole !== 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Only coaches and directors may schedule parent voice sessions.',
    );
  }

  const teamSnap = await db().collection('teams').doc(teamId).get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const teamData = teamSnap.data();
  const teamClubId =
    typeof teamData.clubId === 'string' ? teamData.clubId.trim() : '';
  if (!teamClubId || teamClubId !== clubId) {
    throw new HttpsError('permission-denied', 'Team is not in the specified club.');
  }

  if (callerRole === 'coach') {
    const actor = assertCoachMessageSender(request);
    if (actor.teamId !== teamId) {
      throw new HttpsError('permission-denied', 'You can only schedule sessions for your team.');
    }
  } else if (callerRole === 'director') {
    const callerClubId = request.auth.token.clubId || request.auth.token.tenantId || '';
    if (callerClubId !== clubId) {
      throw new HttpsError('permission-denied', 'Club scope mismatch.');
    }
  }

  const eventSnap = await db().collection('team_workouts').doc(calendarEventId).get();
  if (!eventSnap.exists) {
    throw new HttpsError('not-found', 'Calendar event not found.');
  }
  const eventData = eventSnap.data();
  if (String(eventData.teamId || '') !== teamId) {
    throw new HttpsError(
        'failed-precondition',
        'Calendar event does not belong to this team.',
    );
  }
  if (eventData.recordType !== 'scheduled_event' && eventData.type !== 'scheduled') {
    throw new HttpsError(
        'failed-precondition',
        'Calendar event must be a scheduled team event.',
    );
  }

  const callerEmail = normEmail(request.auth.token.email);
  const FieldValue = admin.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();
  const sessionRef = db()
      .collection('clubs').doc(clubId)
      .collection('parent_voice_sessions').doc();

  const eventTitle =
    titleRaw ||
    (typeof eventData.name === 'string' ? eventData.name.trim() : '') ||
    'Parent info session';

  const scheduledStartAt =
    eventData.startTime ||
    (eventData.startTimestamp ?
      admin.firestore.Timestamp.fromMillis(Number(eventData.startTimestamp)) :
      null);

  await sessionRef.set({
    channelType: 'parent_voice_session',
    clubId,
    teamId,
    calendarEventId,
    title: eventTitle.slice(0, 200),
    scheduledStartAt,
    scheduledStartTimestamp: Number(eventData.startTimestamp) || null,
    hostEmail: callerEmail,
    hostRole: callerRole,
    recordingEnabled: false,
    vendorEnabled: await readParentVoiceEnabled(),
    participantJoinLog: [],
    createdAt: now,
    updatedAt: now,
  });

  const deliveryReport = await buildSessionScheduleDeliveryReport(teamId, sessionRef.id);

  await db().collection('messaging_audit').doc().set({
    action: 'parent_voice_session_scheduled',
    channelType: 'parent_voice_session',
    sessionId: sessionRef.id,
    clubId,
    teamId,
    calendarEventId,
    title: eventTitle.slice(0, 200),
    hostEmail: callerEmail,
    hostRole: callerRole,
    actorUid: request.auth.uid,
    deliveryReport,
    at: now,
  });

  logger.info('[createParentVoiceSession] scheduled', {
    sessionId: sessionRef.id,
    clubId,
    teamId,
    calendarEventId,
  });

  return {
    ok: true,
    sessionId: sessionRef.id,
    calendarEventId,
    title: eventTitle,
    deliveryReport,
    recordingEnabled: false,
  };
});

/**
 * Join or leave a parent voice session (attendance logged; vendor token when flag on).
 *
 * Input: clubId, sessionId, action: 'join' | 'leave'
 */
exports.joinParentVoiceSession = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const callerRole = request.auth.token.role || 'player';
  blockMinorPersona(callerRole);
  await assertNotMinorUser(request);

  const callerEmail = normEmail(request.auth.token.email);
  if (!callerEmail) {
    throw new HttpsError('unauthenticated', 'Authenticated email is missing.');
  }

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const sessionId = typeof data.sessionId === 'string' ? data.sessionId.trim() : '';
  const action = typeof data.action === 'string' ? data.action.trim().toLowerCase() : 'join';

  if (!clubId || !sessionId) {
    throw new HttpsError('invalid-argument', 'clubId and sessionId are required.');
  }
  if (action !== 'join' && action !== 'leave') {
    throw new HttpsError('invalid-argument', 'action must be join or leave.');
  }

  const sessionRef = db()
      .collection('clubs').doc(clubId)
      .collection('parent_voice_sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new HttpsError('not-found', 'Voice session not found.');
  }
  const session = sessionSnap.data();
  if (session.channelType !== 'parent_voice_session') {
    throw new HttpsError('failed-precondition', 'Invalid session type.');
  }
  const teamId = String(session.teamId || '');
  if (!teamId) {
    throw new HttpsError('failed-precondition', 'Session is missing team scope.');
  }

  const teamSnap = await db().collection('teams').doc(teamId).get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const teamData = teamSnap.data();

  /** @type {'parent' | 'coach' | 'director'} */
  let participantRole;
  if (callerRole === 'parent') {
    const parentActor = await assertParentAsync(request);
    await assertParentLinkedToTeam(parentActor.email, teamId);
    participantRole = 'parent';
  } else if (callerRole === 'coach') {
    const actor = assertCoachMessageSender(request);
    if (actor.teamId !== teamId) {
      throw new HttpsError('permission-denied', 'You can only join sessions for your team.');
    }
    const coaches = resolveTeamCoachEmails(teamData);
    if (!coaches.includes(callerEmail)) {
      throw new HttpsError('permission-denied', 'Coach is not assigned to this team.');
    }
    participantRole = 'coach';
  } else if (
    callerRole === 'director' ||
    callerRole === 'global_admin' ||
    callerRole === 'super_admin'
  ) {
    if (callerRole === 'director') {
      const callerClubId = request.auth.token.clubId || request.auth.token.tenantId || '';
      if (callerClubId !== clubId) {
        throw new HttpsError('permission-denied', 'Club scope mismatch.');
      }
    }
    participantRole = 'director';
  } else {
    throw new HttpsError(
        'permission-denied',
        'Only parents and coaches may join parent voice sessions.',
    );
  }

  const FieldValue = admin.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();
  const vendorEnabled = await readParentVoiceEnabled();

  const joinEntry = {
    email: callerEmail,
    role: participantRole,
    action,
    at: now,
  };

  await sessionRef.set({
    participantJoinLog: FieldValue.arrayUnion(joinEntry),
    updatedAt: now,
  }, {merge: true});

  const auditAction =
    action === 'leave' ?
      'parent_voice_session_leave' :
      'parent_voice_session_join';

  await db().collection('messaging_audit').doc().set({
    action: auditAction,
    channelType: 'parent_voice_session',
    sessionId,
    clubId,
    teamId,
    calendarEventId: String(session.calendarEventId || ''),
    participantEmail: callerEmail,
    participantRole,
    actorUid: request.auth.uid,
    vendorEnabled,
    recordingEnabled: false,
    at: now,
  });

  let vendorToken = null;
  if (action === 'join' && vendorEnabled) {
    vendorToken = mintStubVendorToken(sessionId, request.auth.uid, callerEmail);
  }

  logger.info('[joinParentVoiceSession]', {
    sessionId,
    action,
    participantRole,
    vendorEnabled,
  });

  return {
    ok: true,
    sessionId,
    action,
    vendorToken,
    vendorEnabled,
    metadataOnly: !vendorEnabled,
    recordingEnabled: false,
    disclosure:
      'Attendance (join and leave times) is logged for club compliance. ' +
      'Sessions are not recorded in v1.',
  };
});

exports.mintStubVendorToken = mintStubVendorToken;
exports.readParentVoiceEnabled = readParentVoiceEnabled;
