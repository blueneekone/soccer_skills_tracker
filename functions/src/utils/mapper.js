'use strict';

const crypto = require('crypto');
const admin = require('firebase-admin');

function getHouseholdId(email) {
  return 'hh_' + crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 16);
}

function applyGuardianAndAthleteBatch(batch, db, params) {
  const { parentEmail, playerName, player, householdId, tenantId, teamId, callerUid, now, code } = params;

  // 1. Establish Household (COPPA Decoupling: Guardian owns email, minor is athlete)
  const hhRef = db().doc(`households/${householdId}`);
  batch.set(hhRef, {
    id: householdId,
    parentEmails: admin.firestore.FieldValue.arrayUnion(parentEmail),
    playerNames: admin.firestore.FieldValue.arrayUnion(playerName),
    clubId: tenantId,
    teamId: teamId || null,
    updatedAt: now,
  }, { merge: true });

  // 2. Minor athlete registration in player_lookup
  const lookupKey = `${teamId || tenantId}_${playerName.toLowerCase().replace(/\s+/g, '_')}`;
  const lookupRef = db().doc(`player_lookup/${lookupKey}`);
  batch.set(lookupRef, {
    playerName,
    teamId: teamId || null,
    clubId: tenantId,
    parentEmails: [parentEmail],
    householdId,
    role: 'player',
    position: player.position || null,
    dateOfBirth: player.dateOfBirth || null,
    jersey: player.jerseyNumber || null,
    updatedAt: now,
  }, { merge: true });

  if (teamId) {
    const rosterRef = db().doc(`rosters/${teamId}`);
    batch.set(rosterRef, { players: admin.firestore.FieldValue.arrayUnion(playerName) }, { merge: true });
  }

  // 3. Guardian invite code to link athlete
  const inviteRef = db().doc(`invites/${code}`);
  batch.set(inviteRef, {
    code,
    tenantId,
    clubId: tenantId,
    teamId: teamId || null,
    role: 'parent',
    householdId,
    usageLimit: 1,
    usageCount: 0,
    consumedByUids: [],
    targetEmail: parentEmail,
    createdByUid: callerUid,
    createdAt: now,
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
}

async function processPlayersBatch(db, rawPlayers, generateCode, tenantId, teamId, callerUid) {
  const batchResult = {processed: 0, skipped: 0, invites: []};
  const now = admin.firestore.FieldValue.serverTimestamp();

  let batch = db().batch();
  let opCount = 0;

  for (const player of rawPlayers) {
    const parentEmail = (player.email || '').toLowerCase().trim();
    if (!parentEmail) { batchResult.skipped++; continue; }

    if (opCount >= 490) {
      await batch.commit();
      batch = db().batch();
      opCount = 0;
    }

    const householdId = getHouseholdId(parentEmail);
    const playerName = player.displayName || parentEmail.split('@')[0];
    const code = generateCode();

    applyGuardianAndAthleteBatch(batch, db, {
      parentEmail, playerName, player, householdId, tenantId, teamId, callerUid, now, code,
    });

    const userRef = db().doc(`users/${parentEmail}`);
    const existingSnap = await userRef.get();
    if (existingSnap.exists()) {
      batch.update(userRef, { householdId, clubId: tenantId, teamId: teamId || null, updatedAt: now });
    } else {
      batch.set(userRef, {
        email: parentEmail, displayName: parentEmail.split('@')[0],
        role: 'parent', householdId, clubId: tenantId, teamId: teamId || null,
        ingestedByUid: callerUid, ingestedAt: now, createdAt: now, status: 'invited',
      });
    }

    opCount += 5;
    batchResult.invites.push({email: parentEmail, code, name: playerName});
    batchResult.processed++;
  }

  if (opCount > 0) await batch.commit();
  return { batchResult, now };
}

module.exports = { processPlayersBatch, getHouseholdId };
