import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const devConfig = {
	apiKey: process.env.VITE_FIREBASE_DEV_API_KEY || 'AIzaSyCiBoemXJHTkTnujTwM1vOJc4FrVZF8Lw8',
	authDomain: 'sports-skill-tracker-dev.firebaseapp.com',
	projectId: 'sports-skill-tracker-dev',
};

const app = initializeApp(devConfig);
const auth = getAuth(app);

async function checkLogin() {
    console.log('Attempting login as coach-test@sstracker.app...');
    try {
        const cred = await signInWithEmailAndPassword(auth, 'coach-test@sstracker.app', 'password123');
        console.log('SUCCESS! uid:', cred.user.uid);
    } catch (err) {
        console.error('FAILED!', err.code, err.message);
    }
    process.exit(0);
}
checkLogin();
