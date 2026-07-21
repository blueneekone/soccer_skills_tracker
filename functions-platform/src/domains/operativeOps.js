'use strict';

const crypto = require('crypto');
const {onCall} = require('firebase-functions/v2/https');
const {HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const {normEmail, normOperativeCallsignSlug, computeAgeYears} =
    require('../utils/formatters');
const {
  assertSuperAdmin,
  assertParent,
  assertParentAsync,
  assertCoachMessageSender,
} = require('../middleware/authBouncers');
const {
  assertStaffMayDirectMessagePlayer,
  filterParentsWithCommsConsent,
  isStaffRole,
  resolveIsMinor,
} = require('./commsPolicy');
const {sendFcmToUids} = require('./notificationOps');
const {provisionLoungesForParentHousehold} = require('./commsChannelOps');
const {buildBaseCustomClaims} = require('../auth/customClaims');
const {assertChildInParentHousehold, reconcileParentHouseholdGraph} =
  require('./householdMembership');
const {resolveGuardiansForPlayers} = require('../utils/guardianResolver');
const {sanitizeChannelPayload} = require('../utils/channelSecurityGuard');

const REGION = 'us-east1';

/**
 * Stamp JWT team scope immediately after parent links operative (do not wait for syncUserClaims).
 * @param {string} childUid
 * @param {Record<string, unknown>} userDoc users/{email} snapshot data
 * @param {string} teamId
 * @param {string} clubId
 * @param {string} householdId
 */
async function stampOperativeTeamClaims(childUid, userDoc, teamId, clubId, householdId) {
  let existingClaims = {};
  try {
    const authUser = await admin.auth().getUser(childUid);
    existingClaims = authUser.customClaims || {};
  } catch (err) {
    logger.warn('[stampOperativeTeamClaims] read existing claims failed', {
      childUid,
      err: err instanceof Error ? err.message : String(err),
    });
  }
  const mergedUserData = {
    ...(userDoc && typeof userDoc === 'object' ? userDoc : {}),
    role: 'player',
    teamId,
    clubId,
    householdId,
  };
  const baseClaims = buildBaseCustomClaims(mergedUserData);
  if (!baseClaims) return;
  await admin.auth().setCustomUserClaims(childUid, {
    ...existingClaims,
    ...baseClaims,
    vpcVerified: existingClaims.vpcVerified === true || baseClaims.vpcVerified === true,
    minor: existingClaims.minor === true || baseClaims.minor === true,
  });
}

/** Lazy Firestore accessor — defers init until first call. */
const db = () => admin.firestore();

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Normalize team invite codes (e.g. AG-7B2X) for lookup.
 * @param {unknown} raw
 * @return {string}
 */
function normTeamInviteCode(raw) {
  if (raw == null || typeof raw !== 'string') {
    return '';
  }
  const t = raw.trim();
  if (!t) {
    return '';
  }
  return t
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/^(.{2})(.{4})$/, '$1-$2');
}

/**
 * Resolve a team doc from dispatch code within a parent club scope.
 * @param {string} teamCodeNorm
 * @param {string} clubId
 * @return {Promise<{teamRef: FirebaseFirestore.DocumentReference, teamId: string}>}
 */
async function resolveTeamByInviteCodeForClub(teamCodeNorm, clubId) {
  if (!teamCodeNorm) {
    throw new HttpsError('invalid-argument', 'teamInviteCode is required.');
  }
  const tq = await db()
      .collection('teams')
      .where('inviteCode', '==', teamCodeNorm)
      .limit(2)
      .get();
  if (tq.empty) {
    throw new HttpsError(
        'not-found',
        'No team matches this team dispatch code. Check with the coach and try again.',
    );
  }
  if (tq.size > 1) {
    throw new HttpsError(
        'failed-precondition',
        'Multiple teams share this code. Contact the club to resolve.',
    );
  }
  const tdoc = tq.docs[0];
  const tData = tdoc.data();
  const tidClub =
      typeof tData.clubId === 'string' ? tData.clubId.trim() : '';
  if (tidClub !== clubId) {
    throw new HttpsError(
        'permission-denied',
        'That team is not in your club. Use a code from your organization.',
    );
  }
  return {teamRef: tdoc.ref, teamId: tdoc.id};
}

/**
 * @param {number} n Length
 * @return {string} Random A–Z0-9 string
 */
function randomAlphaNumChunk(n) {
  const cs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const buf = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) {
    s += cs[buf[i] % cs.length];
  }
  return s;
}

/**
 * 6 characters + hyphen, e.g. A7K-2M9P (XXX-XXX).
 * @return {string}
 */
function generateOtpCodeString() {
  return `${randomAlphaNumChunk(3)}-${randomAlphaNumChunk(3)}`;
}

/**
 * @param {unknown} raw
 * @return {string} Normalized doc id, e.g. A7K-2M9P
 */
function normOtpCode(raw) {
  if (raw == null || typeof raw !== 'string') {
    return '';
  }
  const alnum = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (alnum.length !== 6) {
    return '';
  }
  return `${alnum.slice(0, 3)}-${alnum.slice(3)}`;
}

/**
 * Resolves a player auth UID for OTP login. Queries (in order):
 * `users` doc by email, else `users` where `operativeCallsignSlug`, else
 * `users` where `playerName` (exact, case-sensitive in Firestore).
 * @param {string} raw Username, callsign, or email (pre-trim/lower in callers as needed)
 * @return {Promise<string>} Firebase Auth UID
 */
async function resolveUserUidFromUsernameOrCallsign(raw) {
  const u = typeof raw === 'string' ? raw.trim() : '';
  if (!u) {
    throw new HttpsError('invalid-argument', 'username is required.');
  }
  if (u.includes('@')) {
    const em = normEmail(u);
    if (!em) {
      throw new HttpsError('invalid-argument', 'Invalid email.');
    }
    const us = await db().collection('users').doc(em).get();
    if (!us.exists) {
      throw new HttpsError('not-found', 'No user found for that email.');
    }
    const role = us.data().role;
    if (role && role !== 'player') {
      throw new HttpsError(
          'failed-precondition',
          'That account is not a player profile.',
      );
    }
    try {
      const rec = await admin.auth().getUserByEmail(em);
      return rec.uid;
    } catch (e) {
      if (e && e.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', 'No sign-in account for that email.');
      }
      throw e;
    }
  }
  const operSlug = normOperativeCallsignSlug(u);
  if (operSlug.length >= 2) {
    const operQ = await db()
        .collection('users')
        .where('operativeCallsignSlug', '==', operSlug)
        .limit(2)
        .get();
    if (!operQ.empty) {
      if (operQ.size > 1) {
        throw new HttpsError(
            'failed-precondition',
            'Multiple operatives share that callsign. Use the proxy email for sign-in instead.',
        );
      }
      const em = operQ.docs[0].id;
      const d = operQ.docs[0].data() || {};
      if (d.role && d.role !== 'player') {
        throw new HttpsError(
            'failed-precondition',
            'That account is not a player profile.',
        );
      }
      try {
        const rec = await admin.auth().getUserByEmail(em);
        return rec.uid;
      } catch (e) {
        if (e && e.code === 'auth/user-not-found') {
          throw new HttpsError('not-found', 'No sign-in account for that callsign.');
        }
        throw e;
      }
    }
  }
  const q = await db()
      .collection('users')
      .where('playerName', '==', u)
      .limit(2)
      .get();
  if (q.empty) {
    throw new HttpsError(
        'not-found',
        'No player matches that name or callsign.',
    );
  }
  if (q.size > 1) {
    throw new HttpsError(
        'failed-precondition',
        'Multiple players share that name. Use your sign-in email instead.',
    );
  }
  const em = q.docs[0].id;
  const rec = await admin.auth().getUserByEmail(em);
  return rec.uid;
}

// ── Exported callable functions ──────────────────────────────────────────────

