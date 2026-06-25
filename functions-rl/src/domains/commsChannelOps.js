'use strict';

/**
 * Epic 4.4 W1 — Parent Lounge channel provisioning.
 *
 * Provides:
 *   provisionParentLoungeChannel — internal reusable upsert (no auth context required).
 *   coachProvisionParentLounge   — onCall callable; coach/director-initiated provisioning.
 *
 * Channel path: clubs/{clubId}/channels/parent-lounge-{teamId}
 * Doc shape mirrors what sendChannelMessage (operativeOps.js) reads/validates:
 *   type, safesportMonitored, memberIds, ccParentEmails, teamId, clubId, name, createdAt.
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {normEmail} = require('../utils/formatters');
const {assertCoachMessageSender} = require('../middleware/authBouncers');
const {
  filterParentsWithCommsConsent,
} = require('./commsPolicy');

const REGION = 'us-east1';

/** Lazy Firestore accessor. */
const db = () => admin.firestore();

/**
 * Idempotent upsert of the per-team Parent Lounge group channel.
 *
 * Safe to call repeatedly: merges new coach/parent emails into memberIds and
 * ccParentEmails via arrayUnion; never overwrites existing messages or removes
 * existing members.
 *
 * COPPA/SafeSport: safesportMonitored is set true on creation and never
 * removed; sendChannelMessage enforces the monitored-callable path for writes.
 *
 * @param {{ clubId: string, teamId: string, coachEmails?: string[], parentEmails?: string[] }} params
 * @return {Promise<{ channelId: string }>}
 */
exports.provisionParentLoungeChannel = async ({
  clubId,
  teamId,
  coachEmails = [],
  parentEmails = [],
}) => {
  if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
    throw new Error('clubId is required.');
  }
  if (!teamId || typeof teamId !== 'string' || !teamId.trim()) {
    throw new Error('teamId is required.');
  }

  const normClubId = clubId.trim();
  const normTeamId = teamId.trim();
  const channelId = `parent-lounge-${normTeamId}`;

  const normCoachEmails = coachEmails
      .map((e) => normEmail(String(e)))
      .filter(Boolean);
  const normParentEmails = parentEmails
      .map((e) => normEmail(String(e)))
      .filter(Boolean);

  const allMemberEmails = [...new Set([...normCoachEmails, ...normParentEmails])];

  if (allMemberEmails.length === 0) {
    logger.warn(
        '[provisionParentLoungeChannel] no-op: no valid emails provided',
        {channelId, clubId: normClubId},
    );
    return {channelId};
  }

  const FieldValue = admin.firestore.FieldValue;
  const channelRef = db()
      .collection('clubs').doc(normClubId)
      .collection('channels').doc(channelId);

  const channelSnap = await channelRef.get();

  if (!channelSnap.exists) {
    // First-time creation: write all base fields.
    // ccParentEmails initialised to normParentEmails (may be empty at provision
    // time; sendChannelMessage re-enforces CC on first message send).
    await channelRef.set({
      type: 'group',
      name: 'Parent Lounge',
      safesportMonitored: true,
      teamId: normTeamId,
      clubId: normClubId,
      memberIds: allMemberEmails,
      ccParentEmails: normParentEmails,
      createdAt: FieldValue.serverTimestamp(),
      // createdBy: server-provisioned via Admin SDK (no caller uid available).
      createdBy: 'server',
    });
    logger.info('[provisionParentLoungeChannel] created', {
      channelId,
      clubId: normClubId,
      teamId: normTeamId,
      memberCount: allMemberEmails.length,
    });
  } else {
    // Idempotent upsert: arrayUnion new members without touching other fields.
    const updatePayload = {
      memberIds: FieldValue.arrayUnion(...allMemberEmails),
    };
    if (normParentEmails.length > 0) {
      updatePayload.ccParentEmails = FieldValue.arrayUnion(...normParentEmails);
    }
    await channelRef.set(updatePayload, {merge: true});
    logger.info('[provisionParentLoungeChannel] upserted members', {
      channelId,
      clubId: normClubId,
      teamId: normTeamId,
      addedCount: allMemberEmails.length,
    });
  }

  return {channelId};
};

/**
 * Epic 4.4 W1 — coach/director-initiated Parent Lounge provisioning.
 *
 * Auth: coach (own team only), director (own club only), or super_admin.
 * The caller's email is always included in memberIds so they can write via
 * sendChannelMessage immediately after provisioning.
 *
 * @param {{ teamId: string, coachEmails?: string[], parentEmails?: string[] }} data
 */
