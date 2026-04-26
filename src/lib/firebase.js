import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager,
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const devConfig = {
	apiKey: 'AIzaSyCiBoemXJHTkTnujTwM1vOJc4FrVZF8Lw8',
	authDomain: 'sports-skill-tracker-dev.firebaseapp.com',
	projectId: 'sports-skill-tracker-dev',
	storageBucket: 'sports-skill-tracker-dev.firebasestorage.app',
	messagingSenderId: '4624204181',
	appId: '1:4624204181:web:d6c576088f0eb7d3d0f69c',
	measurementId: 'G-1YX13X6DQ6'
};

const prodConfig = {
	apiKey: 'AIzaSyDNmo6dACOLzOSkC93elMd5yMbFmsUXO1w',
	authDomain: 'soccer.sstracker.app',
	projectId: 'soccer-skills-tracker',
	storageBucket: 'soccer-skills-tracker.firebasestorage.app',
	messagingSenderId: '884044129977',
	appId: '1:884044129977:web:47d54f59c891340e505d68'
};

const useProd = import.meta.env.VITE_USE_PROD === 'true';
const activeConfig = useProd ? prodConfig : devConfig;

export const app = initializeApp(activeConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
	localCache: persistentLocalCache({
		tabManager: persistentMultipleTabManager(),
	}),
});
/** Matches Cloud Functions region in functions/index.js */
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);

export let messaging = null;
isSupported().then((supported) => {
	if (supported) {
		messaging = getMessaging(app);
	}
});
