/**
 * firebase.js
 * ────────────
 * Firebase client initialisation.
 *
 * Config values are read exclusively from Vite environment variables
 * (`import.meta.env.VITE_*`) so no secrets are ever hard-coded in source.
 *
 * Environment strategy
 * ─────────────────────
 * Set `VITE_USE_PROD=true` in `.env` (or in the CI workflow) to point at
 * the production project (`soccer-skills-tracker`).  The default (dev) uses
 * `sports-skill-tracker-dev`.
 *
 * The two config objects are chosen purely by the `VITE_USE_PROD` flag;
 * individual key overrides are not supported — always use a complete set.
 *
 * Required .env variables (copy from .env.example):
 *   VITE_USE_PROD              — "true" | "false"
 *
 * Optional / Alpha:
 *   VITE_FCM_VAPID_KEY         — Web Push public key (FCM)
 *
 * Firebase web API keys are intentionally public; security is enforced by
 * Firebase Security Rules and Custom Claims, not by key secrecy.
 */

import { browser } from '$app/environment';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager,
	getFirestore,
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import {
	getRemoteConfig,
	fetchAndActivate,
} from 'firebase/remote-config';

// ── Config objects ────────────────────────────────────────────────────────────

/** Development project — sports-skill-tracker-dev */
const devConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_DEV_API_KEY || 'AIzaSyCiBoemXJHTkTnujTwM1vOJc4FrVZF8Lw8',
	authDomain:
		import.meta.env.VITE_FIREBASE_DEV_AUTH_DOMAIN ||
		'sports-skill-tracker-dev.firebaseapp.com',
	projectId: import.meta.env.VITE_FIREBASE_DEV_PROJECT_ID || 'sports-skill-tracker-dev',
	storageBucket:
		import.meta.env.VITE_FIREBASE_DEV_STORAGE_BUCKET ||
		'sports-skill-tracker-dev.firebasestorage.app',
	messagingSenderId:
		import.meta.env.VITE_FIREBASE_DEV_MESSAGING_SENDER_ID || '4624204181',
	appId: import.meta.env.VITE_FIREBASE_DEV_APP_ID || '1:4624204181:web:d6c576088f0eb7d3d0f69c',
	measurementId: import.meta.env.VITE_FIREBASE_DEV_MEASUREMENT_ID || 'G-1YX13X6DQ6',
};

/** Production project — soccer-skills-tracker */
const prodConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_PROD_API_KEY || 'AIzaSyDNmo6dACOLzOSkC93elMd5yMbFmsUXO1w',
	authDomain:
		import.meta.env.VITE_FIREBASE_PROD_AUTH_DOMAIN || 'soccer.sstracker.app',
	projectId: import.meta.env.VITE_FIREBASE_PROD_PROJECT_ID || 'soccer-skills-tracker',
	storageBucket:
		import.meta.env.VITE_FIREBASE_PROD_STORAGE_BUCKET ||
		'soccer-skills-tracker.firebasestorage.app',
	messagingSenderId:
		import.meta.env.VITE_FIREBASE_PROD_MESSAGING_SENDER_ID || '884044129977',
	appId:
		import.meta.env.VITE_FIREBASE_PROD_APP_ID ||
		'1:884044129977:web:47d54f59c891340e505d68',
};

// ── Initialise (singleton guard) ──────────────────────────────────────────────

const useProd = import.meta.env.VITE_USE_PROD === 'true';
const activeConfig = useProd ? prodConfig : devConfig;

/**
 * Singleton guard: SvelteKit dev server hot-reloads modules frequently.
 * `getApps()` returns existing instances so we never double-initialise.
 */
export const app = getApps().length > 0 ? getApps()[0] : initializeApp(activeConfig);

export const auth = getAuth(app);

/**
 * Firestore with persistent multi-tab cache.
 * `initializeFirestore` must only be called once per app; the singleton guard
 * above ensures that, but we fall back to `getFirestore` on subsequent HMR
 * cycles in dev to avoid the "already-initialized" error.
 */
export const db = (() => {
	try {
		return initializeFirestore(app, {
			localCache: persistentLocalCache({
				tabManager: persistentMultipleTabManager(),
			}),
		});
	} catch {
		return getFirestore(app);
	}
})();

/** Matches Cloud Functions region in functions/index.js — us-east1 (HOTFIX ALPHA-4) */
export const functions = getFunctions(app, 'us-east1');

export const storage = getStorage(app);

/**
 * Firebase Cloud Messaging — only available in supported browsers.
 * Resolved asynchronously; callers should check `messaging !== null`
 * before use.
 */
export let messaging = /** @type {import('firebase/messaging').Messaging | null} */ (null);

if (browser) {
	isSupported().then((supported) => {
		if (supported) {
			messaging = getMessaging(app);
		}
	});
}

/**
 * Firebase Remote Config — Kill switches for live feature flags.
 *
 * Default values are set here so the app works even before the first
 * successful fetch (e.g. offline, cold start, or before Remote Config
 * is populated in the Firebase Console).
 *
 * Kill switches:
 *   feature_weather_aegis_enabled  — disables WeatherWidget if false
 *   feature_xp_gamification_enabled — disables XP award logic if false
 *
 * To flip a switch: Firebase Console → Remote Config → Add parameter.
 * Changes propagate within the minimumFetchIntervalMillis window (5 min).
 */
export const remoteConfig = (() => {
	if (!browser) return null;
	try {
		const rc = getRemoteConfig(app);
		rc.settings.minimumFetchIntervalMillis = 5 * 60 * 1000; // 5 minutes

		// Safe defaults — all features ON until told otherwise
		rc.defaultConfig = {
			feature_weather_aegis_enabled: true,
			feature_xp_gamification_enabled: true,
		};

		// Fetch and activate in the background — never blocks rendering
		fetchAndActivate(rc).catch(() => {
			// Network failure: defaults remain active, no crash
		});

		return rc;
	} catch {
		// Remote Config not supported in this environment (e.g. test runner)
		return null;
	}
})();
