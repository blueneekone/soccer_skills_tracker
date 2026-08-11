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
  let batch = db.batch();
  let opCount = 0;
  let totalProcessed = 0;

  for (let i = 0; i < sanitizedRows.length; i++) {
    const row = sanitizedRows[i];
    const docId = `vamp_${teamId}_${Date.now()}_${i}_${Math.floor(Math.random() * 100000)}`;
    const ref = db.collection('roster_staging').doc(docId);
    batch.set(ref, {
      ...row,
      teamId,
      clubId,
      createdBy: authUid,
      ingestedAt: new Date().toISOString()
    });
    opCount++;
    totalProcessed++;

    if (opCount === 500) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) await batch.commit();

  return totalProcessed;
}

module.exports.executeBatchPagination = executeBatchPagination;