/**
 * SafeSport / Epic 1.4 + Sprint 4.2: coach or director sends in-app message to a
 * rostered adult athlete (18+). Minors are blocked — use parent-targeted broadcasts.
 */
/**
 * SafeSport: createCommsChannel ensures zero-trust channel creation.
 */
exports.createCommsChannel = onCall({region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const callerUid = request.auth.uid;
  const callerRole = request.auth.token.role || 'player';
  const cleanPayload = sanitizeChannelPayload(request.data || {});

  const { clubId, teamId, name, type, memberIds } = cleanPayload;
  if (!clubId) throw new HttpsError('invalid-argument', 'clubId is required');

  // Enforce caller membership
  const callerEmail = normEmail(request.auth.token.email);
  if (callerEmail && !memberIds.includes(callerEmail)) {
    memberIds.push(callerEmail);
  }

  let ccParentEmails = [];
  let safesportMonitored = false;
  const isStaffShadow = ['coach', 'director', 'super_admin', 'global_admin'].includes(callerRole);

  if (isStaffShadow) {
    const playersInChannel = [];
    // b815 Guard: check for db instance existence implicitly by admin.firestore()
    for (const member of memberIds) {
      if (member === callerEmail) continue;
      const snap = await admin.firestore().collection('users').doc(member).get();
      if (snap.exists) {
        const d = snap.data();
        if (d.role === 'player') {
          if (d.isMinor) {
             throw new HttpsError('permission-denied', 'SafeSport: direct chat with minor athletes is blocked. Use Logistics → parent announcements.');
          }
          playersInChannel.push(member);
        }
      }
    }
    if (playersInChannel.length > 0) {
      ccParentEmails = await resolveGuardiansForPlayers(admin.firestore(), clubId, playersInChannel);
      safesportMonitored = ccParentEmails.length > 0;
      if (ccParentEmails.length === 0) {
          throw new HttpsError('permission-denied', 'Link a parent/guardian to this player (household) before starting a chat.');
      }
    }
  }

  const finalMemberIds = [...new Set([...memberIds, ...ccParentEmails])].sort();
  const channelData = {
    name: name || 'Group chat', type: type || 'group',
    memberIds: finalMemberIds, ccParentEmails,
    safesportMonitored, teamId: teamId || null,
    createdBy: callerUid, createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const col = admin.firestore().collection('clubs').doc(clubId).collection('channels');
  const ref = await col.add(channelData);

  return { id: ref.id, safesportMonitored, ccCount: ccParentEmails.length };
});

exports.sendCoachPlayerMessage = onCall({region: REGION}, async (request) => {
  const actor = assertCoachMessageSender(request);
  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const playerName =
      typeof data.playerName === 'string' ? data.playerName.trim() : '';
  const bodyRaw = typeof data.body === 'string' ? data.body.trim() : '';
  if (!teamId || !playerName || !bodyRaw) {
    throw new HttpsError(
        'invalid-argument',
        'teamId, playerName, and body are required.',
    );
  }
  if (bodyRaw.length > 4000) {
    throw new HttpsError(
        'invalid-argument',
        'Message too long (max 4000 characters).',
    );
  }

  const tSnap = await db().collection('teams').doc(teamId).get();
  if (!tSnap.exists) {
    throw new HttpsError('not-found', 'Team not found.');
  }
  const teamClubId = tSnap.data().clubId || null;

  if (actor.role === 'coach' && actor.teamId !== teamId) {
    throw new HttpsError(
        'permission-denied',
        'You can only message your team.',
    );
  }
  if (actor.role === 'director') {
    if (!teamClubId || teamClubId !== actor.clubId) {
      throw new HttpsError(
          'permission-denied',
          'Team is not in your club.',
      );
    }
  }

  const lookupSnap = await db().collection('player_lookup')
      .where('teamId', '==', teamId)
      .where('playerName', '==', playerName)
      .limit(2)
      .get();

  if (lookupSnap.empty) {
    throw new HttpsError(
        'failed-precondition',
        'Add the athlete login email on the roster before messaging.',
    );
  }
  if (lookupSnap.size > 1) {
    throw new HttpsError(
        'failed-precondition',
        'Duplicate roster links for this name; resolve in Firestore.',
    );
  }

  const toPlayerEmail = normEmail(lookupSnap.docs[0].id);
  if (!toPlayerEmail) {
    throw new HttpsError('failed-precondition', 'Invalid player email key.');
  }

  const uSnap = await db().collection('users').doc(toPlayerEmail).get();
  if (!uSnap.exists) {
    throw new HttpsError(
        'failed-precondition',
        'Athlete has not finished account setup.',
    );
  }
  const u = uSnap.data();
  if (u.teamId !== teamId) {
    throw new HttpsError('failed-precondition', 'Athlete is not on this team.');
  }

  // Sprint 4.2 — household-only charter: block staff→minor direct mail entirely.
  assertStaffMayDirectMessagePlayer(u);

  const actorEmail = actor.email || '';
  if (normEmail(actorEmail) === toPlayerEmail) {
    throw new HttpsError('invalid-argument', 'Cannot message yourself.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const bodyPreview = bodyRaw.length > 200 ?
    bodyRaw.slice(0, 200) + '\u2026' :
    bodyRaw;

  const msgRef = db().collection('in_app_messages').doc();
  const batch = db().batch();

  batch.set(msgRef, {
    teamId,
    teamClubId: teamClubId || null,
    fromEmail: actorEmail,
    toPlayerEmail,
    toPlayerName: playerName,
    body: bodyRaw,
    bodyPreview,
    minorRecipient: false,
    ccParentEmails: [],
    createdAt: now,
    createdByRole: actor.role,
  });

  batch.set(db().collection('messaging_audit').doc(), {
    action: 'coach_player_message',
    messageId: msgRef.id,
    teamId,
    fromEmail: actorEmail,
    toPlayerEmail,
    toPlayerName: playerName,
    minorRecipient: false,
    ccParentEmails: [],
    bodyPreview,
    bodyLength: bodyRaw.length,
    actorUid: request.auth.uid,
    at: now,
  });

  await batch.commit();

  // Epic 4.3 — push the player on DM delivery (non-fatal; never breaks the send path).
  try {
    let playerUid = '';
    try {
      const ur = await admin.auth().getUserByEmail(toPlayerEmail);
      playerUid = ur && ur.uid ? ur.uid : '';
    } catch (_) {
      /* player has no Auth account — skip push */
    }
    if (playerUid) {
      await sendFcmToUids(
          [playerUid],
          {
            title: 'New message from your coach',
            body: bodyPreview,
          },
          {category: 'push_messages'},
      );
    }
  } catch (e) {
    logger.warn('[sendCoachPlayerMessage] push failed (non-fatal)', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  return {
    ok: true,
    messageId: msgRef.id,
    minorRecipient: false,
    ccCount: 0,
    warnNoCc: false,
  };
});

/**
 * Sprint 1.3 — SafeSport Comms: server-enforced message send for the Comms Hub.
 *
 * For channels where safesportMonitored === true, Firestore Rules block direct
 * client addDoc; all messages MUST route through this callable so the server can:
 *   1. Verify the caller is a current channel member (cannot be spoofed client-side).
 *   2. Re-resolve and atomically re-add any parent emails dropped from memberIds
 *      after channel creation (e.g., removed manually or household updated).
 *   3. Write the message via Admin SDK with safesportMonitored: true stamped on it.
 *   4. Create an immutable messaging_audit record for director compliance review.
 *
 * @param {{ clubId: string, channelId: string, text: string }} data
 */
exports.sendChannelMessage = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const callerEmail = normEmail(request.auth.token.email);
  const callerUid = request.auth.uid;
  const callerRole = request.auth.token.role || 'player';

  if (!callerEmail) {
    throw new HttpsError('unauthenticated', 'Authenticated email is missing.');
  }

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const channelId = typeof data.channelId === 'string' ? data.channelId.trim() : '';
  const rawText = typeof data.text === 'string' ? data.text.trim() : '';

  if (!clubId || !channelId || !rawText) {
    throw new HttpsError(
        'invalid-argument',
        'clubId, channelId, and text are required.',
    );
  }
  if (rawText.length > 8000) {
    throw new HttpsError(
        'invalid-argument',
        'Message too long (max 8000 characters).',
    );
  }

  // Resolve display name server-side (not trusted from client).
  let callerName = callerEmail.split('@')[0];
  const callerUserSnap = await db().collection('users').doc(callerEmail).get();
  if (callerUserSnap.exists) {
    const cd = callerUserSnap.data();
    const pn = typeof cd.playerName === 'string' ? cd.playerName.trim() : '';
    const dn = typeof cd.displayName === 'string' ? cd.displayName.trim() : '';
    callerName = pn || dn || callerName;
  }

  // Load and validate the channel doc.
  const channelRef = db()
      .collection('clubs').doc(clubId)
      .collection('channels').doc(channelId);
  const channelSnap = await channelRef.get();
  if (!channelSnap.exists) {
    throw new HttpsError('not-found', 'Channel not found.');
  }
  const channel = channelSnap.data();
  let channelType =
      typeof channel.channelType === 'string' ? channel.channelType.trim() : '';
  if (!channelType && channelId.startsWith('parent-lounge-')) {
    channelType = 'parent_lounge';
  }

  if (channelType === 'parent_lounge' && callerRole !== 'parent') {
    throw new HttpsError(
        'permission-denied',
        'Parent Circle is parent-peer only. Staff use Announcements or message your coach.',
    );
  }

  /** @type {string[]} */
  let memberIds = Array.isArray(channel.memberIds) ?
    channel.memberIds.map((e) => normEmail(String(e))).filter(Boolean) :
    [];

  const STAFF_INTERNAL_ROLES = new Set([
    'coach',
    'director',
    'registrar',
    'super_admin',
    'global_admin',
  ]);

  if (channelType === 'staff_internal') {
    if (!STAFF_INTERNAL_ROLES.has(callerRole)) {
      throw new HttpsError(
          'permission-denied',
          'Staff internal channels are restricted to club staff.',
      );
    }

    const channelTeamId =
        typeof channel.teamId === 'string' ? channel.teamId.trim() : '';
    if (!channelTeamId) {
      throw new HttpsError('failed-precondition', 'Staff channel missing team scope.');
    }

    const teamSnap = await db().collection('teams').doc(channelTeamId).get();
    if (!teamSnap.exists) {
      throw new HttpsError('not-found', 'Team not found.');
    }
    const teamClubId =
        typeof teamSnap.data().clubId === 'string' ? teamSnap.data().clubId.trim() : '';
    if (!teamClubId || teamClubId !== clubId) {
      throw new HttpsError(
          'permission-denied',
          'Channel does not belong to the specified club.',
      );
    }

    const tokenTeamId = request.auth.token.teamId || '';
    const tokenClubId = request.auth.token.clubId || '';
    let scoped = false;
    if (callerRole === 'super_admin' || callerRole === 'global_admin') {
      scoped = true;
    } else if (callerRole === 'coach') {
      scoped = tokenTeamId === channelTeamId || memberIds.includes(callerEmail);
    } else if (callerRole === 'director' || callerRole === 'registrar') {
      scoped = tokenClubId === clubId;
    }

    if (!scoped) {
      throw new HttpsError(
          'permission-denied',
          'You do not have staff scope for this team channel.',
      );
    }

    if (!memberIds.includes(callerEmail)) {
      await channelRef.update({
        memberIds: admin.firestore.FieldValue.arrayUnion(callerEmail),
      });
      memberIds = [...memberIds, callerEmail];
    }
  } else if (!memberIds.includes(callerEmail)) {
    throw new HttpsError(
        'permission-denied',
        'You are not a member of this channel.',
    );
  }

  // Sprint 4.2 — staff cannot participate in interactive channels that include minors.
  if (isStaffRole(callerRole) && channelType !== 'staff_internal') {
    for (const memberEmail of memberIds) {
      const memberSnap = await db().collection('users').doc(memberEmail).get();
      if (!memberSnap.exists) continue;
      const memberData = memberSnap.data();
      if (memberData.role === 'player' && resolveIsMinor(memberData)) {
        throw new HttpsError(
            'failed-precondition',
            'SafeSport policy: staff cannot message in channels with minor athletes. ' +
            'Use parent-targeted announcements instead.',
        );
      }
    }
  }

  // Cross-tenant guard: verify the channel's team belongs to the declared club.
  const channelTeamId =
      typeof channel.teamId === 'string' ? channel.teamId.trim() : '';
  if (channelTeamId) {
    const teamSnap = await db().collection('teams').doc(channelTeamId).get();
    if (teamSnap.exists) {
      const teamClubId = teamSnap.data().clubId;
      if (teamClubId && teamClubId !== clubId) {
        throw new HttpsError(
            'permission-denied',
            'Channel does not belong to the specified club.',
        );
      }
    }
  }

  // Broadcast channels: only staff may write.
  if (
    channel.type === 'broadcast' &&
    callerRole !== 'coach' &&
    callerRole !== 'director' &&
    callerRole !== 'super_admin'
  ) {
    throw new HttpsError('permission-denied', 'Read-only: Announcements channel.');
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const safesportMonitored = channel.safesportMonitored === true;
  let ccParentEmails = Array.isArray(channel.ccParentEmails) ?
    channel.ccParentEmails.map((e) => normEmail(String(e))).filter(Boolean) :
    [];

  // SafeSport CC verification and re-enforcement (monitored channels only).
  if (safesportMonitored && channelType !== 'staff_internal') {
    const memberSet = new Set(memberIds);

    // Identify every player-role user currently in the channel member list.
    const userSnaps = await Promise.all(
        memberIds.map((em) => db().collection('users').doc(em).get()),
    );
    const playerEmailsInChannel = [];
    for (let i = 0; i < memberIds.length; i++) {
      const us = userSnaps[i];
      if (us.exists && us.data().role === 'player') {
        playerEmailsInChannel.push(memberIds[i]);
      }
    }

    // Re-resolve parent emails for each player via household (strict club scope).
    const resolvedParentSet = new Set(ccParentEmails);
    for (const playerEmail of playerEmailsInChannel) {
      const uSnap = await db().collection('users').doc(playerEmail).get();
      if (!uSnap.exists) continue;
      const playerHouseholdId = uSnap.data().householdId;
      if (!playerHouseholdId) continue;
      const hSnap = await db().collection('households').doc(playerHouseholdId).get();
      if (!hSnap.exists) continue;
      const hd = hSnap.data();
      if (hd.clubId !== clubId) continue; // cross-tenant guard
      const parentEmailList = (hd.parentEmails || [])
          .map((e) => normEmail(String(e)))
          .filter(Boolean);
      for (const p of parentEmailList) resolvedParentSet.add(p);
    }

    const resolvedParents = [...resolvedParentSet].sort();
    const consentedParents = [];
    for (const playerEmail of playerEmailsInChannel) {
      const filtered = await filterParentsWithCommsConsent(
          db(),
          resolvedParents,
          playerEmail,
      );
      filtered.forEach((p) => consentedParents.push(p));
    }
    const consentedSet = new Set(consentedParents);
    ccParentEmails = [...consentedSet].sort();

    // Sprint 3.2 SafeSport Block: explicitly block direct 1-on-1 adult-to-minor messages
    // by ensuring a linked parent's email was successfully resolved and injected into ccParentEmails.
    if (isStaffRole(callerRole) && playerEmailsInChannel.length > 0 && memberIds.length === 2 && ccParentEmails.length === 0) {
      throw new HttpsError(
          'failed-precondition',
          'SafeSport violation: Direct 1-on-1 messages with a minor are strictly prohibited without a linked parent CC. No verified parent email was found for this athlete.'
      );
    }

    // Detect parents missing from current memberIds (dropped after creation).
    const missingParents = ccParentEmails.filter((p) => !memberSet.has(p));
    const newParentsFound = ccParentEmails.length > 0 &&
      ccParentEmails.length !== (channel.ccParentEmails || []).length;

    if (missingParents.length > 0 || newParentsFound) {
      const updatedMemberIds = [
        ...new Set([...memberIds, ...ccParentEmails]),
      ].sort();
      await channelRef.update({
        memberIds: updatedMemberIds,
        ccParentEmails,
      });
      logger.info(
          `[sendChannelMessage] re-enforced SafeSport CC: ` +
          `${missingParents.length} missing + ${newParentsFound ? 'new' : '0 new'} ` +
          `parents on channel ${channelId} in club ${clubId}`,
      );
    }
  }

  // Atomically write the message and audit record via Admin SDK.
  const msgRef = db()
      .collection('clubs').doc(clubId)
      .collection('channels').doc(channelId)
      .collection('messages').doc();
  const batch = db().batch();

  batch.set(msgRef, {
    senderId: callerUid,
    senderName: callerName,
    senderRole: callerRole,
    text: rawText,
    timestamp: now,
    deleted: false,
    safesportMonitored,
    ...(channelType ? {channelType} : {}),
    ...(safesportMonitored && channelType !== 'staff_internal' ? {ccParentEmails} : {}),
  });

  batch.set(db().collection('messaging_audit').doc(), {
    action: 'channel_message',
    channelId,
    clubId,
    teamId: channelTeamId || null,
    channelType: channelType || null,
    fromEmail: callerEmail,
    safesportMonitored,
    ccParentEmails: safesportMonitored && channelType !== 'staff_internal' ?
      ccParentEmails :
      [],
    bodyLength: rawText.length,
    actorUid: callerUid,
    at: now,
  });

  await batch.commit();

  return {
    ok: true,
    messageId: msgRef.id,
    safesportMonitored,
    ccCount: safesportMonitored ? ccParentEmails.length : 0,
    warnNoCc: safesportMonitored && ccParentEmails.length === 0,
  };
});

/**
 * Sprint 4.11 — household parent↔linked operative thread (householdId gate only).
 * Writes: households/{householdId}/thread_messages/{messageId}
 */
async function assertHouseholdThreadActor(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const role = request.auth.token.role || '';
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError('unauthenticated', 'Authenticated email is missing.');
  }

  if (role === 'parent') {
    const actor = await assertParentAsync(request);
    return {email: actor.email, householdId: actor.householdId, role: 'parent'};
  }

  if (role === 'player') {
    const uSnap = await db().collection('users').doc(email).get();
    if (!uSnap.exists) {
      throw new HttpsError('not-found', 'Player profile not found.');
    }
    const householdId =
      typeof uSnap.data().householdId === 'string' ?
        uSnap.data().householdId.trim() :
        '';
    if (!householdId) {
      throw new HttpsError(
          'failed-precondition',
          'Your account is not linked to a household thread.',
      );
    }
    const hSnap = await db().collection('households').doc(householdId).get();
    if (!hSnap.exists) {
      throw new HttpsError('not-found', 'Household not found.');
    }
    const players = (hSnap.data().playerEmails || [])
        .map((x) => normEmail(String(x)))
        .filter(Boolean);
    if (!players.includes(email)) {
      throw new HttpsError(
          'permission-denied',
          'You are not authorized on this household thread.',
      );
    }
    return {email, householdId, role: 'player'};
  }

  throw new HttpsError(
      'permission-denied',
      'Only linked parents and operatives may use household threads.',
  );
}

exports.sendHouseholdMessage = onCall({region: REGION}, async (request) => {
  const actor = await assertHouseholdThreadActor(request);
  const data = request.data || {};
  const bodyRaw = typeof data.body === 'string' ? data.body.trim() : '';
  if (!bodyRaw) {
    throw new HttpsError('invalid-argument', 'Message body is required.');
  }
  if (bodyRaw.length > 4000) {
    throw new HttpsError('invalid-argument', 'Message body exceeds 4000 characters.');
  }

  let senderName = actor.email.split('@')[0];
  const userSnap = await db().collection('users').doc(actor.email).get();
  if (userSnap.exists) {
    const ud = userSnap.data();
    const pn = typeof ud.playerName === 'string' ? ud.playerName.trim() : '';
    const dn = typeof ud.displayName === 'string' ? ud.displayName.trim() : '';
    senderName = pn || dn || senderName;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const bodyPreview = bodyRaw.length > 200 ?
    bodyRaw.slice(0, 200) + '\u2026' :
    bodyRaw;

  const msgRef = db()
      .collection('households')
      .doc(actor.householdId)
      .collection('thread_messages')
      .doc();

  await msgRef.set({
    householdId: actor.householdId,
    fromEmail: actor.email,
    fromRole: actor.role,
    fromName: senderName,
    body: bodyRaw,
    bodyPreview,
    createdAt: now,
  });

  await db().collection('messaging_audit').doc().set({
    action: 'household_thread_message',
    householdId: actor.householdId,
    fromEmail: actor.email,
    fromRole: actor.role,
    bodyPreview,
    bodyLength: bodyRaw.length,
    actorUid: request.auth.uid,
    at: now,
  });

  return {ok: true, messageId: msgRef.id, householdId: actor.householdId};
});

// ── Impersonation ────────────────────────────────────────────────────────────
//   • Self-impersonation is rejected (no-op / audit noise protection).
//   • Impersonating another super_admin is denied (lateral-movement guard).
//   • Every call writes an immutable row to `security_audit` with
//     action=IMPERSONATE_USER, actor=<adminEmail>, target=<targetUid/email>.
//   • Custom token carries `additionalClaims.impersonation = true` and
//     `additionalClaims.impersonatedBy = <adminEmail>` so downstream auditing
//     can correlate sessions.

exports.impersonateUserFn = onCall({region: REGION}, async (request) => {
  const {email: adminEmail} = assertSuperAdmin(request);
  const data = request.data || {};

  const targetEmailIn =
      typeof data.targetEmail === 'string' ? data.targetEmail.trim() : '';
  const targetUidIn =
      typeof data.targetUid === 'string' ? data.targetUid.trim() : '';

  if (!targetEmailIn && !targetUidIn) {
    throw new HttpsError(
        'invalid-argument',
        'Provide targetEmail or targetUid.',
    );
  }

  // Resolve the target Firebase Auth record authoritatively.
  let userRecord;
  try {
    if (targetUidIn) {
      userRecord = await admin.auth().getUser(targetUidIn);
    } else {
      userRecord = await admin.auth().getUserByEmail(
          normEmail(targetEmailIn) || targetEmailIn,
      );
    }
  } catch (err) {
    logger.warn('impersonateUserFn: target lookup failed', {
      admin: adminEmail,
      targetEmailIn,
      targetUidIn,
      err: err && err.message,
    });
    throw new HttpsError('not-found', 'Target user does not exist.');
  }

  const targetUid = userRecord.uid;
  const targetEmail = normEmail(userRecord.email) || '';

  // Self-impersonation has no valid use-case and pollutes audit history.
  if (request.auth.uid === targetUid) {
    throw new HttpsError(
        'failed-precondition',
        'You cannot impersonate your own account.',
    );
  }

  // Lateral-movement guard: a super_admin may never impersonate another
  // super_admin (prevents collusion / privilege-chain obfuscation).
  let targetRole = '';
  if (targetEmail) {
    try {
      const userDocSnap = await db().collection('users').doc(targetEmail).get();
      if (userDocSnap.exists) {
        const raw = userDocSnap.data() || {};
        targetRole = typeof raw.role === 'string' ? raw.role : '';
      }
    } catch (err) {
      logger.warn('impersonateUserFn: users/{email} lookup failed', {
        admin: adminEmail,
        targetEmail,
        err: err && err.message,
      });
    }
  }
  if (targetRole === 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Impersonating another super_admin is not permitted.',
    );
  }

  // Mint the custom token. The additionalClaims flow into the signed-in user's
  // ID token so the client-side session is permanently identifiable as an
  // impersonation session for the lifetime of that token.
  // Sprint 2.6.1 — the banner is now derived from these claims on the client
  // (no sessionStorage), so include target email + role so the high-visibility
  // banner never requires a second Firestore round-trip.
  const additionalClaims = {
    impersonation: true,
    impersonatedBy: adminEmail,
    impersonatedEmail: targetEmail || null,
    impersonatedRole: targetRole || null,
    impersonationStartedAt: Date.now(),
  };

  let customToken;
  try {
    customToken = await admin.auth().createCustomToken(
        targetUid,
        additionalClaims,
    );
  } catch (err) {
    logger.error('impersonateUserFn: createCustomToken failed', {
      admin: adminEmail,
      targetUid,
      err: err && err.message,
    });
    throw new HttpsError(
        'internal',
        'Failed to mint impersonation token.',
    );
  }

  try {
    await db().collection('security_audit').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      admin: adminEmail,
      action: 'IMPERSONATE_USER',
      target: targetEmail || targetUid,
      details: JSON.stringify({
        targetUid,
        targetEmail: targetEmail || null,
        targetRole: targetRole || null,
        callerUid: request.auth.uid,
      }).slice(0, 2000),
    });
  } catch (err) {
    // An audit write failure must not leak a token without traceability.
    logger.error('impersonateUserFn: audit write failed', {
      admin: adminEmail,
      targetUid,
      err: err && err.message,
    });
    throw new HttpsError(
        'internal',
        'Audit logging failed; impersonation aborted.',
    );
  }

  return {
    token: customToken,
    targetUid,
    targetEmail: targetEmail || null,
    targetRole: targetRole || null,
    impersonatedBy: adminEmail,
  };
});

// ── Sprint 2.7 — GDPR Purge (right-to-be-forgotten) ─────────────────────────
//
// Hard-deletes a user's core identity footprint:
//   • Firebase Auth record
//   • users/{email}
//   • player_lookup, coach_lookup, registrar_lookup (any matching rows)
// Writes a PURGE_USER_DATA audit record before the Auth deletion so the
// audit trail survives even if the caller's token is invalidated.

exports.purgeUserDataFn = onCall({region: REGION}, async (request) => {
  const {email: adminEmail} = assertSuperAdmin(request);
  const data = request.data || {};
  const targetEmailIn =
      typeof data.targetEmail === 'string' ? data.targetEmail.trim() : '';
  const reason =
      typeof data.reason === 'string' ? data.reason.trim().slice(0, 500) : '';

  const targetEmail = normEmail(targetEmailIn);
  if (!targetEmail) {
    throw new HttpsError('invalid-argument', 'targetEmail is required.');
  }
  if (targetEmail === adminEmail) {
    throw new HttpsError(
        'failed-precondition',
        'You cannot purge your own account.',
    );
  }

  // Lateral-movement guard: super_admin → super_admin purge is denied.
  let targetRole = '';
  try {
    const userDocSnap = await db().collection('users').doc(targetEmail).get();
    if (userDocSnap.exists) {
      const raw = userDocSnap.data() || {};
      targetRole = typeof raw.role === 'string' ? raw.role : '';
    }
  } catch (err) {
    logger.warn('purgeUserDataFn: users lookup failed', {
      admin: adminEmail,
      targetEmail,
      err: err && err.message,
    });
  }
  if (targetRole === 'super_admin') {
    throw new HttpsError(
        'permission-denied',
        'Purging another super_admin is not permitted.',
    );
  }

  // Audit FIRST so the action is recorded even if mid-batch we fail.
  try {
    await db().collection('security_audit').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      admin: adminEmail,
      action: 'PURGE_USER_DATA',
      target: targetEmail,
      details: JSON.stringify({
        targetRole: targetRole || null,
        reason: reason || null,
      }).slice(0, 2000),
    });
  } catch (err) {
    logger.error('purgeUserDataFn: audit write failed', {
      admin: adminEmail,
      targetEmail,
      err: err && err.message,
    });
    throw new HttpsError('internal', 'Audit logging failed; purge aborted.');
  }

  // Delete users/{email} and any lookup rows atomically.
  const batch = db().batch();
  batch.delete(db().collection('users').doc(targetEmail));
  batch.delete(db().collection('player_lookup').doc(targetEmail));
  batch.delete(db().collection('coach_lookup').doc(targetEmail));
  batch.delete(db().collection('registrar_lookup').doc(targetEmail));
  try {
    await batch.commit();
  } catch (err) {
    logger.error('purgeUserDataFn: Firestore batch failed', {
      admin: adminEmail,
      targetEmail,
      err: err && err.message,
    });
    throw new HttpsError('internal', 'Firestore purge failed.');
  }

  // Best-effort Auth deletion: ignore if the user never completed signup.
  try {
    const rec = await admin.auth().getUserByEmail(targetEmail);
    await admin.auth().deleteUser(rec.uid);
  } catch (err) {
    if (err && err.code !== 'auth/user-not-found') {
      logger.warn('purgeUserDataFn: Auth deleteUser non-fatal', {
        admin: adminEmail,
        targetEmail,
        err: err && err.message,
      });
    }
  }

  return {ok: true, targetEmail};
});

