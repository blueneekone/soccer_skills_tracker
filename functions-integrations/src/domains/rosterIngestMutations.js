'use strict';

/**
 * Roster ingestion mutations - extracts batch writes from ingestRoster.js.
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
const {normEmail, isValidEmail} = require('./rosterIngestParse');

/** Generate a unique 6-character alphanumeric invite code. */
function generateCode() {
  return crypto.randomBytes(4).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
}

/**
 * Commits the parsed players into Firestore using batch writes.
 * @param {Array<{email: string, displayName?: string, position?: string, dateOfBirth?: string, jerseyNumber?: string}>} rawPlayers
 * @param {{ callerUid: string, tenantId: string, teamId: string | null, format: string }} context
 * @return {Promise<{processed: number, skipped: number, invites: Array<{email: string, code: string, name: string}>}>}
 */
async function batchCommitRoster(rawPlayers, context) {
  const db = admin.firestore();
  const {callerUid, tenantId, teamId, format} = context;

  const batchResult = {processed: 0, skipped: 0, invites: []};
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  for (const player of rawPlayers) {
    const email = normEmail(player.email);
    if (!email || !isValidEmail(email)) {
      batchResult.skipped++;
      continue;
    }

    const userRef = db.doc(`users/${email}`);
    const existingSnap = await userRef.get();

    const userData = {
      email,
      displayName: player.displayName || email.split('@')[0],
      position: player.position || null,
      dateOfBirth: player.dateOfBirth || null,
      jerseyNumber: player.jerseyNumber || null,
      role: 'player',
      clubId: tenantId,
      tenantId,
      teamId: teamId || null,
      ingestedByUid: callerUid,
      ingestedAt: now,
      status: 'invited',
    };

    if (existingSnap.exists) {
      const existing = existingSnap.data();
      batch.update(userRef, {
        ...userData,
        role: existing.role || 'player',
        updatedAt: now,
      });
    } else {
      batch.set(userRef, {...userData, createdAt: now, xp: 0, tier: 'ROOKIE'});
    }

    const code = generateCode();
    const inviteRef = db.doc(`invites/${code}`);
    batch.set(inviteRef, {
      code,
      tenantId,
      clubId: tenantId,
      teamId: teamId || null,
      role: 'player',
      usageLimit: 1,
      usageCount: 0,
      consumedByUids: [],
      targetEmail: email,
      createdByUid: callerUid,
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    batchResult.invites.push({email, code, name: player.displayName || email});
    batchResult.processed++;
  }

  await batch.commit();

  await db.collection('audit_logs').add({
    action: 'ROSTER_INGESTED',
    actorUid: callerUid,
    tenantId,
    format,
    processed: batchResult.processed,
    skipped: batchResult.skipped,
    teamId: teamId || null,
    timestamp: now,
  });

  return batchResult;
}

module.exports = {
  batchCommitRoster,
};
