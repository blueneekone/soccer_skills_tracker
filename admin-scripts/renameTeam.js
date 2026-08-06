import admin from 'firebase-admin';

async function run() {
	if (!admin.apps.length) admin.initializeApp({ projectId: 'sports-skill-tracker-dev' });
	const db = admin.firestore();
	
	const teamRef = db.collection('teams').doc('aggiesfc_u16gew');
	await teamRef.update({
		name: 'Aggies FC 16G Grey',
		teamName: 'Aggies FC 16G Grey'
	});
	
	console.log('Renamed team to Aggies FC 16G Grey');
}

run().then(() => console.log('Done')).catch(console.error);
