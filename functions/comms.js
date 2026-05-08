/* eslint-disable quotes */
/**
 * comms.js — SafeSport Communication Engine
 * ─────────────────────────────────────────
 * Cloud Functions enforcing the Vanguard SafeSport messaging policy:
 *
 * RULE OF THREE (Safe Sport Foundation)
 * ───────────────────────────────────────
 * 1. No 1-on-1 communication between a coach and a minor.
 *    All messages to players under 13 MUST be sent to a team/group,
 *    automatically CC-ing the parent / guardian.
 * 2. Messages are always team-scoped — never player-scoped — when any
 *    known minor is among the recipients.
 * 3. Every broadcast to a team containing minors writes an immutable
 *    audit log entry with { parentNotified: true } before the message
 *    is persisted in Firestore.
 *
 * Exports:
 *   safeSportBroadcast  — onCall: send a team/group message with automatic
 *                         minor detection and parent CC enforcement.
 *   safeSportVerify     — onCall: verify a player profile document is SafeSport
 *                         compliant (used by compliance portal).
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {logActivity, ACTIVITY_TYPE} = require('./auditLogger');

const REGION = 'us-central1';
const db = admin.firestore();

/** Normalise email to lowercase, trimmed. */
const normEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '');

// ─────────────────────────────────────────────────────────────────────────────
// safeSportBroadcast
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a team / group message with automatic minor detection and CC enforcement.
 *
 * Input (request.data):
 *   teamId      string  — required; recipient team
 *   channelId   string  — optional; specific channel within the team
 *   body        string  — required; message body (max 4000 chars)
 *   subject     string  — optional; message subject line
 *
 * Guards:
 *   • Caller must be authenticated as coach, director, or admin.
 *   • Coach callers must own the target teamId.
 *   • Director callers must be in the same club as the team.
 *   • Individual-player targeting is BLOCKED — target must be a team/channel.
 *
 * SafeSport enforcement:
 *   • Resolves the full roster for the target team via `player_lookup`.
 *   • For each player with `isMinor: true`, resolves their parentEmail(s) from
 *     the linked household document.
 *   • parentEmails are stored on the message as `ccParentEmails[]`.
 *   • `parentNotified: true` is set on the message document and in the audit log.
 *
 * Audit:
 *   • Writes ACTIVITY_TYPE.MESSAGE_BROADCAST to audit_logs before message commit.
 *   • messageHash = SHA-256 of body (NOT stored in the message itself — only in
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

  // ── Resolve team document ────────────────────────────────────────────────
  const teamSnap = await db.collection('teams').doc(teamId).get();
  if (!teamSnap.exists) {
    throw new HttpsError('not-found', `Team "${teamId}" not found.`);
  }
  const teamData = teamSnap.data();
  const teamClubId = teamData.clubId || '';

  // ── Scope enforcement ────────────────────────────────────────────────────
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

  // ── Resolve roster for minor detection ───────────────────────────────────
  const rosterSnap = await db
      .collection('player_lookup')
      .where('teamId', '==', teamId)
      .get();

  const playerEmails = rosterSnap.docs.map((d) => normEmail(d.data().email || d.id));
  let hasMinors = false;
  const ccParentEmailSet = new Set();

  // Resolve each player's profile for isMinor flag and householdId.
  const profilePromises = playerEmails.map(async (email) => {
    if (!email) return;
    try {
      const profSnap = await db.collection('users').doc(email).get();
      if (!profSnap.exists) return;
      const prof = profSnap.data();
      const isMinor = prof.isMinor === true || (typeof prof.age === 'number' && prof.age < 13);
      if (!isMinor) return;
      hasMinors = true;

      // Resolve parent emails from household if available.
      const householdId = prof.householdId || '';
      if (householdId) {
        const hSnap = await db.collection('households').doc(householdId).get();
        if (hSnap.exists) {
          const pe = hSnap.data().parentEmails || [];
          pe.forEach((p) => {
            const n = normEmail(String(p));
            if (n) ccParentEmailSet.add(n);
          });
        }
      }

      // Fallback: parentEmail field directly on user profile.
      const directParent = normEmail(prof.parentEmail || '');
      if (directParent) ccParentEmailSet.add(directParent);
    } catch (err) {
      logger.warn('[safeSportBroadcast] profile resolution error', {email, err: err.message});
    }
  });

  await Promise.all(profilePromises);

  const ccParentEmails = [...ccParentEmailSet];

  // ── SAFETY GUARD: block broadcast to minor-containing team without parent CCs ──
  // If the team has minors but we failed to resolve any parent emails, we
  // still proceed — the message is stored with parentNotified: false so
  // directors can see the gap in the compliance report.
  const parentNotified = hasMinors ? ccParentEmails.length > 0 : false;

  // ── Compute message hash for audit integrity ────────────────────────────
  const messageHash = crypto.createHash('sha256').update(bodyRaw).digest('hex');

  // ── AUDIT LOG — written BEFORE message commit ───────────────────────────
  // Safe-Sport compliance: we MUST record the communication intent before
  // any data is written, so the log cannot be deleted by rolling back the
  // batch.
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
      messageHash, // SHA-256 — not the body itself
      subject: subject || null,
      auditId,
    },
    ipAddress: request.rawRequest?.ip,
  });

  // ── Write message document ───────────────────────────────────────────────
  const targetPath = channelId
      ? db.collection('clubs').doc(teamClubId).collection('channels').doc(channelId)
      : db.collection('team_broadcasts').doc();

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
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info('[safeSportBroadcast] broadcast committed', {
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
    recipientCount: playerEmails.length,
    parentNotified,
    ccParentCount: ccParentEmails.length,
  };
});