// ── Sprint 5.1 — Household Provisioning Engine (COPPA: minors never self-create)
// Client direct writes to `operative_dispatches` are denied; all via onCall.

/**
 * Parent: digital COPPA / liability signature — stamps household + coppaSigned.
 * Creates a household if the parent has none (requires clubId on users/{email}).
 */
exports.parentSignCoppaWaiver = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const email = normEmail(request.auth.token.email);
  if (!email) {
    throw new HttpsError('invalid-argument', 'No email on session.');
  }
  const uRef = db().collection('users').doc(email);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'User profile not found.');
  }
  const u = uSnap.data();
  if (u.role !== 'parent') {
    throw new HttpsError(
        'permission-denied',
        'Only parent accounts may sign the household waiver.',
    );
  }
  const clubId = typeof u.clubId === 'string' ? u.clubId.trim() : '';
  if (!clubId) {
    throw new HttpsError(
        'failed-precondition',
        'Your profile is missing a club. Complete organization setup first.',
    );
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  let hid = typeof u.householdId === 'string' ? u.householdId.trim() : '';
  if (!hid) {
    hid = db().collection('households').doc().id;
    const hRef = db().collection('households').doc(hid);
    const pe = Array.isArray(u.playerEmails) ? u.playerEmails : [];
    const pn = Array.isArray(u.playerNames) ? u.playerNames : [];
    await hRef.set({
      clubId,
      parentEmails: [email],
      playerEmails: [...new Set([...pe].map((x) => normEmail(/** @type {string} */(x))).filter(Boolean))],
      playerNames: [...new Set([...pn].filter((x) => typeof x === 'string' && x.trim()))],
      coppaSigned: true,
      coppaSignedAt: now,
      primaryParentUid: request.auth.uid,
      createdAt: now,
      updatedAt: now,
    });
    await uRef.set({householdId: hid}, {merge: true});
    // Fast-path: propagate householdId into parent's JWT immediately.
    // syncUserClaims only fires on role/clubId changes, so a householdId
    // write from this callable would otherwise not propagate until the next
    // role/clubId update.
    try {
      const parentRec = await admin.auth().getUser(request.auth.uid);
      const existingClaims = parentRec.customClaims || {};
      await admin.auth().setCustomUserClaims(request.auth.uid, {...existingClaims, householdId: hid});
    } catch (claimErr) {
      logger.warn('[parentSignCoppaWaiver] householdId claim fast-path failed (non-fatal)', claimErr.message);
    }
    // W2: provision Parent Lounge channels for any children already in the household.
    try {
      const childEmailsList = pe.map((x) => normEmail(String(x))).filter(Boolean);
      await provisionLoungesForParentHousehold({
        parentEmail: email,
        childEmails: childEmailsList,
        parentClubId: clubId,
      });
    } catch (loungeErr) {
      logger.warn('[parentSignCoppaWaiver] lounge provision failed (non-fatal)', {
        err: loungeErr instanceof Error ? loungeErr.message : String(loungeErr),
      });
    }
    return {ok: true, householdId: hid, createdHousehold: true};
  }
  const hRef = db().collection('households').doc(hid);
  const hSnap = await hRef.get();
  if (!hSnap.exists) {
    throw new HttpsError('not-found', 'Household not found. Contact support.');
  }
  const hData = hSnap.data();
  if (hData.clubId !== clubId) {
    throw new HttpsError('permission-denied', 'Household club does not match your profile.');
  }
  const parents = new Set(
      [...(hData.parentEmails || []), email].map((x) => normEmail(/** @type {string} */(x))).filter(Boolean),
  );
  await hRef.set(
      {
        parentEmails: [...parents],
        coppaSigned: true,
        coppaSignedAt: now,
        primaryParentUid: request.auth.uid,
        updatedAt: now,
      },
      {merge: true},
  );
  // Fast-path: same as creation path — propagate householdId into parent's JWT claims.
  try {
    const parentRec = await admin.auth().getUser(request.auth.uid);
    const existingClaims = parentRec.customClaims || {};
    await admin.auth().setCustomUserClaims(request.auth.uid, {...existingClaims, householdId: hid});
  } catch (claimErr) {
    logger.warn('[parentSignCoppaWaiver] householdId claim fast-path failed (non-fatal)', claimErr.message);
  }
  // W2: provision/upsert Parent Lounge channels for all children in the household.
  try {
    const childEmailsList = (hData.playerEmails || [])
        .map((x) => normEmail(String(x)))
        .filter(Boolean);
    await provisionLoungesForParentHousehold({
      parentEmail: email,
      childEmails: childEmailsList,
      parentClubId: clubId,
    });
  } catch (loungeErr) {
    logger.warn('[parentSignCoppaWaiver] lounge provision failed (non-fatal)', {
      err: loungeErr instanceof Error ? loungeErr.message : String(loungeErr),
    });
  }
  return {ok: true, householdId: hid, createdHousehold: false};
});

