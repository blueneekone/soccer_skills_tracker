'use strict';
const admin = require('firebase-admin');
const crypto = require('crypto');

async function processHouseholdAndParent(db, transaction, parentEmail, teamId) {
  const ts = Date.now();
  const parentEmailLower = parentEmail.toLowerCase().trim();
  const parentRef = db.collection('users').doc(parentEmailLower);

  const parentDoc = await transaction.get(parentRef);
  let householdId;
  let isNewParent = false;
  let inviteToken = null;

  if (parentDoc.exists) {
    householdId = parentDoc.data().householdId;
    if (!householdId) {
      householdId = `hh_${teamId}_${ts}_${Math.floor(Math.random() * 100000)}`;
      transaction.update(parentRef, { householdId });
    }
  } else {
    isNewParent = true;
    householdId = `hh_${teamId}_${ts}_${Math.floor(Math.random() * 100000)}`;
    inviteToken = `tok_${crypto.randomBytes(16).toString('hex')}`;
    const tokenExp = Date.now() + 168 * 60 * 60 * 1000; // 168 hours

    transaction.set(parentRef, {
      role: 'parent',
      isCleared: false,
      invitePending: true,
      inviteToken,
      inviteTokenExpiresAt: tokenExp,
      householdId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const hhRef = db.collection('households').doc(householdId);
    transaction.set(hhRef, {
      parentEmails: [parentEmailLower],
      teamId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  return { householdId, isNewParent, inviteToken, parentEmailLower };
}

module.exports = {
  processHouseholdAndParent
};
