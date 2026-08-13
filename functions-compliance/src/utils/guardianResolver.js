// 🛡️ SafeSport Compliance Mandate: Enforces Parent Shadow CC routing for minors.
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

/**
 * resolveParentEmails
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {string[]} memberIds
 * @returns {Promise<{ccParentEmails: string[], missingParents: boolean}>}
 */
exports.resolveParentEmails = async (db, memberIds) => {
  if (!db) {
    throw new Error('Database instance required for hydration guard (b815)');
  }
  if (!memberIds || memberIds.length === 0) {
    return { ccParentEmails: [], missingParents: false };
  }

  const parentSet = new Set();
  let missingParents = false;

  // We need to resolve which of these memberIds correspond to minors.
  // We assume here that memberIds are user emails for simplicity, but if they are UIDs, we need to resolve those to emails first or query differently.
  // Assuming they are emails or UIDs where we can fetch user docs.

  const chunkSize = 8;
  for (let i = 0; i < memberIds.length; i += chunkSize) {
    const chunk = memberIds.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    // Check users to see if they are minors
    const usersSnap = await db.collection('users')
      .where('uid', 'in', chunk)
      .get();

    // Alternatively if memberIds are doc ids in users collection:
    // This is safer: query by doc ID. We will just use `db.getAll()`
    const refs = chunk.map(id => db.collection('users').doc(id));
    const userDocs = await db.getAll(...refs);

    for (const userDoc of userDocs) {
      if (!userDoc.exists) continue;
      const data = userDoc.data();

      // Check if user is a minor.
      // If no age/role field, fallback logic might apply. Assuming 'isMinor' or role === 'player' and age < 18.
      // Let's assume all players are potential minors for shadow CC unless proven otherwise, or check role.
      if (data.role === 'player') {
        // Need to find households for this player email
        const playerEmail = data.email;
        if (!playerEmail) {
            missingParents = true;
            continue;
        }

        const hq = db.collection('households')
          .where('playerEmails', 'array-contains', playerEmail)
          .limit(1);

        const snap = await hq.get();
        if (snap.empty) {
            missingParents = true;
        } else {
            const hData = snap.docs[0].data();
            const pe = hData.parentEmails;
            if (Array.isArray(pe) && pe.length > 0) {
                pe.forEach(p => parentSet.add(String(p).toLowerCase()));
            } else {
                missingParents = true;
            }
        }
      }
    }
  }

  return {
    ccParentEmails: Array.from(parentSet).sort(),
    missingParents,
  };
};
