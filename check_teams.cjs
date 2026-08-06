const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'demo-sstracker' });
const db = getFirestore();

async function check() {
	// Find user
	const users = await db.collection('users').where('email', '==', 'ecwaechtler+coach@gmail.com').get();
	if (users.empty) {
		console.log('User not found!');
		return;
	}
	const user = users.docs[0];
	console.log('USER:', user.id, user.data());
	
	// Find club Aggies FC
	const clubs = await db.collection('clubs').get();
	let aggies = null;
	clubs.forEach(c => {
		if (c.data().name && c.data().name.toLowerCase().includes('aggies')) {
			aggies = { id: c.id, ...c.data() };
		}
	});
	
	console.log('AGGIES CLUB:', aggies);
	
	if (aggies) {
		const teams = await db.collection('teams').where('clubId', '==', aggies.id).get();
		teams.forEach(t => {
			console.log('TEAM:', t.id, t.data());
		});
	}
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