exports.coachProvisionParentLounge = onCall({region: REGION}, async (request) => {
  const actor = assertCoachMessageSender(request);

  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const extraCoachEmails = Array.isArray(data.coachEmails) ? data.coachEmails : [];
  const parentEmails = Array.isArray(data.parentEmails) ? data.parentEmails : [];

  if (!teamId) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }

  const tSnap = await db().collection('teams').doc(teamId).get();
  if (!tSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const clubId = typeof tSnap.data().clubId === 'string' ?
      tSnap.data().clubId.trim() :
      '';
  if (!clubId) {
    throw new HttpsError('failed-precondition', 'Team has no associated club.');
  }

  if (actor.role === 'coach' && actor.teamId !== teamId) {
    throw new HttpsError(
        'permission-denied',
        'You can only provision channels for your own team.',
    );
  }
  if (actor.role === 'director' && actor.clubId !== clubId) {
    throw new HttpsError('permission-denied', 'Team is not in your club.');
  }

  // Always include the calling coach/director so they are a channel member.
  const callerEmail = actor.email || '';
  const coachEmails = callerEmail ?
      [...new Set([callerEmail, ...extraCoachEmails])] :
      extraCoachEmails;

  const result = await exports.provisionParentLoungeChannel({
    clubId,
    teamId,
    coachEmails,
    parentEmails,
  });

  return {ok: true, ...result};
});

/**
 * Epic 4.4 W2 — auto-add a parent to their children's Parent Lounge channels.
 *
 * For each child email: reads `users/{childEmail}` (fallback: `player_lookup/{childEmail}`)
 * to resolve clubId + teamId, reads `teams/{teamId}` for coach email(s), then calls
 * `provisionParentLoungeChannel` idempotently.
 *
 * Also performs a merge-write of `users/{parentEmail}.clubId` using the first resolved
 * child clubId (or parentClubId if supplied) so the Firestore rule
 * `isParent() && userDoc().clubId == clubId` passes for channel reads.
 *
 * Fully defensive: per-child errors are logged and swallowed so the calling COPPA
 * waiver / household-link path is never blocked by comms provisioning failures.
 *
 * @param {{ parentEmail: string, childEmails: string[], parentClubId?: string }} params
 * @return {Promise<void>}
 */
exports.provisionLoungesForParentHousehold = async ({
  parentEmail,
  childEmails,
  parentClubId = '',
}) => {
  const normParent = normEmail(String(parentEmail || ''));
  if (!normParent) {
    logger.warn('[provisionLoungesForParentHousehold] no parentEmail — skipping');
    return;
  }

  const emails = Array.isArray(childEmails) ? childEmails : [];
  if (emails.length === 0) return;

  // Seed with parentClubId so the merge-write below is always a no-op when
  // the parent already has the correct clubId (the common case).
  let firstResolvedClubId = typeof parentClubId === 'string' && parentClubId.trim() ?
    parentClubId.trim() :
    null;

  for (const rawChild of emails) {
    const childEmail = normEmail(String(rawChild || ''));
    if (!childEmail) continue;

    try {
      let childClubId = null;
      let childTeamId = null;

      // Primary resolution: users/{childEmail}
      const uSnap = await db().collection('users').doc(childEmail).get();
      if (uSnap.exists) {
        const ud = uSnap.data();
        childClubId =
            typeof ud.clubId === 'string' && ud.clubId.trim() ? ud.clubId.trim() : null;
        childTeamId =
            typeof ud.teamId === 'string' && ud.teamId.trim() ? ud.teamId.trim() : null;
      }

      // Fallback: player_lookup/{childEmail}
      if (!childClubId || !childTeamId) {
        const plSnap = await db().collection('player_lookup').doc(childEmail).get();
        if (plSnap.exists) {
          const pl = plSnap.data();
          if (!childClubId && typeof pl.clubId === 'string' && pl.clubId.trim()) {
            childClubId = pl.clubId.trim();
          }
          if (!childTeamId && typeof pl.teamId === 'string' && pl.teamId.trim()) {
            childTeamId = pl.teamId.trim();
          }
        }
      }

      if (!childClubId || !childTeamId) {
        logger.info(
            '[provisionLoungesForParentHousehold] child has no club/team — skip',
            {childEmail},
        );
        continue;
      }

      if (!firstResolvedClubId) firstResolvedClubId = childClubId;

      // Resolve coach emails from teams/{teamId}.
      // Handles both coachEmail (string) and coachEmails (array) field shapes.
      let coachEmails = [];
      const teamSnap = await db().collection('teams').doc(childTeamId).get();
      if (teamSnap.exists) {
        const td = teamSnap.data();
        if (Array.isArray(td.coachEmails)) {
          coachEmails = td.coachEmails.map((e) => normEmail(String(e))).filter(Boolean);
        } else if (typeof td.coachEmail === 'string' && td.coachEmail.trim()) {
          const normed = normEmail(td.coachEmail);
          if (normed) coachEmails = [normed];
        }
      }

      await exports.provisionParentLoungeChannel({
        clubId: childClubId,
        teamId: childTeamId,
        coachEmails,
        parentEmails: [normParent],
      });

      logger.info('[provisionLoungesForParentHousehold] lounge provisioned', {
        parentEmail: normParent,
        childEmail,
        teamId: childTeamId,
        clubId: childClubId,
      });
    } catch (childErr) {
      logger.warn(
          '[provisionLoungesForParentHousehold] per-child provision failed (non-fatal)',
          {
            childEmail,
            err: childErr instanceof Error ? childErr.message : String(childErr),
          },
      );
    }
  }

  // Ensure parent user doc has the correct clubId so Firestore channel-read rules pass.
  if (firstResolvedClubId && normParent) {
    try {
      await db().collection('users').doc(normParent).set(
          {clubId: firstResolvedClubId},
          {merge: true},
      );
    } catch (clubIdErr) {
      logger.warn(
          '[provisionLoungesForParentHousehold] parent clubId merge failed (non-fatal)',
          {
            parentEmail: normParent,
            err: clubIdErr instanceof Error ? clubIdErr.message : String(clubIdErr),
          },
      );
    }
  }
};

