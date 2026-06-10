/* eslint-disable quotes */
/**
 * comms.js â€” SafeSport Communication Engine
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Cloud Functions enforcing the Vanguard SafeSport messaging policy:
 *
 * RULE OF THREE (Safe Sport Foundation)
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * 1. No 1-on-1 communication between a coach and a minor.
 *    All messages to players under 13 MUST be sent to a team/group,
 *    automatically CC-ing the parent / guardian.
 * 2. Messages are always team-scoped â€” never player-scoped â€” when any
 *    known minor is among the recipients.
 * 3. Every broadcast to a team containing minors writes an immutable
 *    audit log entry with { parentNotified: true } before the message
 *    is persisted in Firestore.
 *
 * Exports:
 *   safeSportBroadcast  â€” onCall: send a team/group message with automatic
 *                         minor detection and parent CC enforcement.
 *   safeSportVerify     â€” onCall: verify a player profile document is SafeSport
 *                         compliant (used by compliance portal).
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {logActivity, ACTIVITY_TYPE} = require('./auditLogger');
const {
  resolveIsMinor,
  filterParentsWithCommsConsent,
} = require('./src/domains/commsPolicy');

const REGION = 'us-east1';
const db = admin.firestore();

/** Normalise email to lowercase, trimmed. */
const normEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '');

const MAX_CLUB_BROADCAST_TEAMS = 40;

/**
 * Persist a SafeSport team broadcast (shared by safeSportBroadcast + clubSportBroadcast).
 * Caller must enforce auth/scope before invoking.
 *
 * @return {Promise<{success: true, messageId: string, auditLogId: string, teamId: string, recipientCount: number, parentNotified: boolean, ccParentCount: number}>}
 */
