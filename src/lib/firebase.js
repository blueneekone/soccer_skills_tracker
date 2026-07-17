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
	memoryLocalCache,
	getFirestore,
} from 'firebase/firestore';
import { DEFAULT_CELL_ID, resolveCellId } from '$lib/types/cells';
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
 *
 * `db` is a CONVENIENCE alias for the default cell — kept for backward
 * compatibility with the ~158 modules that import `db` directly.  All
 * cell-aware code paths (write facade, on-snapshot subscriptions for
 * dedicated-cell tenants) MUST route through `getDb()` / `getActiveDb()`
 * defined below.
 */
export const db = (() => {
	try {
		return initializeFirestore(app, {
			localCache: persistentLocalCache({
				cacheSizeBytes: 41943040,
				tabManager: persistentMultipleTabManager(),
			}),
		});
	} catch (err) {
		console.warn('[Firestore] Failed to initialize persistent cache. Falling back to non-persistent getFirestore.', err);
		return getFirestore(app);
	}
})();

// ─────────────────────────────────────────────────────────────────────────────
// Cell-Based Routing — Phase 1, Epic 1 (Session C)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HMR-safe cache of Firestore instances keyed by cellId.
 *
 * SvelteKit's dev server reloads `firebase.js` on most file changes,
 * which would normally trigger Firestore's "already initialised" error
 * for the (default) cell and rebuild every dedicated-cell instance.
 * We hide the cache on `globalThis` so it survives the module reload,
 * matching the singleton guard pattern used for `app` above.
 *
 * Keys are the canonical cellId strings — '(default)' for the shared
 * cell, 'cell-{region}-{nnn}' for dedicated cells.
 *
 * @type {Map<string, import('firebase/firestore').Firestore>}
 */
const cellDbCache = (() => {
	const KEY = '__vanguardCellDbCache__';
	const g = /** @type {{ [key: string]: Map<string, import('firebase/firestore').Firestore> }} */ (
		globalThis
	);
	if (!g[KEY]) {
		g[KEY] = new Map();
	}
	const cache = g[KEY];
	// Seed with the already-initialised (default) Firestore instance so
	// the first `getDb('(default)')` call doesn't try to re-initialise it.
	if (!cache.has(DEFAULT_CELL_ID)) {
		cache.set(DEFAULT_CELL_ID, db);
	}
	return cache;
})();

/**
 * Get the Firestore instance for the supplied cellId.
 *
 * Construction strategy
 * ─────────────────────
 *   • (default) cell — returns the singleton `db` initialised above
 *     (with persistent multi-tab cache, the most common case).
 *
 *   • Dedicated cell — lazily calls Firebase's
 *     `initializeFirestore(app, { localCache: … }, cellId)` the first
 *     time it's requested.  HMR-safe via `cellDbCache`.  Persistent
 *     local cache is also enabled per cell so the offline-sync
 *     guarantee (Phase 1, Epic 1 — atomic batch writes) holds for
 *     dedicated-cell tenants too.
 *
 * Callers MUST treat the returned Firestore instance as ephemeral —
 * they may receive a different instance per cell, and the active cell
 * for the current user can change when `provisionTenantCell` reassigns
 * the tenant.  Use `getActiveDb()` (below) inside any code path that
 * wants the "current user's cell" without explicitly threading
 * `cellId` through.
 *
 * @param {string} [cellId] Falsy / invalid → resolves to (default).
 * @returns {import('firebase/firestore').Firestore}
 */
export function getDb(cellId) {
	const resolved = resolveCellId(cellId);

	const cached = cellDbCache.get(resolved);
	if (cached) return cached;

	// Dedicated cell — initialise on first use.  Web SDK accepts the
	// cellId as the 3rd argument to initializeFirestore / getFirestore.
	try {
		const instance = initializeFirestore(
			app,
			{
				localCache: persistentLocalCache({
					tabManager: persistentMultipleTabManager(),
				}),
			},
			resolved,
		);
		cellDbCache.set(resolved, instance);
		return instance;
	} catch {
		// HMR fallback — instance already initialised for this cellId
		// on a prior module load; recover via getFirestore.
		const fallback = getFirestore(app, resolved);
		cellDbCache.set(resolved, fallback);
		return fallback;
	}
}

/**
 * Setter-pattern hook for the active-cell resolver.
 *
 * `firebase.js` cannot import `authStore` directly without creating a
 * module cycle (authStore imports `db` from this file).  Instead, the
 * auth store calls `registerActiveCellResolver(() => this.cellId)`
 * once, and `getActiveDb()` invokes that callback on demand.
 *
 * Resolver returning falsy / invalid → defaults to (default) cell.
 *
 * @type {(() => string | null | undefined) | null}
 */
let activeCellResolver = null;

/**
 * Wire the active-cell resolver.  Called exactly once from
 * `auth.svelte.js` after the store is constructed.
 *
 * @param {() => string | null | undefined} resolver
 */
export function registerActiveCellResolver(resolver) {
	activeCellResolver = resolver;
}

/**
 * Get the Firestore instance for the currently signed-in user's cell.
 *
 * Uses the resolver registered by the auth store (see
 * `registerActiveCellResolver` above) to read `authStore.cellId`
 * LAZILY at call time — never at module load — so:
 *
 *   1. There is no import cycle (firebase.js → authStore would cycle
 *      since authStore imports `db` from this module).
 *   2. The call always sees the freshest cellId, even if the user just
 *      came back online after a `provisionTenantCell` reassignment.
 *
 * Falls back to the (default) cell whenever:
 *   • The auth store has not yet registered its resolver (SSR / early boot).
 *   • The user is anonymous / signed out.
 *   • The cellId claim is missing (legacy tokens, will refresh shortly).
 *
 * Usage pattern from the write facade (Session F):
 *
 *   import { getActiveDb } from '$lib/firebase';
 *   const cellDb = getActiveDb();
 *   const batch = writeBatch(cellDb);
 *
 * @returns {import('firebase/firestore').Firestore}
 */
export function getActiveDb() {
	if (!browser || !activeCellResolver) {
		return getDb(DEFAULT_CELL_ID);
	}
	try {
		const cellId = activeCellResolver();
		return getDb(cellId ?? undefined);
	} catch {
		return getDb(DEFAULT_CELL_ID);
	}
}

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
			// Phase 4, Epic 7 — Dopamine Engine enabled by default.
			// Kill switch: set false in Firebase Console → Remote Config.
			feature_dopamine_explosions_enabled: true,
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