/** Epic 4.14 — typed channel poster roles (server + system). */
const CHANNEL_TYPE_POSTERS = {
  team_logistics: new Set(['coach', 'director', 'team_manager', 'system']),
  registration: new Set(['registrar', 'director', 'system']),
  tryouts_events: new Set(['coach', 'director', 'system']),
  match_day: new Set(['coach', 'director', 'team_manager', 'system']),
};

const MONITORED_CHANNEL_TYPES = new Set(['team_logistics', 'parent_lounge']);

const COMMS_CHANNEL_LABELS = {
  registration: 'Registration',
  tryouts_events: 'Tryouts & events',
  match_day: 'Match day',
};

/**
 * Resolve typed channel doc id + message collection ref.
 * System channels: clubs/{clubId}/channels/{id}/messages
 * team_logistics sub-channels: teams/{teamId}/channels/{sub}/messages
 */
function resolveTypedChannelRefs({
  channelType,
  clubId,
  teamId = '',
  programId = '',
  householdId = '',
  subChannelId = 'general',
}) {
  const normClubId = String(clubId || '').trim();
  if (!normClubId) throw new Error('clubId is required.');

  if (channelType === 'team_logistics') {
    const normTeamId = String(teamId || '').trim();
    if (!normTeamId) throw new Error('teamId is required for team_logistics.');
    const sub = String(subChannelId || 'general').trim() || 'general';
    const channelRef = db().collection('teams').doc(normTeamId)
        .collection('channels').doc(sub);
    return {
      channelRef,
      messagesRef: channelRef.collection('messages'),
      channelId: sub,
    };
  }

  let channelId = '';
  if (channelType === 'registration') {
    const hid = String(householdId || '').trim();
    if (!hid) throw new Error('householdId is required for registration channel.');
    channelId = `registration-${hid}`;
  } else if (channelType === 'tryouts_events') {
    const pid = String(programId || '').trim();
    if (!pid) throw new Error('programId is required for tryouts_events channel.');
    channelId = `tryouts-events-${pid}`;
  } else if (channelType === 'match_day') {
    const normTeamId = String(teamId || '').trim();
    if (!normTeamId) throw new Error('teamId is required for match_day channel.');
    channelId = `match-day-${normTeamId}`;
  } else {
    throw new Error(`Unsupported channelType: ${channelType}`);
  }

  const channelRef = db()
      .collection('clubs').doc(normClubId)
      .collection('channels').doc(channelId);
  return {
    channelRef,
    messagesRef: channelRef.collection('messages'),
    channelId,
  };
}

