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
  assertCoachMessageSender,
} = require('../middleware/authBouncers');

const REGION = 'us-east1';

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

/**
 * @param {{ email: string, householdId: string }} actor
 * @param {string} childUid
 */
async function assertChildInParentHousehold(actor, childUid) {
  let childUser;
  try {
    childUser = await admin.auth().getUser(childUid);
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'Child account not found.');
    }
    throw e;
  }
  const childEm = normEmail(childUser.email);
  if (!childEm) {
    throw new HttpsError('failed-precondition', 'Child has no email on file.');
  }
  const hSnap = await db().collection('households').doc(actor.householdId).get();
  if (!hSnap.exists) {
    throw new HttpsError('not-found', 'Household not found.');
  }
  const h = hSnap.data();
  const players = (h.playerEmails || [])
      .map((x) => normEmail(String(x)))
      .filter(Boolean);
  if (!players.includes(childEm)) {
    throw new HttpsError(
        'permission-denied',
        'That player is not linked to your household.',
    );
  }
  const parents = (h.parentEmails || [])
      .map((x) => normEmail(String(x)))
      .filter(Boolean);
  if (!parents.includes(actor.email)) {
    throw new HttpsError(
        'permission-denied',
        'You are not an authorized parent on this household.',
    );
  }
  const uSnap = await db().collection('users').doc(childEm).get();
  if (uSnap.exists) {
    const r = uSnap.data().role;
    if (r && r !== 'player') {
      throw new HttpsError('failed-precondition', 'Target account is not a player.');
    }
  }
}

// ── Exported callable functions ──────────────────────────────────────────────

/**
 * SafeSport / Epic 1.4: coach or director sends in-app message to a rostered
 * athlete. Minors get parent emails denormalized for CC visibility; audit log
 * mirrors metadata (not full body in messaging_audit).
 */
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

  const actorEmail = actor.email || '';
  if (normEmail(actorEmail) === toPlayerEmail) {
    throw new HttpsError('invalid-argument', 'Cannot message yourself.');
  }

  let minorRecipient = u.isMinor === true;
  if (!minorRecipient && u.dateOfBirth) {
    try {
      minorRecipient = computeAgeYears(u.dateOfBirth) < 17;
    } catch (e) {
      logger.warn('sendCoachPlayerMessage: age check failed', e);
    }
  }

  /** @type {string[]} */
  let ccParentEmails = [];
  if (minorRecipient && u.householdId) {
    const hSnap = await db().collection('households').doc(u.householdId).get();
    if (hSnap.exists) {
      const pe = hSnap.data().parentEmails || [];
      ccParentEmails = [...new Set(
          pe.map((x) => normEmail(String(x))).filter(Boolean),
      )];
    }
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
    minorRecipient,
    ccParentEmails,
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
    minorRecipient,
    ccParentEmails,
    bodyPreview,
    bodyLength: bodyRaw.length,
    actorUid: request.auth.uid,
    at: now,
  });

  await batch.commit();

  return {
    ok: true,
    messageId: msgRef.id,
    minorRecipient,
    ccCount: ccParentEmails.length,
    warnNoCc: minorRecipient && ccParentEmails.length === 0,
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

  // Verify caller is a current member of this channel.
  const memberIds = Array.isArray(channel.memberIds) ?
    channel.memberIds.map((e) => normEmail(String(e))).filter(Boolean) :
    [];
  if (!memberIds.includes(callerEmail)) {
    throw new HttpsError(
        'permission-denied',
        'You are not a member of this channel.',
    );
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
  if (safesportMonitored) {
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

    // Detect parents missing from current memberIds (dropped after creation).
    const missingParents = resolvedParents.filter((p) => !memberSet.has(p));
    const newParentsFound = resolvedParents.length > ccParentEmails.length;

    if (missingParents.length > 0 || newParentsFound) {
      const updatedMemberIds = [
        ...new Set([...memberIds, ...resolvedParents]),
      ].sort();
      await channelRef.update({
        memberIds: updatedMemberIds,
        ccParentEmails: resolvedParents,
      });
      ccParentEmails = resolvedParents;
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
    ...(safesportMonitored ? {ccParentEmails} : {}),
  });

  batch.set(db().collection('messaging_audit').doc(), {
    action: 'channel_message',
    channelId,
    clubId,
    teamId: channelTeamId || null,
    fromEmail: callerEmail,
    safesportMonitored,
    ccParentEmails: safesportMonitored ? ccParentEmails : [],
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
  batch.set(plRef, {
    clubId,
    teamId: currentTeamId,
    playerName: childName,
    role: 'player',
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
  const actor = assertParent(request);
  await assertChildInParentHousehold(actor, childUid);
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
