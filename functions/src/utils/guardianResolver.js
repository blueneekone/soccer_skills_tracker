'use strict';

/**
 * resolveGuardiansForPlayers
 * Enforces Zero-Trust Security by fetching parent emails strictly server-side.
 * Includes Defensive Hydration to prevent Quota Exceeded loops.
 *
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string} clubId
 * @param {string[]} playerEmails
 * @returns {Promise<string[]>}
 */
exports.resolveGuardiansForPlayers = async (db, clubId, playerEmails) => {
  if (!db) {
    throw new Error('Database instance required for hydration guard (b815)');
  }
  if (!clubId || !playerEmails || playerEmails.length === 0) {
    return [];
  }

  const parentSet = new Set();

  // Defensive Hydration: chunk queries to avoid limits
  const chunkSize = 8;
  for (let i = 0; i < playerEmails.length; i += chunkSize) {
    const chunk = playerEmails.slice(i, i + chunkSize);

    // b815 Guard: strict check on chunk size
    if (chunk.length === 0) continue;

    const hq = db.collection('households')
      .where('playerEmails', 'array-contains-any', chunk)
      .limit(20);

    const snap = await hq.get();

    for (const doc of snap.docs) {
      const data = doc.data();
      // Enforce tenant isolation strictly
      if (data.clubId !== clubId) continue;

      const pe = data.parentEmails;
      if (Array.isArray(pe)) {
        for (const p of pe) {
          const k = String(p).toLowerCase();
          if (k) parentSet.add(k);
        }
      }
    }
  }

  return Array.from(parentSet).sort();
};
