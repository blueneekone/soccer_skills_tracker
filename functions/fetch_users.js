const admin = require('firebase-admin');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
admin.initializeApp({ projectId: 'demo-sstracker' });

async function run() {
	const db = new Proxy({}, { get: (t, p) => { const fs = admin.firestore(); const v = fs[p]; return typeof v === 'function' ? v.bind(fs) : v; } });
	console.log('--- USERS ---');
	const users = await db.collection('users').get();
	users.forEach(doc => {
		console.log(doc.id, '->', doc.data().email, '| Role:', doc.data().role, '| Team:', doc.data().teamId);
	});
	
	console.log('--- TEAMS ---');
	const teams = await db.collection('teams').get();
	teams.forEach(doc => {
		console.log(doc.id, '->', doc.data().name, '| Club:', doc.data().clubId);
	});

    // Assign eva.r.coach@nexus.command to a team if it exists
    const userSnap = await db.collection('users').where('role', '==', 'coach').get();
    if (!userSnap.empty) {
        userSnap.forEach(u => {
            console.log('Found coach:', u.data().email);
        })
    }
	process.exit(0);
}
run();
