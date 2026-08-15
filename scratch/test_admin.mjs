import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
    try {
        const token = await admin.auth().createCustomToken('mock-test-uid');
        console.log('Generated token:', token);
    } catch(e) {
        console.error(e);
    }
}
run();
