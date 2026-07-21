'use strict';

const admin = require('firebase-admin');
const crypto = require('crypto');
const {normEmail, isValidEmail} = require('./rosterIngestParse');

function generateCode() {
  return crypto.randomBytes(4).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
}

function writeUserAndInvite(batch, db, email, player, context, existingData, now, batchResult) {
  const userRef = db.doc(`users/${email}`);
  const userData = {
    email, displayName: player.displayName || email.split('@')[0],
    position: player.position || null, dateOfBirth: player.dateOfBirth || null,
    jerseyNumber: player.jerseyNumber || null, role: existingData?.role || 'player',
    clubId: context.tenantId, tenantId: context.tenantId, teamId: context.teamId || null,
    ingestedByUid: context.callerUid, ingestedAt: now, status: 'invited',
    updatedAt: existingData ? now : undefined, createdAt: existingData ? undefined : now,
    xp: existingData ? undefined : 0, tier: existingData ? undefined : 'ROOKIE',
  };
  if (existingData) batch.update(userRef, userData);
  else batch.set(userRef, userData);

  const code = generateCode();
  const inviteRef = db.doc(`invites/${code}`);
  batch.set(inviteRef, {
    code, tenantId: context.tenantId, clubId: context.tenantId, teamId: context.teamId || null,
    role: 'player', usageLimit: 1, usageCount: 0, consumedByUids: [],
    targetEmail: email, createdByUid: context.callerUid, createdAt: now,
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  batchResult.invites.push({email, code, name: player.displayName || email});
}

async function batchCommitRoster(rawPlayers, context) {
  const db = admin.firestore();
  const batchResult = {processed: 0, skipped: 0, invites: []};
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  for (const player of rawPlayers) {
    const email = normEmail(player.email);
    if (!email || !isValidEmail(email)) {
      batchResult.skipped++; continue;
    }
    const existingSnap = await db.doc(`users/${email}`).get();
    const existingData = existingSnap.exists ? existingSnap.data() : null;
    writeUserAndInvite(batch, db, email, player, context, existingData, now, batchResult);
    batchResult.processed++;
  }
  await batch.commit();
  await db.collection('audit_logs').add({
    action: 'ROSTER_INGESTED', actorUid: context.callerUid, tenantId: context.tenantId,
    format: context.format, processed: batchResult.processed, skipped: batchResult.skipped,
    teamId: context.teamId || null, timestamp: now,
  });
  return batchResult;
}

module.exports = {batchCommitRoster};
