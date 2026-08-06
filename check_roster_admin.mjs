import admin from 'firebase-admin';

admin.initializeApp({ projectId: 'sports-skill-tracker-dev' });
const db = admin.firestore();

async function run() {
    try {
        console.log("Fetching players for team aggiesfc_u16gew...");
        const rosterSnap = await db.collection('teams').doc('aggiesfc_u16gew').collection('roster').get();
        console.log("Roster size:", rosterSnap.size);
        rosterSnap.forEach(doc => console.log("Player:", doc.id, doc.data().name, doc.data().userId));
        
        // Let's also check if they are top-level users/players linked to team
        const playersSnap = await db.collection('users').where('clubId', '==', 'aggiesfc').where('role', '==', 'player').get();
        console.log("Global players in aggiesfc:", playersSnap.size);
    } catch(e) {
        console.error("Error:", e);
    }
}
run();
