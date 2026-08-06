import admin from 'firebase-admin';

admin.initializeApp({ projectId: 'sports-skill-tracker-dev' });
const db = admin.firestore();

async function run() {
    try {
        console.log("Restoring document ID to emailKey...");
        const newRef = db.collection('users').doc('ecwaechtler+coach@gmail.com');
        const oldRef = db.collection('users').doc('UOtAAIBf7Cab3mPYdFrFXskG42E2');
        
        const docSnap = await oldRef.get();
        if (docSnap.exists) {
            await newRef.set(docSnap.data());
            await oldRef.delete();
            console.log("Successfully restored user doc to emailKey.");
        } else {
            console.log("Doc under UID doesn't exist either?!");
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
run();