/**
 * Parent: add minor operative (Auth + users row + dispatch credentials).
 * Requires prior COPPA signature.
 * Optional `teamInviteCode`: links the child to a team via `teams.inviteCode`.
 */
exports.parentProvisionOperative = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const childName =
    typeof data.childName === 'string' ? data.childName.trim().slice(0, 200) : '';
  const rawCallsign =
    typeof data.operativeCallsign === 'string' ? data.operativeCallsign.trim().slice(0, 200) : '';
  const operSlug = normOperativeCallsignSlug(rawCallsign);
  if (!rawCallsign || !childName) {
    throw new HttpsError(
        'invalid-argument',
        'operativeCallsign and childName are required.',
    );
  }
  if (operSlug.length < 2 || operSlug.length > 32) {
    throw new HttpsError(
        'invalid-argument',
        'Operative Callsign must yield 2\u201332 letters or numbers (after normalizing).',
    );
  }
  const childEmail = normEmail(`${operSlug}@operative.local`);
  if (!childEmail) {
    throw new HttpsError('invalid-argument', 'Invalid operative proxy email.');
  }
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const parentEmail = normEmail(request.auth.token.email);
  if (!parentEmail) {
    throw new HttpsError('invalid-argument', 'No email on session.');
  }
  if (childEmail === parentEmail) {
    throw new HttpsError('invalid-argument', 'Child email must differ from parent email.');
  }
  const rawTeamCode = data.teamInviteCode;
  const teamCodeNorm =
    typeof rawTeamCode === 'string' && rawTeamCode.trim() ?
      normTeamInviteCode(rawTeamCode) :
      '';
  const pRef = db().collection('users').doc(parentEmail);
  const pSnap = await pRef.get();
  if (!pSnap.exists || pSnap.data().role !== 'parent') {
    throw new HttpsError('permission-denied', 'Only parent accounts may provision operatives.');
  }
  const pu = pSnap.data();
  const hid =
    typeof pu.householdId === 'string' ? pu.householdId.trim() : '';
  if (!hid) {
    throw new HttpsError(
        'failed-precondition',
        'Sign the household waiver before generating operative credentials.',
    );
  }
  const hRef = db().collection('households').doc(hid);
  const hSnap = await hRef.get();
  if (!hSnap.exists) {
    throw new HttpsError('not-found', 'Household not found.');
  }
  const h = hSnap.data();
  if (!h.coppaSigned) {
    throw new HttpsError(
        'failed-precondition',
        'COPPA waiver is not on file. Sign the waiver first.',
    );
  }
  const parentList = Array.isArray(h.parentEmails) ? h.parentEmails.map(normEmail) : [];
  if (!parentList.includes(parentEmail)) {
    throw new HttpsError('permission-denied', 'You are not an authorized parent on this household.');
  }
  const clubId = typeof pu.clubId === 'string' ? pu.clubId.trim() : '';
  if (!clubId || h.clubId !== clubId) {
    throw new HttpsError('failed-precondition', 'Club scope mismatch.');
  }
  const existingPlayers = (h.playerEmails || []).map(normEmail);
  if (existingPlayers.includes(childEmail)) {
    throw new HttpsError(
        'already-exists',
        'This athlete email is already in your household.',
    );
  }
  let teamRef = null;
  let teamIdForUser = null;
  if (teamCodeNorm) {
    const tq = await db()
        .collection('teams')
        .where('inviteCode', '==', teamCodeNorm)
        .limit(2)
        .get();
    if (tq.empty) {
      throw new HttpsError(
          'not-found',
          'No team matches this team dispatch code. Check with the coach and try again.',
      );
    }
    if (tq.size > 1) {
      throw new HttpsError(
          'failed-precondition',
          'Multiple teams share this code. Contact the club to resolve.',
      );
    }
    const tdoc = tq.docs[0];
    const tData = tdoc.data();
    const tidClub =
      typeof tData.clubId === 'string' ? tData.clubId.trim() : '';
    if (tidClub !== clubId) {
      throw new HttpsError(
          'permission-denied',
          'That team is not in your club. Use a code from your organization.',
      );
    }
    teamRef = tdoc.ref;
    teamIdForUser = tdoc.id;
  }
  const parentTeamIdRaw = typeof pu.teamId === 'string' ? pu.teamId.trim() : '';
  const currentTeamId = teamIdForUser || (parentTeamIdRaw ? parentTeamIdRaw : null);
  const dispatchCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const now = admin.firestore.FieldValue.serverTimestamp();
  let childUid;
  try {
    const existing = await admin.auth().getUserByEmail(childEmail);
    childUid = existing.uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') {
      throw e;
    }
    const rec = await admin.auth().createUser({
      email: childEmail,
      password: crypto.randomBytes(32).toString('hex'),
      displayName: childName,
    });
    childUid = rec.uid;
  }
  const uRef = db().collection('users').doc(childEmail);
  const uExisting = await uRef.get();
  if (uExisting.exists) {
    const uData = uExisting.data() || {};
    const role = uData.role;
    if (role && role !== 'player') {
      throw new HttpsError(
          'failed-precondition',
          'This email is already in use with a different role. Contact your club.',
      );
    }
    const exHid = typeof uData.householdId === 'string' ? uData.householdId.trim() : '';
    if (exHid && exHid !== hid) {
      throw new HttpsError(
          'already-exists',
          'That Operative Callsign is already in use. Choose a different one.',
      );
    }
  }
  const mergedPlayers = [...new Set([...existingPlayers, childEmail])];
  const nameSet = new Set(
      Array.isArray(h.playerNames) ? h.playerNames.filter((x) => typeof x === 'string') : [],
  );
  nameSet.add(childName);
  const userPayload = {
    uid: childUid,
    role: 'player',
    clubId,
    householdId: hid,
    playerName: childName,
    operativeCallsign: rawCallsign,
    operativeCallsignSlug: operSlug,
    parentProvisioned: true,
    parentProvisionerEmail: parentEmail,
    updatedAt: now,
  };
  const existingVpc = uExisting.exists ?
    (typeof uExisting.data()?.vpcStatus === 'string' ?
      uExisting.data().vpcStatus :
      '') :
    '';
  if (existingVpc !== 'verified') {
    userPayload.isMinor = true;
    userPayload.vpcStatus = 'pending_parent';
    userPayload.coppaStatus = 'pending';
  }
  if (teamIdForUser) {
    userPayload.teamId = teamIdForUser;
  }
  const prevPE = (h.playerEmails || [])
      .map((x) => normEmail(String(x || '')))
      .filter(Boolean);
  const prevCalls = Array.isArray(h.playerCallsigns) ? h.playerCallsigns : [];
  const callByEmail = new Map();
  for (let i = 0; i < prevPE.length; i++) {
    const em = prevPE[i];
    const c =
        prevCalls[i] != null && String(prevCalls[i]).trim() ?
          String(prevCalls[i]).trim() :
          em && em.endsWith('@operative.local') ?
            em.split('@')[0] :
            '';
    callByEmail.set(em, c);
  }
  callByEmail.set(childEmail, rawCallsign);
  const playerCallsigns = mergedPlayers.map((em) => {
    if (!em) {
      return '';
    }
    const fromMap = callByEmail.get(em);
    if (fromMap != null && String(fromMap).trim()) {
      return String(fromMap).trim();
    }
    return em.endsWith('@operative.local') ? em.split('@')[0] : '';
  });
  const dispRef = db().collection('operative_dispatches').doc();
  const plRef = db().collection('player_lookup').doc(childEmail);
  const batch = db().batch();
  batch.set(uRef, userPayload, {merge: true});
  const householdParents = (h.parentEmails || [])
      .map((x) => normEmail(String(x || '')))
      .filter(Boolean);
  if (!householdParents.includes(parentEmail)) {
    householdParents.push(parentEmail);
  }
  batch.set(plRef, {
    clubId,
    teamId: currentTeamId,
    playerName: childName,
    role: 'player',
    householdId: hid,
    parentEmails: householdParents,
    parentProvisionerEmail: parentEmail,
    vpcStatus: userPayload.vpcStatus || 'pending_parent',
  }, {merge: true});
  batch.set(
      hRef,
      {
        playerEmails: mergedPlayers,
        playerNames: [...nameSet],
        playerCallsigns,
        updatedAt: now,
      },
      {merge: true},
  );
  batch.set(dispRef, {
    householdId: hid,
    childEmail,
    childName,
    dispatchCode,
    childUid,
    parentUid: request.auth.uid,
    parentEmail,
    ...(teamIdForUser ? {teamId: teamIdForUser, teamInviteCode: teamCodeNorm} : {}),
    createdAt: now,
  });
  if (teamRef) {
    batch.update(teamRef, {
      playerUids: admin.firestore.FieldValue.arrayUnion(childUid),
      updatedAt: now,
    });
    batch.set(db().collection('rosters').doc(teamIdForUser), {
      players: admin.firestore.FieldValue.arrayUnion(childName),
    }, {merge: true});
  }
  await batch.commit();
  // W2: when a child is linked to a team, provision the Parent Lounge for this child.
  // The users/{childEmail} doc with teamId was just committed, so the helper can resolve it.
  if (teamIdForUser) {
    try {
      await provisionLoungesForParentHousehold({
        parentEmail,
        childEmails: [childEmail],
        parentClubId: clubId,
      });
    } catch (loungeErr) {
      logger.warn('[parentProvisionOperative] lounge provision failed (non-fatal)', {
        err: loungeErr instanceof Error ? loungeErr.message : String(loungeErr),
      });
    }
  }
  return {
    ok: true,
    householdId: hid,
    childEmail,
    dispatchCode,
    teamLinked: Boolean(teamIdForUser),
    teamId: teamIdForUser || null,
    message:
      'Share this dispatch code with your athlete. It is also stored server-side for Operative sign-in.',
  };
});

