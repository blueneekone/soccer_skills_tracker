import admin from 'firebase-admin';

admin.initializeApp({ projectId: 'sports-skill-tracker-dev' });
const db = admin.firestore();

async function run() {
    try {
        console.log("Checking user profile in Firestore...");
        const usersRef = db.collection('users');
        const snap = await usersRef.get();
        console.log("ALL USERS IN FIRESTORE:");
        snap.forEach(doc => {
            if (doc.id.includes('coach') || doc.data().email?.includes('coach')) {
                console.log(`ID: ${doc.id}, Email: ${doc.data().email}, clubId: ${doc.data().clubId}, role: ${doc.data().role}`);
            }
        });
        
        console.log("\nChecking Firebase Auth Users...");
        const listUsersResult = await admin.auth().listUsers();
        listUsersResult.users.forEach((userRecord) => {
            if (userRecord.email?.includes('coach')) {
                console.log(`Auth UID: ${userRecord.uid}, Email: ${userRecord.email}`);
            }
        });
    } catch(e) {
        console.error("Error:", e);
    }
}
run();