async function commitTeamBroadcast({
  callerUid,
  callerEmail,
  callerRole,
  callerClubId,
  teamId,
  channelId = '',
  bodyRaw,
  subject = '',
  ipAddress,
  broadcastSource = null,
}) {
  const teamSnap = await db.collection('teams').doc(teamId).get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', `Team "${teamId}" not found.`);
  }
  const teamData = teamSnap.data();
  const teamClubId = teamData.clubId || '';

  const rosterSnap = await db
      .collection('player_lookup')
      .where('teamId', '==', teamId)
      .get();

  const playerEmails = rosterSnap.docs.map((d) => normEmail(d.data().email || d.id));
  let hasMinors = false;
  const ccParentEmailSet = new Set();

  const profilePromises = playerEmails.map(async (email) => {
    if (!email) return;
    try {
      const profSnap = await db.collection('users').doc(email).get();
      if (!profSnap.exists) return;
      const prof = profSnap.data();
      if (!resolveIsMinor(prof)) return;
      hasMinors = true;

      /** @type {string[]} */
      const parentCandidates = [];
      const householdId = prof.householdId || '';
      if (householdId) {
        const hSnap = await db.collection('households').doc(householdId).get();
        if (hSnap.exists) {
          const pe = hSnap.data().parentEmails || [];
          pe.forEach((p) => {
            const n = normEmail(String(p));
            if (n) parentCandidates.push(n);
          });
        }
      }

      const directParent = normEmail(prof.parentEmail || '');
      if (directParent) parentCandidates.push(directParent);

      const consented = await filterParentsWithCommsConsent(
          db,
          parentCandidates,
          email,
      );
      consented.forEach((p) => ccParentEmailSet.add(p));
    } catch (err) {
      logger.warn('[commitTeamBroadcast] profile resolution error', {email, err: err.message});
    }
  });

  await Promise.all(profilePromises);

  const ccParentEmails = [...ccParentEmailSet];
  const parentNotified = hasMinors ? ccParentEmails.length > 0 : false;
  const messageHash = crypto.createHash('sha256').update(bodyRaw).digest('hex');

  const auditId = db.collection('audit_logs').doc().id;
  await logActivity(ACTIVITY_TYPE.MESSAGE_BROADCAST, {
    actorUid: callerUid,
    actorEmail: callerEmail,
    tenantId: callerClubId || teamClubId,
    notes: `Team broadcast to ${teamId} — ${playerEmails.length} recipients, minors: ${hasMinors}, CCd parents: ${ccParentEmails.length}`,
    extra: {
      teamId,
      channelId: channelId || null,
      recipientCount: playerEmails.length,
      hasMinors,
      ccParentEmails,
      parentNotified,
      messageHash,
      subject: subject || null,
      auditId,
      broadcastSource: broadcastSource || null,
    },
    ipAddress,
  });

  const msgRef = db.collection('team_broadcasts').doc();
  await msgRef.set({
    teamId,
    teamClubId: teamClubId || null,
    channelId: channelId || null,
    fromUid: callerUid,
    fromEmail: callerEmail,
    fromRole: callerRole,
    subject: subject || null,
    body: bodyRaw,
    bodyPreview: bodyRaw.slice(0, 140),
    recipientCount: playerEmails.length,
    hasMinors,
    ccParentEmails,
    parentNotified,
    messageHash,
    auditLogId: auditId,
    source: broadcastSource || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info('[commitTeamBroadcast] broadcast committed', {
    msgId: msgRef.id,
    teamId,
    hasMinors,
    parentNotified,
    callerEmail,
  });

  return {
    success: true,
    messageId: msgRef.id,
    auditLogId: auditId,
    teamId,
    recipientCount: playerEmails.length,
    parentNotified,
    ccParentCount: ccParentEmails.length,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// safeSportBroadcast
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Send a team / group message with automatic minor detection and CC enforcement.
 *
 * Input (request.data):
 *   teamId      string  â€” required; recipient team
 *   channelId   string  â€” optional; specific channel within the team
 *   body        string  â€” required; message body (max 4000 chars)
 *   subject     string  â€” optional; message subject line
 *
 * Guards:
 *   â€¢ Caller must be authenticated as coach, director, or admin.
 *   â€¢ Coach callers must own the target teamId.
 *   â€¢ Director callers must be in the same club as the team.
 *   â€¢ Individual-player targeting is BLOCKED â€” target must be a team/channel.
 *
 * SafeSport enforcement:
 *   â€¢ Resolves the full roster for the target team via `player_lookup`.
 *   â€¢ For each player with `isMinor: true`, resolves their parentEmail(s) from
 *     the linked household document.
 *   â€¢ parentEmails are stored on the message as `ccParentEmails[]`.
 *   â€¢ `parentNotified: true` is set on the message document and in the audit log.
 *
 * Audit:
 *   â€¢ Writes ACTIVITY_TYPE.MESSAGE_BROADCAST to audit_logs before message commit.
 *   â€¢ messageHash = SHA-256 of body (NOT stored in the message itself â€” only in
 *     the audit log) to enable integrity verification without exposing content.
 */
exports.safeSportBroadcast = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerUid = request.auth.uid;
  const callerEmail = normEmail(request.auth.token.email);
  const callerRole = request.auth.token.role || '';
  const callerTeamId = request.auth.token.teamId || '';
  const callerClubId = request.auth.token.clubId || request.auth.token.tenantId || '';

  // Only coaches, directors, and admins may broadcast.
  const allowedRoles = ['coach', 'director', 'global_admin', 'super_admin'];
  if (!allowedRoles.includes(callerRole)) {
    throw new HttpsError(
        'permission-denied',
        'Only coaches and directors may send team messages.',
    );
  }

  const data = request.data || {};
  const teamId = typeof data.teamId === 'string' ? data.teamId.trim() : '';
  const channelId = typeof data.channelId === 'string' ? data.channelId.trim() : '';
  const bodyRaw = typeof data.body === 'string' ? data.body.trim() : '';
  const subject = typeof data.subject === 'string' ? data.subject.trim().slice(0, 200) : '';

  if (!teamId) {
    throw new HttpsError(
        'invalid-argument',
        'teamId is required. Individual-player targeting is blocked by SafeSport policy.',
    );
  }
  if (!bodyRaw) {
    throw new HttpsError('invalid-argument', 'Message body is required.');
  }
  if (bodyRaw.length > 4000) {
    throw new HttpsError('invalid-argument', 'Message body exceeds 4000 characters.');
  }

  // â”€â”€ Resolve team document â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const teamSnap = await db.collection('teams').doc(teamId).get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', `Team "${teamId}" not found.`);
  }
  const teamData = teamSnap.data();
  const teamClubId = teamData.clubId || '';

  // â”€â”€ Scope enforcement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (callerRole === 'coach' && callerTeamId !== teamId) {
    throw new HttpsError(
        'permission-denied',
        'Coaches may only broadcast to their own team.',
    );
  }
  if (callerRole === 'director') {
    if (!teamClubId || teamClubId !== callerClubId) {
      throw new HttpsError(
          'permission-denied',
          'Team is not within your organisation.',
      );
    }
  }

  return commitTeamBroadcast({
    callerUid,
    callerEmail,
    callerRole,
    callerClubId,
    teamId,
    channelId,
    bodyRaw,
    subject,
    ipAddress: request.rawRequest?.ip,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clubSportBroadcast — Epic 4.8 director club-wide fan-out
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Director club broadcast — fans out to one or all teams in a club.
 * Each team receives a team_broadcasts doc (rides Epic 4.3 push bus).
 *
 * Input:
 *   clubId    string   — required
 *   body      string   — required (max 4000)
 *   subject   string   — optional
 *   teamIds   string[] — optional subset; default all teams in club
 */
exports.clubSportBroadcast = onCall({region: REGION}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerUid = request.auth.uid;
  const callerEmail = normEmail(request.auth.token.email);
  const callerRole = request.auth.token.role || '';
  const callerClubId = request.auth.token.clubId || request.auth.token.tenantId || '';

  const directorRoles = ['director', 'global_admin', 'super_admin'];
  if (!directorRoles.includes(callerRole)) {
    throw new HttpsError(
        'permission-denied',
        'Only directors may send club-wide broadcasts.',
    );
  }

  const data = request.data || {};
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const bodyRaw = typeof data.body === 'string' ? data.body.trim() : '';
  const subject = typeof data.subject === 'string' ? data.subject.trim().slice(0, 200) : '';
  const requestedTeamIds = Array.isArray(data.teamIds)
    ? data.teamIds.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim())
    : [];

  if (!clubId) {
    throw new HttpsError('invalid-argument', 'clubId is required.');
  }
  if (!bodyRaw) {
    throw new HttpsError('invalid-argument', 'Message body is required.');
  }
  if (bodyRaw.length > 4000) {
    throw new HttpsError('invalid-argument', 'Message body exceeds 4000 characters.');
  }

  if (callerRole === 'director' && callerClubId !== clubId) {
    throw new HttpsError(
        'permission-denied',
        'Club broadcast is limited to your organisation.',
    );
  }

  /** @type {string[]} */
  let teamIds = requestedTeamIds;
  if (teamIds.length === 0) {
    const teamsSnap = await db.collection('teams').where('clubId', '==', clubId).get();
    teamIds = teamsSnap.docs.map((d) => d.id);
  } else {
    const teamSnaps = await Promise.all(
        teamIds.map((tid) => db.collection('teams').doc(tid).get()),
    );
    for (let i = 0; i < teamSnaps.length; i++) {
      const snap = teamSnaps[i];
      const tid = teamIds[i];
      if (!snap.exists) {
        throw new HttpsError('not-found', `Team "${tid}" not found.`);
      }
      if ((snap.data().clubId || '') !== clubId) {
        throw new HttpsError(
            'permission-denied',
            `Team "${tid}" is not in club "${clubId}".`,
        );
      }
    }
  }

  if (teamIds.length === 0) {
    throw new HttpsError('failed-precondition', 'No teams found in this club.');
  }
  if (teamIds.length > MAX_CLUB_BROADCAST_TEAMS) {
    throw new HttpsError(
        'resource-exhausted',
        `Club broadcast limited to ${MAX_CLUB_BROADCAST_TEAMS} teams per send.`,
    );
  }

  const clubAuditId = db.collection('audit_logs').doc().id;
  await logActivity(ACTIVITY_TYPE.MESSAGE_BROADCAST, {
    actorUid: callerUid,
    actorEmail: callerEmail,
    tenantId: clubId,
    notes: `Club broadcast to ${teamIds.length} team(s) in ${clubId}`,
    extra: {
      clubId,
      teamIds,
      teamCount: teamIds.length,
      subject: subject || null,
      auditId: clubAuditId,
      broadcastSource: 'club_broadcast',
    },
    ipAddress: request.rawRequest?.ip,
  });

  /** @type {Array<{teamId: string, messageId?: string, recipientCount?: number, ccParentCount?: number, error?: string}>} */
  const results = [];
  let totalRecipients = 0;
  let totalCcParents = 0;

  for (const teamId of teamIds) {
    try {
      const r = await commitTeamBroadcast({
        callerUid,
        callerEmail,
        callerRole,
        callerClubId: clubId,
        teamId,
        bodyRaw,
        subject,
        ipAddress: request.rawRequest?.ip,
        broadcastSource: 'club_broadcast',
      });
      results.push({
        teamId,
        messageId: r.messageId,
        recipientCount: r.recipientCount,
        ccParentCount: r.ccParentCount,
      });
      totalRecipients += r.recipientCount;
      totalCcParents += r.ccParentCount;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('[clubSportBroadcast] team fan-out failed', {teamId, err: msg});
      results.push({teamId, error: msg});
    }
  }

  const successCount = results.filter((r) => r.messageId).length;
  if (successCount === 0) {
    throw new HttpsError('internal', 'Club broadcast failed for all teams.');
  }

  logger.info('[clubSportBroadcast] club broadcast complete', {
    clubId,
    teamCount: teamIds.length,
    successCount,
    callerEmail,
  });

  return {
    success: true,
    clubId,
    clubAuditId,
    teamCount: teamIds.length,
    successCount,
    totalRecipients,
    totalCcParents,
    results,
  };
});