/**
 * Parent: link an existing household operative to a team via dispatch code.
 * Requires COPPA signature; does not re-provision Auth or dispatch credentials.
 */
exports.parentLinkOperativeToTeam = onCall({region: REGION}, async (request) => {
  const actor = assertParent(request);
  const data = request.data || {};
  const childEmailRaw = normEmail(data.childEmail);
  const rawCallsign =
      typeof data.operativeCallsign === 'string' ?
        data.operativeCallsign.trim().slice(0, 200) :
        '';
  let childEmail = childEmailRaw;
  if (!childEmail && rawCallsign) {
    const operSlug = normOperativeCallsignSlug(rawCallsign);
    if (operSlug.length < 2) {
      throw new HttpsError(
          'invalid-argument',
          'Operative Callsign must yield at least two letters or numbers.',
      );
    }
    childEmail = normEmail(`${operSlug}@operative.local`);
  }
  if (!childEmail || !childEmail.endsWith('@operative.local')) {
    throw new HttpsError(
        'invalid-argument',
        'childEmail or operativeCallsign is required.',
    );
  }
  const teamCodeNorm = normTeamInviteCode(data.teamInviteCode);
  const parentEmail = actor.email;
  const pRef = db().collection('users').doc(parentEmail);
  const pSnap = await pRef.get();
  if (!pSnap.exists || pSnap.data().role !== 'parent') {
    throw new HttpsError('permission-denied', 'Only parent accounts may link operatives.');
  }
  const pu = pSnap.data();
  const hid =
      typeof pu.householdId === 'string' ? pu.householdId.trim() : '';
  if (!hid) {
    throw new HttpsError(
        'failed-precondition',
        'Sign the household waiver before linking operatives to a team.',
    );
  }
  const hRef = db().collection('households').doc(hid);
  const hSnap = await hRef.get();
  if (!hSnap.exists) {
    throw new HttpsError('not-found', 'Household not found.');
  }
  const h = hSnap.data();
  if (!h.coppaSigned) {
    throw new HttpsError(
        'failed-precondition',
        'COPPA waiver is not on file. Sign the waiver first.',
    );
  }
  const parentList = Array.isArray(h.parentEmails) ? h.parentEmails.map(normEmail) : [];
  if (!parentList.includes(parentEmail)) {
    throw new HttpsError('permission-denied', 'You are not an authorized parent on this household.');
  }
  const clubId = typeof pu.clubId === 'string' ? pu.clubId.trim() : '';
  if (!clubId || h.clubId !== clubId) {
    throw new HttpsError('failed-precondition', 'Club scope mismatch.');
  }
  const householdPlayers = (h.playerEmails || []).map(normEmail);
  if (!householdPlayers.includes(childEmail)) {
    throw new HttpsError(
        'permission-denied',
        'That operative is not in your household.',
    );
  }
  const {teamRef, teamId: teamIdForUser} =
      await resolveTeamByInviteCodeForClub(teamCodeNorm, clubId);

  const uRef = db().collection('users').doc(childEmail);
  const uSnap = await uRef.get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'Operative profile not found.');
  }
  const u = uSnap.data() || {};
  const playerName =
      typeof u.playerName === 'string' && u.playerName.trim() ?
        u.playerName.trim() :
        '';
  if (!playerName) {
    throw new HttpsError('failed-precondition', 'Operative missing display name.');
  }
  let childUid = '';
  try {
    const rec = await admin.auth().getUserByEmail(childEmail);
    childUid = rec.uid;
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'Operative Auth account not found.');
    }
    throw e;
  }
  const existingTeam =
      typeof u.teamId === 'string' && u.teamId.trim() ? u.teamId.trim() : '';
  if (existingTeam === teamIdForUser) {
    await stampOperativeTeamClaims(childUid, u, teamIdForUser, clubId, hid);
    return {
      ok: true,
      noop: true,
      childEmail,
      teamId: teamIdForUser,
      teamLinked: true,
    };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const plRef = db().collection('player_lookup').doc(childEmail);
  const householdParents = (h.parentEmails || [])
      .map((x) => normEmail(String(x || '')))
      .filter(Boolean);
  const batch = db().batch();
  batch.set(
      uRef,
      {
        teamId: teamIdForUser,
        clubId,
        householdId: hid,
        role: 'player',
        updatedAt: now,
      },
      {merge: true},
  );
  batch.set(
      plRef,
      {
        clubId,
        teamId: teamIdForUser,
        playerName,
        role: 'player',
        householdId: hid,
        parentEmails: householdParents,
        parentProvisionerEmail: parentEmail,
        updatedAt: now,
      },
      {merge: true},
  );
  batch.update(teamRef, {
    playerUids: admin.firestore.FieldValue.arrayUnion(childUid),
    updatedAt: now,
  });
  batch.set(
      db().collection('rosters').doc(teamIdForUser),
      {
        players: admin.firestore.FieldValue.arrayUnion(playerName),
      },
      {merge: true},
  );
  await batch.commit();

  await stampOperativeTeamClaims(childUid, u, teamIdForUser, clubId, hid);

  try {
    await provisionLoungesForParentHousehold({
      parentEmail,
      childEmails: [childEmail],
      parentClubId: clubId,
    });
  } catch (loungeErr) {
    logger.warn('[parentLinkOperativeToTeam] lounge provision failed (non-fatal)', {
      err: loungeErr instanceof Error ? loungeErr.message : String(loungeErr),
    });
  }

  return {
    ok: true,
    childEmail,
    teamId: teamIdForUser,
    teamLinked: true,
    inviteCode: teamCodeNorm,
  };
});

