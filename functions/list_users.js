const admin = require('firebase-admin');
const { resolve } = require('node:path');
const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
let credential;
try {
  credential = admin.credential.cert(require(keyPath));
} catch(e) {
  // emulator
}
admin.initializeApp({
  projectId: 'sstracker-dev'
});

async function run() {
	const db = admin.firestore();
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
	process.exit(0);
}
run();