/** Build parent delivery arrays for household-scoped system posts. */
async function resolveHouseholdParentDelivery(firestore, householdId, playerEmail = '') {
  /** @type {Array<{email: string, channels: string[]}>} */
  const parentDelivered = [];
  /** @type {Array<{email: string, reason: string}>} */
  const parentSkipped = [];

  if (!householdId) {
    return {parentDelivered, parentSkipped};
  }

  const hSnap = await firestore.collection('households').doc(householdId).get();
  if (!hSnap.exists) {
    return {parentDelivered, parentSkipped};
  }

  const parentEmails = Array.isArray(hSnap.data().parentEmails) ?
    hSnap.data().parentEmails.map((e) => normEmail(String(e))).filter(Boolean) :
    [];

  for (const email of parentEmails) {
    const consented = await filterParentsWithCommsConsent(
        firestore,
        [email],
        playerEmail || email,
    );
    if (consented.includes(email)) {
      parentDelivered.push({email, channels: ['in_app']});
    } else {
      parentSkipped.push({email, reason: 'consent_comms_declined'});
    }
  }

  return {parentDelivered, parentSkipped};
}

/**
 * Epic 4.14 — post a system message to a typed channel instance.
 * Messages path: clubs/{clubId}/channels/{channelId}/messages (system types)
 *   OR teams/{teamId}/channels/{sub}/messages (team_logistics).
 */
exports.postChannelSystemMessage = async ({
  channelType,
  clubId,
  teamId = '',
  programId = '',
  householdId = '',
  subChannelId = 'general',
  body,
  subject = '',
  sourceCallable = 'postChannelSystemMessage',
  actorRole = 'system',
  actorEmail = 'system',
  actorUid = 'system',
  guardianEmail = '',
  playerEmail = '',
}) => {
  const type = String(channelType || '').trim();
  if (!type || !CHANNEL_TYPE_POSTERS[type]) {
    throw new Error(`Invalid or unsupported channelType: ${channelType}`);
  }
  if (!CHANNEL_TYPE_POSTERS[type].has(actorRole)) {
    throw new Error(`Role "${actorRole}" cannot post to channelType "${type}".`);
  }
  const bodyRaw = String(body || '').trim();
  if (!bodyRaw) throw new Error('body is required.');

  const {channelRef, messagesRef, channelId} = resolveTypedChannelRefs({
    channelType: type,
    clubId,
    teamId,
    programId,
    householdId,
    subChannelId,
  });

  const FieldValue = admin.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();
  const normClubId = String(clubId || '').trim();

  /** @type {Record<string, unknown>} */
  const channelPayload = {
    channelType: type,
    clubId: normClubId,
    audienceScope: type === 'registration' ? 'household' : 'channel_members',
    updatedAt: now,
  };
  if (teamId) channelPayload.teamId = String(teamId).trim();
  if (programId) channelPayload.programId = String(programId).trim();
  if (householdId) channelPayload.householdId = String(householdId).trim();
  if (type === 'team_logistics') {
    channelPayload.name = `Team logistics — ${subChannelId}`;
    channelPayload.type = 'group';
    channelPayload.safesportMonitored = true;
  }
  if (type === 'registration' || type === 'tryouts_events' || type === 'match_day') {
    channelPayload.type = 'broadcast';
    channelPayload.name = COMMS_CHANNEL_LABELS[type] || type;
    channelPayload.systemChannel = true;
  }
  await channelRef.set(channelPayload, {merge: true});

  let parentDelivered = [];
  let parentSkipped = [];
  if (type === 'registration' && householdId) {
    const delivery = await resolveHouseholdParentDelivery(
        db(),
        String(householdId).trim(),
        playerEmail,
    );
    parentDelivered = delivery.parentDelivered;
    parentSkipped = delivery.parentSkipped;
  } else if (type === 'tryouts_events' && guardianEmail) {
    const gEmail = normEmail(guardianEmail);
    const consented = await filterParentsWithCommsConsent(
        db(),
        [gEmail],
        playerEmail || gEmail,
    );
    if (consented.includes(gEmail)) {
      parentDelivered = [{email: gEmail, channels: ['in_app']}];
    } else if (gEmail) {
      parentSkipped = [{email: gEmail, reason: 'consent_comms_declined'}];
    }
  }

  const messageRef = messagesRef.doc();
  /** @type {Record<string, unknown>} */
  const messagePayload = {
    channelType: type,
    system: true,
    sourceCallable,
    actorRole,
    actorEmail: normEmail(actorEmail) || 'system',
    senderId: actorUid,
    senderName: actorRole === 'system' ? 'System' : actorRole,
    senderRole: actorRole,
    subject: subject ? String(subject).trim().slice(0, 200) : null,
    text: bodyRaw.slice(0, 8000),
    body: bodyRaw.slice(0, 8000),
    timestamp: now,
    createdAt: now,
    deleted: false,
  };
  if (householdId) messagePayload.householdId = String(householdId).trim();
  if (programId) messagePayload.programId = String(programId).trim();
  if (guardianEmail) messagePayload.guardianEmail = normEmail(guardianEmail);
  if (teamId) messagePayload.teamId = String(teamId).trim();
  if (parentDelivered.length) messagePayload.parentDelivered = parentDelivered;
  if (parentSkipped.length) messagePayload.parentSkipped = parentSkipped;

  await messageRef.set(messagePayload);

  if (MONITORED_CHANNEL_TYPES.has(type)) {
    try {
      await db().collection('messaging_audit').add({
        action: 'channel_system_post',
        channelType: type,
        clubId: normClubId,
        teamId: teamId || null,
        channelId,
        messageId: messageRef.id,
        actorRole,
        actorEmail: normEmail(actorEmail) || 'system',
        sourceCallable,
        createdAt: now,
      });
    } catch (auditErr) {
      logger.warn('[postChannelSystemMessage] messaging_audit write failed (non-fatal)', {
        err: auditErr instanceof Error ? auditErr.message : String(auditErr),
      });
    }
  }

  const deliveryReport = {
    messageId: messageRef.id,
    channelType: type,
    audienceScope: channelPayload.audienceScope,
    parentDelivered,
    parentSkipped,
    teamId: teamId || undefined,
    channelId,
  };

  logger.info('[postChannelSystemMessage] posted', {
    channelType: type,
    channelId,
    messageId: messageRef.id,
    sourceCallable,
  });

  return {
    messageId: messageRef.id,
    channelType: type,
    parentDelivered,
    parentSkipped,
    deliveryReport,
  };
};

