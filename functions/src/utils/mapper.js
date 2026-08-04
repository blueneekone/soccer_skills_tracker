'use strict';

const admin = require('firebase-admin');

async function processPlayersBatch(db, rawPlayers, generateCode, tenantId, teamId, callerUid) {
  const batchResult = {processed: 0, skipped: 0, invites: []};
  const now = admin.firestore.FieldValue.serverTimestamp();

  let batch = db().batch();
  let opCount = 0;

  for (const player of rawPlayers) {
    const email = player.email;
    if (!email) { batchResult.skipped++; continue; }

    if (opCount >= 498) {
      await batch.commit();
      batch = db().batch();
      opCount = 0;
    }

    const userRef = db().doc(`users/${email}`);
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

    if (existingSnap.exists()) {
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
    const inviteRef = db().doc(`invites/${code}`);
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

    opCount += 2;
    batchResult.invites.push({email, code, name: player.displayName || email});
    batchResult.processed++;
  }

  if (opCount > 0) {
    await batch.commit();
  }
  return { batchResult, now };
}

module.exports = { processPlayersBatch };