/**
 * Public: operatives sign in with email + dispatch code (custom token).
 */
exports.operativeSignInWithDispatch = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  const em = normEmail(data.email);
  const code = typeof data.dispatchCode === 'string' ?
    data.dispatchCode.trim().toUpperCase() :
    '';
  if (!em || !code) {
    throw new HttpsError('invalid-argument', 'email and dispatchCode are required.');
  }
  const q = await db()
      .collection('operative_dispatches')
      .where('childEmail', '==', em)
      .where('dispatchCode', '==', code)
      .limit(1)
      .get();
  if (q.empty) {
    throw new HttpsError('permission-denied', 'Invalid email or dispatch code.');
  }
  const row = q.docs[0].data();
  const childUid = row.childUid;
  if (!childUid || typeof childUid !== 'string') {
    throw new HttpsError('internal', 'Provision record is incomplete.');
  }
  const hSnap = await db().collection('households').doc(row.householdId).get();
  if (!hSnap.exists || hSnap.data().coppaSigned !== true) {
    throw new HttpsError(
        'failed-precondition',
        'This household is not authorized. A parent must sign compliance first.',
    );
  }
  const customToken = await admin.auth().createCustomToken(childUid);
  return {customToken, householdId: row.householdId};
});

/**
 * Parent-only: store a 10-minute OTP in `auth_challenges/{code}` for player
 * sign-in.
 */
