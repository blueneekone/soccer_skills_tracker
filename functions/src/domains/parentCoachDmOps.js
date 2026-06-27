'use strict';

/**
 * COMMS-PARENT-COACH-DM — bilateral parent↔coach DM threads.
 * Authority: docs/vision/COMMS_PLATFORM_STANDARDS.md §4.2
 *
 * Path: clubs/{clubId}/parent_coach_threads/{threadId}/messages
 * Club flag: clubs/{clubId}/settings/comms.includeAdOnParentDms (default false)
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
  filterParentsWithCommsConsent,
  resolvePlayerGuardianEmails,
} = require('./commsPolicy');
const {sendFcmToUids} = require('./notificationOps');

const REGION = 'us-east1';

/** @return {FirebaseFirestore.Firestore} */
const db = () => admin.firestore();

/**
 * @param {string} teamId
 * @param {string} parentEmail
 * @param {string} coachEmail
 * @return {string}
 */
function buildParentCoachThreadId(teamId, parentEmail, coachEmail) {
  const parent = normEmail(parentEmail);
  const coach = normEmail(coachEmail);
  const digest = crypto
      .createHash('sha256')
      .update(`${teamId}|${parent}|${coach}`)
      .digest('hex')
      .slice(0, 24);
  return `pc-${teamId}-${digest}`;
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
 * @param {string} clubId
 * @return {Promise<boolean>}
 */
async function readIncludeAdOnParentDms(clubId) {
  const snap = await db()
      .collection('clubs').doc(clubId)
      .collection('settings').doc('comms')
      .get();
  if (!snap.exists) return false;
  return snap.data().includeAdOnParentDms === true;
}

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 * @param {string} coachEmail
 */
async function assertCoachClearanceGate(request, coachEmail) {
  if (request.auth?.token?.isCleared === true) return;
  const snap = await db().collection('users').doc(normEmail(coachEmail)).get();
  const status =
    snap.exists &&
    typeof snap.data().clearance === 'object' &&
    snap.data().clearance !== null &&
    typeof snap.data().clearance.status === 'string' ?
      snap.data().clearance.status :
      'pending';
  if (status !== 'cleared') {
    throw new HttpsError(
        'failed-precondition',
        'Coach background clearance is required before messaging parents.',
    );
  }
}

/**
 * @param {string} parentEmail
 * @param {string} teamId
 * @return {Promise<{ playerEmail: string }>}
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
    if (guardians.includes(parent)) {
      return {playerEmail};
    }
  }

  throw new HttpsError(
      'permission-denied',
      'Parent is not linked to a rostered athlete on this team.',
  );
}

/**
 * @param {string} coachEmail
 * @param {string} teamId
 * @param {Record<string, unknown>} teamData
 */
function assertCoachOnTeam(coachEmail, teamId, teamData) {
  const coach = normEmail(coachEmail);
  const coaches = resolveTeamCoachEmails(teamData);
  if (!coaches.includes(coach)) {
    throw new HttpsError(
        'permission-denied',
        'Coach is not assigned to this team.',
    );
  }
}

/**
 * @param {string} role
 */
function blockMinorPersona(role) {
  if (role === 'player') {
    throw new HttpsError(
        'permission-denied',
        'SafeSport policy: players cannot access parent↔coach direct messages.',
    );
  }
}

/**
 * Build deliveryReport for coach-initiated sends (staff send contract).
 * @param {string} messageId
 * @param {string} teamId
 * @param {string} parentEmail
 * @param {boolean} consented
 * @return {object}
 */
function buildCoachSendDeliveryReport(messageId, teamId, parentEmail, consented) {
  const parent = normEmail(parentEmail);
  return {
    messageId,
    audienceScope: 'channel_members',
    rosterAthleteCount: 0,
    parentDelivered: consented ?
      [{email: parent, channels: ['in_app']}] :
      [],
    parentSkipped: consented ?
      [] :
      [{email: parent, reason: 'consent_comms_declined'}],
    ccParentEmails: [],
    teamId,
  };
}

/**
 * @param {string} email
 * @return {Promise<string>}
 */
async function resolveUidForEmail(email) {
  try {
    const rec = await admin.auth().getUserByEmail(normEmail(email));
    return rec.uid || '';
  } catch {
    return '';
  }
}

/**
 * Send a message in a parent↔coach bilateral thread.
 *
 * Input:
 *   clubId, teamId, body — required
 *   parentEmail — required when caller is coach
 *   coachEmail — required when caller is parent
 *   threadId — optional (derived when omitted)
 */
exports.sendParentCoachMessage = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const callerRole = request.auth.token.role || 'player';
  blockMinorPersona(callerRole);

  const callerEmail = normEmail(request.auth.token.email);
  if (!callerEmail) {
    throw new HttpsError('unauthenticated', 'Authenticated email is missing.');
  }

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const bodyRaw = typeof data.body === 'string' ? data.body.trim() : '';
  let parentEmail = typeof data.parentEmail === 'string' ?
    normEmail(data.parentEmail) :
    '';
  let coachEmail = typeof data.coachEmail === 'string' ?
    normEmail(data.coachEmail) :
    '';

  if (!clubId || !teamId || !bodyRaw) {
    throw new HttpsError(
        'invalid-argument',
        'clubId, teamId, and body are required.',
    );
  }
  if (bodyRaw.length > 4000) {
    throw new HttpsError('invalid-argument', 'Message body exceeds 4000 characters.');
  }

  if (callerRole === 'director' || callerRole === 'global_admin' || callerRole === 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Directors have read-only access when includeAdOnParentDms is enabled — they cannot post.',
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

  /** @type {'parent' | 'coach'} */
  let senderRole;
  if (callerRole === 'parent') {
    const parentActor = await assertParentAsync(request);
    parentEmail = parentActor.email;
    if (!coachEmail) {
      const coaches = resolveTeamCoachEmails(teamData);
      if (coaches.length === 0) {
        throw new HttpsError('failed-precondition', 'No coach is assigned to this team.');
      }
      coachEmail = coaches[0];
    }
    await assertParentLinkedToTeam(parentEmail, teamId);
    assertCoachOnTeam(coachEmail, teamId, teamData);
    senderRole = 'parent';
  } else if (callerRole === 'coach') {
    const actor = assertCoachMessageSender(request);
    if (actor.teamId !== teamId) {
      throw new HttpsError('permission-denied', 'You can only message parents on your team.');
    }
    coachEmail = actor.email || callerEmail;
    if (!parentEmail) {
      throw new HttpsError('invalid-argument', 'parentEmail is required when sending as coach.');
    }
    await assertCoachClearanceGate(request, coachEmail);
    await assertParentLinkedToTeam(parentEmail, teamId);
    assertCoachOnTeam(coachEmail, teamId, teamData);
    senderRole = 'coach';
  } else {
    throw new HttpsError(
        'permission-denied',
        'Only parents and coaches may use parent↔coach direct messages.',
    );
  }

  const includeAdOnParentDms = await readIncludeAdOnParentDms(clubId);
  const threadId =
    typeof data.threadId === 'string' && data.threadId.trim() ?
      data.threadId.trim() :
      buildParentCoachThreadId(teamId, parentEmail, coachEmail);

  const threadRef = db()
      .collection('clubs').doc(clubId)
      .collection('parent_coach_threads').doc(threadId);
  const threadSnap = await threadRef.get();
  const FieldValue = admin.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();

  if (!threadSnap.exists) {
    await threadRef.set({
      channelType: 'parent_coach_dm',
      clubId,
      teamId,
      parentEmail,
      coachEmail,
      participantEmails: [parentEmail, coachEmail],
      includeAdOnParentDms,
      createdAt: now,
      lastMessageAt: now,
    });
  } else {
    const existing = threadSnap.data() || {};
    if (
      normEmail(String(existing.parentEmail || '')) !== parentEmail ||
      normEmail(String(existing.coachEmail || '')) !== coachEmail
    ) {
      throw new HttpsError('permission-denied', 'Thread participants do not match.');
    }
    await threadRef.set({
      includeAdOnParentDms,
      lastMessageAt: now,
    }, {merge: true});
  }

  let deliveryReport = null;
  let messagePersisted = true;

  if (senderRole === 'coach') {
    const parentLink = await assertParentLinkedToTeam(parentEmail, teamId);
    const consentedParents = await filterParentsWithCommsConsent(
        db(),
        [parentEmail],
        parentLink.playerEmail,
    );
    messagePersisted = consentedParents.includes(parentEmail);
  }

  const msgRef = threadRef.collection('messages').doc();
  const bodyPreview = bodyRaw.length > 200 ?
    bodyRaw.slice(0, 200) + '\u2026' :
    bodyRaw;

  if (messagePersisted) {
    await msgRef.set({
      channelType: 'parent_coach_dm',
      threadId,
      clubId,
      teamId,
      fromEmail: callerEmail,
      fromRole: senderRole,
      parentEmail,
      coachEmail,
      body: bodyRaw,
      bodyPreview,
      createdAt: now,
    });
  }

  await db().collection('messaging_audit').doc().set({
    action: 'parent_coach_dm_message',
    channelType: 'parent_coach_dm',
    threadId,
    clubId,
    teamId,
    fromEmail: callerEmail,
    fromRole: senderRole,
    parentEmail,
    coachEmail,
    messageId: messagePersisted ? msgRef.id : null,
    delivered: messagePersisted,
    bodyPreview,
    bodyLength: bodyRaw.length,
    includeAdOnParentDms,
    actorUid: request.auth.uid,
    at: now,
  });

  if (senderRole === 'coach') {
    deliveryReport = buildCoachSendDeliveryReport(
        messagePersisted ? msgRef.id : threadId,
        teamId,
        parentEmail,
        messagePersisted,
    );

    if (messagePersisted) {
      try {
        const parentUid = await resolveUidForEmail(parentEmail);
        if (parentUid) {
          await sendFcmToUids(
              [parentUid],
              {
                title: 'Message from your coach',
                body: bodyPreview,
              },
              {category: 'push_messages'},
          );
        }
      } catch (pushErr) {
        logger.warn('[sendParentCoachMessage] push failed (non-fatal)', {
          err: pushErr instanceof Error ? pushErr.message : String(pushErr),
        });
      }
    }
  } else if (messagePersisted) {
    try {
      const coachUid = await resolveUidForEmail(coachEmail);
      if (coachUid) {
        await sendFcmToUids(
            [coachUid],
            {
              title: 'Message from a parent',
              body: bodyPreview,
            },
            {category: 'push_messages'},
        );
      }
    } catch (pushErr) {
      logger.warn('[sendParentCoachMessage] push failed (non-fatal)', {
        err: pushErr instanceof Error ? pushErr.message : String(pushErr),
      });
    }
  }

  logger.info('[sendParentCoachMessage] sent', {
    threadId,
    clubId,
    teamId,
    senderRole,
    delivered: messagePersisted,
  });

  return {
    ok: true,
    threadId,
    messageId: messagePersisted ? msgRef.id : null,
    delivered: messagePersisted,
    includeAdOnParentDms,
    deliveryReport,
  };
});

