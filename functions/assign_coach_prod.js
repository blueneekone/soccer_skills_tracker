const admin = require('firebase-admin');
const { resolve } = require('node:path');
const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
let credential;
try {
  credential = admin.credential.cert(require(keyPath));
} catch(e) {
  console.log("No service account key found:", e.message);
  process.exit(1);
}
admin.initializeApp({
  credential,
  projectId: 'sports-skill-tracker-dev'
});

async function run() {
	const db = new Proxy({}, { get: (t, p) => { const fs = admin.firestore(); const v = fs[p]; return typeof v === 'function' ? v.bind(fs) : v; } });
	console.log('Fetching users and teams to assign coach...');

    const userSnap = await db.collection('users').where('role', '==', 'coach').get();
    if (userSnap.empty) {
        console.log('No coach users found.');
        process.exit(1);
    }
    
    let targetUser = null;
    userSnap.forEach(u => {
        console.log('Found coach:', u.data().email);
        // We assume the user we want to assign is one of them. Let's just assign all coaches to aggiesfc_u11_16gew for now, or just the first one.
        targetUser = { id: u.id, email: u.data().email };
    });

    if (targetUser) {
        const teamId = 'aggiesfc_u11_16gew';
        console.log(`Assigning ${targetUser.email} to team ${teamId}...`);
        
        await db.collection('teams').doc(teamId).set({
            coachEmails: admin.firestore.FieldValue.arrayUnion(targetUser.email)
        }, { merge: true });
        
        console.log('Successfully assigned!');
    }
	process.exit(0);
}
run();
