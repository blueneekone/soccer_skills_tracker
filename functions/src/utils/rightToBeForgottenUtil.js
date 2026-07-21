'use strict';

const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

/** Lazy Firestore accessor */
const db = () => admin.firestore();

const PAGE_SIZE = 500; // Batch limit

/**
 * Handles cascading deletes of a user's data across collections
 * to satisfy GDPR/CCPA "Right to be Forgotten" mandates.
 * Enforces Defensive Hydration (b815 Rule) by ensuring `db()` is available.
 * @param {string} targetUid The UID of the user to be forgotten.
 * @param {string} targetEmail The email of the user to be forgotten.
 * @returns {Promise<void>}
 */
async function cascadeDeleteUserData(targetUid, targetEmail) {
  const firestore = db();
  if (!firestore) return; // Strict Defensive Hydration guard (b815 Rule)

  const emailKey = targetEmail ? targetEmail.toLowerCase() : null;

  try {
    // 1. Delete from root collections keyed by email/uid
    const rootRefs = [];
    if (emailKey) {
      rootRefs.push(firestore.collection('users').doc(emailKey));
      rootRefs.push(firestore.collection('passports').doc(emailKey));
      rootRefs.push(firestore.collection('device_tokens').doc(targetUid));
    }

    if (rootRefs.length > 0) {
      const rootBatch = firestore.batch();
      rootRefs.forEach(ref => rootBatch.delete(ref));
      await rootBatch.commit();
    }

    // 2. Cascade delete records matching user's UID or Email from specific collections.
    // Example: cascading delete of user's posts, comments, activity logs, etc.
    const collectionsToPurge = [
      { col: 'workouts', field: 'playerUid', val: targetUid },
      { col: 'trial_scores', field: 'playerUid', val: targetUid },
      { col: 'team_assignments', field: 'committedBy', val: targetUid },
      { col: 'security_audit', field: 'actorUid', val: targetUid },
    ];

    if (emailKey) {
       collectionsToPurge.push({ col: 'vpc_requests', field: 'playerEmail', val: emailKey });
       collectionsToPurge.push({ col: 'academic_records', field: 'playerEmail', val: emailKey });
    }

    for (const task of collectionsToPurge) {
      let query = firestore.collection(task.col)
         .where(task.field, '==', task.val)
         .limit(PAGE_SIZE);

      while (true) {
        const snap = await query.get();
        if (snap.empty) break;

        const batch = firestore.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    // 3. Delete Firebase Auth user
    try {
      await admin.auth().deleteUser(targetUid);
      logger.info('[cascadeDeleteUserData] deleted Auth user', {targetUid});
    } catch (authErr) {
      if (authErr.code !== 'auth/user-not-found') {
        throw authErr;
      }
    }

    logger.info('[cascadeDeleteUserData] cascading deletes complete', {
      targetUid,
      targetEmail,
    });
  } catch (err) {
    logger.error('[cascadeDeleteUserData] cascading delete failed', {
      targetUid,
      targetEmail,
      err: err.message,
    });
    throw err;
  }
}

module.exports = {
  cascadeDeleteUserData,
};