/**
 * List bilateral threads for the caller (director read-only when club flag set).
 *
 * Input: clubId (required), teamId (optional filter)
 */
exports.listParentCoachDmThreads = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const callerRole = request.auth.token.role || 'player';
  blockMinorPersona(callerRole);

  const callerEmail = normEmail(request.auth.token.email);
  const callerClubId = request.auth.token.clubId || request.auth.token.tenantId || '';

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';

  if (!clubId) {
    throw new HttpsError('invalid-argument', 'clubId is required.');
  }

  const includeAdOnParentDms = await readIncludeAdOnParentDms(clubId);
  /** @type {FirebaseFirestore.Query} */
  let q = db()
      .collection('clubs').doc(clubId)
      .collection('parent_coach_threads');

  if (callerRole === 'parent') {
    q = q.where('parentEmail', '==', callerEmail);
  } else if (callerRole === 'coach') {
    q = q.where('coachEmail', '==', callerEmail);
  } else if (
    (callerRole === 'director' || callerRole === 'global_admin' || callerRole === 'super_admin') &&
    includeAdOnParentDms
  ) {
    if (callerRole === 'director' && callerClubId !== clubId) {
      throw new HttpsError('permission-denied', 'Club scope mismatch.');
    }
  } else {
    throw new HttpsError(
        'permission-denied',
        'You cannot list parent↔coach threads.',
    );
  }

  if (teamId) {
    q = q.where('teamId', '==', teamId);
  }

  const snap = await q.limit(50).get();
  const threads = snap.docs.map((d) => {
    const x = d.data();
    return {
      threadId: d.id,
      clubId: String(x.clubId || clubId),
      teamId: String(x.teamId || ''),
      parentEmail: String(x.parentEmail || ''),
      coachEmail: String(x.coachEmail || ''),
      includeAdOnParentDms: x.includeAdOnParentDms === true,
      lastMessageAt: x.lastMessageAt || null,
    };
  });

  return {
    ok: true,
    threads,
    includeAdOnParentDms,
    readOnly: callerRole === 'director' && includeAdOnParentDms,
  };
});

exports.buildParentCoachThreadId = buildParentCoachThreadId;