/**
 * Coach schedule announce → team_logistics sub-channel (+ match_day when game).
 */
exports.mirrorScheduleToLogistics = onCall({region: REGION}, async (request) => {
  const actor = assertCoachMessageSender(request);
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const kind = typeof data.kind === 'string' ? data.kind.trim() : 'practice';
  const name = typeof data.name === 'string' ? data.name.trim() : 'Event';
  const subject =
    typeof data.subject === 'string' && data.subject.trim() ?
      data.subject.trim() :
      `New ${kind === 'game' ? 'Game' : 'Practice'}: ${name}`;
  const body =
    typeof data.body === 'string' && data.body.trim() ?
      data.body.trim() :
      `${name} has been added to the team schedule.`;

  if (!teamId) {
    throw new HttpsError('invalid-argument', 'teamId is required.');
  }

  const tSnap = await db().collection('teams').doc(teamId).get();
  if (!tSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const clubId = typeof tSnap.data().clubId === 'string' ? tSnap.data().clubId.trim() : '';
  if (!clubId) {
    throw new HttpsError('failed-precondition', 'Team has no clubId.');
  }

  const subChannelId = kind === 'game' ? 'game-day' : 'practice-sessions';
  const actorRole = actor.role || 'coach';

  const logisticsResult = await exports.postChannelSystemMessage({
    channelType: 'team_logistics',
    clubId,
    teamId,
    subChannelId,
    body,
    subject,
    sourceCallable: 'mirrorScheduleToLogistics',
    actorRole,
    actorEmail: actor.email || '',
    actorUid: actor.uid || 'system',
  });

  let matchDayResult = null;
  if (kind === 'game') {
    try {
      matchDayResult = await exports.postChannelSystemMessage({
        channelType: 'match_day',
        clubId,
        teamId,
        body,
        subject,
        sourceCallable: 'mirrorScheduleToLogistics',
        actorRole,
        actorEmail: actor.email || '',
        actorUid: actor.uid || 'system',
      });
    } catch (matchErr) {
      logger.warn('[mirrorScheduleToLogistics] match_day mirror failed (non-fatal)', {
        teamId,
        err: matchErr instanceof Error ? matchErr.message : String(matchErr),
      });
    }
  }

  return {ok: true, logistics: logisticsResult, matchDay: matchDayResult};
});