exports.generatePlayerOTP = onCall({region: REGION}, async (request) => {
  const data = request.data || {};
  let childUid = typeof data.childUid === 'string' ? data.childUid.trim() : '';
  const childEm = normEmail(
      typeof data.childEmail === 'string' ? data.childEmail : '',
  );
  if (!childUid && childEm) {
    try {
      const ur = await admin.auth().getUserByEmail(childEm);
      childUid = ur.uid;
    } catch (e) {
      if (e && e.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', 'No account for that child email.');
      }
      throw e;
    }
  }
  if (!childUid) {
    throw new HttpsError(
        'invalid-argument',
        'childUid or childEmail is required.',
    );
  }
  const actor = await assertParentAsync(request);
  await assertChildInParentHousehold(actor, childUid, childEm);
  const parentUid = request.auth.uid;
  const nowMs = Date.now();
  const tenMin = 10 * 60 * 1000;
  const expiresAt = admin.firestore.Timestamp.fromMillis(nowMs + tenMin);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateOtpCodeString();
    const ref = db().collection('auth_challenges').doc(code);
    const snap = await ref.get();
    if (snap.exists) {
      continue;
    }
    await ref.set({
      childUid,
      parentUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });
    return {code, expiresAt: expiresAt.toDate().toISOString()};
  }
  throw new HttpsError('unavailable', 'Could not issue a unique code. Try again.');
});

