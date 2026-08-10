import { Firestore } from 'firebase-admin/firestore';

export async function resolveParentEmails(
  db: Firestore,
  memberIds: string[]
): Promise<{ ccParentEmails: string[]; missingParents: boolean }> {
  if (!db) throw new Error('Database instance required for hydration guard (b815)');
  if (!memberIds || memberIds.length === 0) return { ccParentEmails: [], missingParents: false };

  const parentSet = new Set<string>();
  let missingParents = false;

  const chunkSize = 8;
  for (let i = 0; i < memberIds.length; i += chunkSize) {
    const chunk = memberIds.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    const refs = chunk.map((id) => db.collection('users').doc(id));
    const userDocs = await db.getAll(...refs);

    for (const userDoc of userDocs) {
      if (!userDoc.exists) continue;
      const data = userDoc.data()!;

      if (data.role === 'player' && data.isMinor === true) {
        const playerEmail = data.email;
        if (!playerEmail) {
          missingParents = true;
          continue;
        }

        const snap = await db
          .collection('households')
          .where('playerEmails', 'array-contains', playerEmail)
          .limit(1)
          .get();

        if (snap.empty) {
          missingParents = true;
        } else {
          const hData = snap.docs[0].data();
          const pe = hData.parentEmails;
          if (Array.isArray(pe) && pe.length > 0) {
            pe.forEach((p) => {
              const cleaned = String(p).trim().toLowerCase();
              if (cleaned) {
                parentSet.add(cleaned);
              }
            });
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
}
