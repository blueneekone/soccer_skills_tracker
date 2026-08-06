import admin from 'firebase-admin';

admin.initializeApp({ projectId: 'sports-skill-tracker-dev' });
const db = admin.firestore();

async function run() {
    try {
        console.log("Fixing document ID...");
        const oldRef = db.collection('users').doc('ecwaechtler+coach@gmail.com');
        const newRef = db.collection('users').doc('UOtAAIBf7Cab3mPYdFrFXskG42E2');
        
        const docSnap = await oldRef.get();
        if (docSnap.exists) {
            await newRef.set({
                ...docSnap.data(),
                email: 'ecwaechtler+coach@gmail.com'
            });
            await oldRef.delete();
            console.log("Successfully migrated user doc to match Auth UID.");
        } else {
            console.log("Old doc doesn't exist, checking if new doc does...");
            const newSnap = await newRef.get();
            console.log("New doc exists:", newSnap.exists);
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
run();
