const { processHouseholdAndParent } = require('./rosterHelpers');
const { dispatchParentInviteNotification } = require('../domains/notificationOps');
/**
 * Processes a query using cursor pagination, accumulating writes into batches
 * and committing them sequentially to respect the 500 operation limit.
 *
 * @param {import('firebase-admin/firestore').Query} query
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {Function} processDocFn Function that takes (doc, batch)
 * @returns {Promise<number>} Total operations processed
 */
async function processBatchedQuery(query, db, processDocFn) {
  let hasMore = true;
  let lastVisible = null;
  let totalOps = 0;

  while (hasMore) {
    let currentQuery = query.limit(400); // 400 to leave safety margin
    if (lastVisible) {
      currentQuery = currentQuery.startAfter(lastVisible);
    }

    const snapshot = await currentQuery.get();

    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    let batch = db.batch();
    let opsInCurrentBatch = 0;

    for (const doc of snapshot.docs) {
      // Wrapper to count operations
      const batchProxy = {
        update: (ref, data) => {
          batch.update(ref, data);
          opsInCurrentBatch++;
          totalOps++;
        },
        set: (ref, data, opts) => {
          batch.set(ref, data, opts);
          opsInCurrentBatch++;
          totalOps++;
        },
        delete: (ref) => {
          batch.delete(ref);
          opsInCurrentBatch++;
          totalOps++;
        }
      };

      await processDocFn(doc, batchProxy);
    }

    if (opsInCurrentBatch > 0) {
      await batch.commit();
    }

    lastVisible = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.docs.length < 400) {
      hasMore = false;
    }
  }

  return totalOps;
}

module.exports = {
  processBatchedQuery
};

/**
 * Utility for handling paginated batched writes in Firestore for vampire import.
 */
async function executeBatchPagination(sanitizedRows, db, teamId, clubId, authUid) {
  let totalProcessed = 0;
  const now = new Date().toISOString();

  // Process rows sequentially to avoid transaction limits, but run ops in transactions
  for (let i = 0; i < sanitizedRows.length; i++) {
    const {
      email, firstName, lastName, jerseyNumber, phone,
      ParentName, ParentEmail, PlayerDOB, SportBranch,
      ...rest
    } = sanitizedRows[i];

    let isNewParentGlobal = false;
    let inviteTokenGlobal = null;
    let parentEmailGlobal = null;
    let childEmailGlobal = email ? email.toLowerCase().trim() : `child_${Date.now()}_${i}@temp.com`;

    await db.runTransaction(async (transaction) => {
      let householdId = `hh_${teamId}_${Date.now()}_${i}_${Math.floor(Math.random() * 100000)}`;

      if (ParentEmail) {
        const result = await processHouseholdAndParent(db, transaction, ParentEmail, teamId);
        householdId = result.householdId;
        isNewParentGlobal = result.isNewParent;
        inviteTokenGlobal = result.inviteToken;
        parentEmailGlobal = result.parentEmailLower;
      }

      const playerData = {
        firstName, lastName, type: 'player', teamId, clubId,
        householdId, createdBy: authUid, ingestedAt: now,
        status: ParentEmail ? 'AWAITING_PARENT_VERIFICATION' : 'ACTIVE',
        isCleared: !ParentEmail,
        ...rest
      };
      if (PlayerDOB !== undefined) playerData.PlayerDOB = PlayerDOB;
      if (SportBranch !== undefined) playerData.SportBranch = SportBranch;
      if (jerseyNumber !== undefined) playerData.jerseyNumber = jerseyNumber;

      const pRef = db.collection('users').doc(childEmailGlobal);
      transaction.set(pRef, playerData);

      // Keep old staging write for backward compatibility if needed, or remove.
      // Instructions specify writing to `/users/{childEmailLower}`
    });

    if (isNewParentGlobal && inviteTokenGlobal) {
      await dispatchParentInviteNotification(parentEmailGlobal, inviteTokenGlobal);
    }

    totalProcessed++;
  }

  return totalProcessed;
}

module.exports.executeBatchPagination = executeBatchPagination;
