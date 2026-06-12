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
