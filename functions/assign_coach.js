const admin = require('firebase-admin');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
admin.initializeApp({ projectId: 'demo-sstracker' });

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