/**
 * Parent: sync households.playerEmails from player_lookup/users denorm so
 * Household Clearance shows the same athletes admin already lists.
 */
exports.parentReconcileHousehold = onCall({region: REGION}, async (request) => {
  const actor = await assertParentAsync(request);
  const result = await reconcileParentHouseholdGraph(actor.email);
  return {
    ok: true,
    householdId: result.householdId,
    playerEmails: result.playerEmails,
    repaired: result.repaired,
  };
});

/**
 * Public: validate 6-char Clearance Code; mints a custom token for the child
 * (one use). Unauthenticated by design (child login) — do not require
 * `request.auth`.
 */
exports.validatePlayerOTP = onCall({region: REGION}, async (request) => {
  // request.auth is intentionally ignored — unauthenticated child login.
  const data = request.data || {};
  const uRaw = typeof data.username === 'string' ? data.username : '';
  const username = uRaw.trim().toLowerCase();
  const oRaw = data.otpCode != null ? String(data.otpCode) : '';
  const otpForNorm = oRaw.trim().toLowerCase();
  const otpCode = normOtpCode(otpForNorm);
  if (!username || !otpCode) {
    throw new HttpsError(
        'invalid-argument',
        'username and a 6-character Clearance Code are required.',
    );
  }
  let childUid;
  try {
    childUid = await resolveUserUidFromUsernameOrCallsign(username);
  } catch (e) {
    if (e instanceof HttpsError) {
      if (e.code === 'not-found') {
        throw new HttpsError('not-found', 'Callsign not found in database.');
      }
      if (e.code === 'invalid-argument') {
        throw e;
      }
    }
    console.error('validatePlayerOTP resolve user failed', e);
    throw new HttpsError('internal', 'Server failed to resolve user.');
  }
  const ref = db().collection('auth_challenges').doc(otpCode);
  try {
    await db().runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Invalid or expired Clearance Code.');
      }
      const d = snap.data() || {};
      const ch = typeof d.childUid === 'string' ? d.childUid.trim() : '';
      if (!ch || ch !== childUid) {
        throw new HttpsError('not-found', 'Invalid or expired Clearance Code.');
      }
      const ex = d.expiresAt;
      if (!ex || typeof ex.toMillis !== 'function') {
        t.delete(ref);
        throw new HttpsError(
            'internal',
            'Server failed to read clearance challenge.',
        );
      }
      if (ex.toMillis() <= Date.now()) {
        t.delete(ref);
        throw new HttpsError('not-found', 'Invalid or expired Clearance Code.');
      }
      t.delete(ref);
    });
  } catch (e) {
    if (e instanceof HttpsError) {
      throw e;
    }
    console.error('validatePlayerOTP challenge transaction', e);
    throw new HttpsError(
        'internal',
        'Server failed to validate Clearance Code.',
    );
  }
  let customToken;
  try {
    customToken = await admin.auth().createCustomToken(childUid);
  } catch (error) {
    console.error('Token Minting Error:', error);
    throw new HttpsError('internal', 'Server failed to mint login token.');
  }
  return {customToken};
});
