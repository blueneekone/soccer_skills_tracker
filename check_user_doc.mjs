import admin from 'firebase-admin';

admin.initializeApp({ projectId: 'sports-skill-tracker-dev' });
const db = admin.firestore();

async function run() {
    try {
        const uid = 'UOtAAIBf7Cab3mPYdFrFXskG42E2';
        const docSnap = await db.collection('users').doc(uid).get();
        if (docSnap.exists) {
            console.log("User doc data:", JSON.stringify(docSnap.data(), null, 2));
        } else {
            console.log("User doc does not exist!");
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
run();
