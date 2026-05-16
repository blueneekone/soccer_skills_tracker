/**
 * src/lib/firebase/config.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Phase 0 — Firebase client configuration & typed singleton initialization.
 *
 * Ported from: legacy/firebase-config.js
 * Architecture: Firebase Modular SDK v10+ (tree-shakeable named imports only)
 *
 * Environment strategy
 * ─────────────────────
 *   VITE_USE_PROD=true  → Production project (soccer-skills-tracker)
 *   Default             → Development project (sports-skill-tracker-dev)
 *
 *   Full VITE_* variable list is documented in .env.example.
 *
 * Security note
 * ─────────────
 *   Firebase web API keys are intentionally public. Access control is enforced
 *   exclusively by Firestore Security Rules and Firebase Custom Claims — not
 *   by key secrecy. See OWASP guidance on client-side Firebase configurations.
 *
 * Offline persistence
 * ───────────────────
 *   Replaces the deprecated `enableIndexedDbPersistence()` from the legacy
 *   firebase-config.js with the modern `persistentLocalCache` + multi-tab
 *   manager. Behaviour is equivalent but supported on Firebase SDK v9.13+.
 */

import { browser } from '$app/environment';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager,
	getFirestore,
	type Firestore,
} from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';
import {
	getRemoteConfig,
	fetchAndActivate,
	type RemoteConfig,
} from 'firebase/remote-config';

// ─────────────────────────────────────────────────────────────────────────────
// Config interface
// ─────────────────────────────────────────────────────────────────────────────

interface FirebaseClientConfig {
	readonly apiKey: string;
	readonly authDomain: string;
	readonly projectId: string;
	readonly storageBucket: string;
	readonly messagingSenderId: string;
	readonly appId: string;
	readonly measurementId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Project configs — dev & prod
// ─────────────────────────────────────────────────────────────────────────────

/** Development project: sports-skill-tracker-dev */
const devConfig: FirebaseClientConfig = {
	apiKey:
		import.meta.env.VITE_FIREBASE_DEV_API_KEY ??
		'AIzaSyCiBoemXJHTkTnujTwM1vOJc4FrVZF8Lw8',
	authDomain:
		import.meta.env.VITE_FIREBASE_DEV_AUTH_DOMAIN ??
		'sports-skill-tracker-dev.firebaseapp.com',
	projectId:
		import.meta.env.VITE_FIREBASE_DEV_PROJECT_ID ?? 'sports-skill-tracker-dev',
	storageBucket:
		import.meta.env.VITE_FIREBASE_DEV_STORAGE_BUCKET ??
		'sports-skill-tracker-dev.firebasestorage.app',
	messagingSenderId:
		import.meta.env.VITE_FIREBASE_DEV_MESSAGING_SENDER_ID ?? '4624204181',
	appId:
		import.meta.env.VITE_FIREBASE_DEV_APP_ID ??
		'1:4624204181:web:d6c576088f0eb7d3d0f69c',
	measurementId:
		import.meta.env.VITE_FIREBASE_DEV_MEASUREMENT_ID ?? 'G-1YX13X6DQ6',
};

/** Production project: soccer-skills-tracker */
const prodConfig: FirebaseClientConfig = {
	apiKey:
		import.meta.env.VITE_FIREBASE_PROD_API_KEY ??
		'AIzaSyDNmo6dACOLzOSkC93elMd5yMbFmsUXO1w',
	authDomain:
		import.meta.env.VITE_FIREBASE_PROD_AUTH_DOMAIN ?? 'soccer.sstracker.app',
	projectId:
		import.meta.env.VITE_FIREBASE_PROD_PROJECT_ID ?? 'soccer-skills-tracker',
	storageBucket:
		import.meta.env.VITE_FIREBASE_PROD_STORAGE_BUCKET ??
		'soccer-skills-tracker.firebasestorage.app',
	messagingSenderId:
		import.meta.env.VITE_FIREBASE_PROD_MESSAGING_SENDER_ID ?? '884044129977',
	appId:
		import.meta.env.VITE_FIREBASE_PROD_APP_ID ??
		'1:884044129977:web:47d54f59c891340e505d68',
};

// ─────────────────────────────────────────────────────────────────────────────
// Active config (driven by VITE_USE_PROD)
// ─────────────────────────────────────────────────────────────────────────────

const useProd = import.meta.env.VITE_USE_PROD === 'true';

/**
 * The resolved Firebase project config for the current environment.
 * Export is read-only — do not mutate at runtime.
 */
export const activeConfig: Readonly<FirebaseClientConfig> = useProd
	? prodConfig
	: devConfig;

// ─────────────────────────────────────────────────────────────────────────────
// Firebase App (Singleton Guard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SvelteKit's dev-server hot-module-replacement reloads module files on every
 * save. `getApps()` prevents `initializeApp` from being called twice,
 * which would throw "Firebase App named '[DEFAULT]' already exists".
 */
export const app: FirebaseApp =
	getApps().length > 0 ? getApps()[0] : initializeApp(activeConfig);

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Authentication
// ─────────────────────────────────────────────────────────────────────────────

export const auth: Auth = getAuth(app);

// ─────────────────────────────────────────────────────────────────────────────
// Firestore — Persistent Multi-Tab Offline Cache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `initializeFirestore` with `persistentLocalCache` is the v9.13+ replacement
 * for the deprecated `enableIndexedDbPersistence()` used in the legacy
 * firebase-config.js. It enables IndexedDB-backed offline support with
 * multi-tab write-through synchronisation.
 *
 * The `try/catch` handles subsequent HMR reloads where the Firestore instance
 * has already been created for this app; `getFirestore` returns the existing
 * instance without error.
 */
export const db: Firestore = (() => {
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

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Functions
// ─────────────────────────────────────────────────────────────────────────────

/** Deployed to us-east1 — must match the region in functions/index.js */
export const functions: Functions = getFunctions(app, 'us-east1');

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Storage
// ─────────────────────────────────────────────────────────────────────────────

export const storage: FirebaseStorage = getStorage(app);

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Cloud Messaging (browser-only, feature-detected)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FCM is not available in SSR or in all browsers (e.g. Safari < 16.4).
 * `isSupported()` returns a Promise<boolean>; the singleton is assigned
 * asynchronously. Always guard usage with `if (messaging)`.
 *
 * Mirrors the safe-init pattern from legacy/firebase-config.js.
 */
export let messaging: Messaging | null = null;

if (browser) {
	isSupported().then((supported) => {
		if (supported) {
			messaging = getMessaging(app);
		}
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Remote Config — Feature Kill Switches
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remote Config allows flipping feature flags in the Firebase Console
 * without a deploy. Safe defaults keep all features ON until told otherwise.
 *
 * Kill switches (set in Firebase Console → Remote Config):
 *   feature_weather_aegis_enabled      — WeatherWidget
 *   feature_xp_gamification_enabled    — XP award logic
 *   feature_dopamine_explosions_enabled — Dopamine engine (confetti / haptics)
 *
 * Returns `null` in SSR or if Remote Config is unavailable.
 */
export const remoteConfig: RemoteConfig | null = (() => {
	if (!browser) return null;
	try {
		const rc = getRemoteConfig(app);
		rc.settings.minimumFetchIntervalMillis = 5 * 60 * 1_000; // 5 minutes

		rc.defaultConfig = {
			feature_weather_aegis_enabled: true,
			feature_xp_gamification_enabled: true,
			feature_dopamine_explosions_enabled: true,
		};

		fetchAndActivate(rc).catch(() => {
			// Network failures keep safe defaults active — no crash
		});

		return rc;
	} catch {
		return null;
	}
})();
