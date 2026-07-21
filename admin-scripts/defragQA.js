/**
 * defragQA.js — Wipe QA Club and Reassign Accounts to Aggies FC
 */
import admin from 'firebase-admin';

async function runDefrag() {
	if (!admin.apps.length) admin.initializeApp({ projectId: 'sports-skill-tracker-dev' });
	const db = admin.firestore();
	if (!db) return; // Defensive Hydration

	const clubs = await db.collection('clubs').get();
	let qaClubId = null;
    let targetClubId = null;

	for (const doc of clubs.docs) {
		const d = doc.data();
		if (d.name && d.name.includes('QA')) {
			qaClubId = doc.id;
		}
        if (d.name && d.name.includes('Aggies FC')) {
            targetClubId = doc.id;
        }
	}
	if (!qaClubId) return;

    // Use "aggiesfc" fallback since this ID was hardcoded as an example in surgicalWipe.js for 'Aggies FC'
    if (!targetClubId) targetClubId = 'aggiesfc';

	const qaRef = db.collection('clubs').doc(qaClubId);
	await db.recursiveDelete(qaRef);

	const users = await db.collection('users').where('clubId', '==', qaClubId).get();
	let batch = db.batch();
	let count = 0;
	for (const doc of users.docs) {
		const d = doc.data();
		if (d.role === 'coach' || d.role === 'parent') {
			batch.update(doc.ref, { clubId: targetClubId });
			count++;
		}
	}
	if (count > 0) await batch.commit();
}

runDefrag().then(() => console.log('QA Defrag Complete')).catch(console.error);
