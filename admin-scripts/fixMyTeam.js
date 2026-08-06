import admin from 'firebase-admin';

async function run() {
	if (!admin.apps.length) admin.initializeApp({ projectId: 'sports-skill-tracker-dev' });
	const db = admin.firestore();
	
	const teams = await db.collection('teams').get();
	for (const doc of teams.docs) {
		const d = doc.data();
		const name = d.name || d.teamName || '';
		if (name.includes('16G')) {
			console.log('FOUND TEAM:', doc.id, name, 'Club:', d.clubId, 'Coach:', d.coachEmail);
		}
	}
}

run().then(() => console.log('Done')).catch(console.error);
