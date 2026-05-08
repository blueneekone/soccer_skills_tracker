/**
 * VANGUARD Service Worker — src/sw.js
 * ─────────────────────────────────────
 * Compiled and injected by vite-plugin-pwa (injectManifest strategy).
 * Workbox precaches the app-shell; runtime strategies handle dynamic
 * assets and API requests.
 *
 * Coexistence note
 * ────────────────
 * Firebase Messaging uses firebase-messaging-sw.js at the root scope.
 * This SW is registered at the same scope but is a separate file — both
 * can run simultaneously because the browser allows multiple script
 * registrations at the same scope (last-write-wins for fetch events, but
 * Firebase Messaging only intercepts `push` events, not `fetch`).
 *
 * Caching strategy
 * ────────────────
 * 1. Precache  — All app-shell assets (JS, CSS, HTML, fonts, icons) are
 *                stored at install time via Workbox's precache list.
 * 2. Cache-first — Static images (SVG, PNG) from the /static path.
 * 3. Network-first — Firebase SDK requests (firestore, auth, functions)
 *                    are always network-first so stale tokens never block auth.
 * 4. StaleWhileRevalidate — Google Fonts and CDN icon fonts.
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ── Precache the app shell ────────────────────────────────────────────────────
// The `self.__WB_MANIFEST` placeholder is replaced by Workbox at build time
// with the list of hashed assets from the Vite bundle.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Runtime: static images (cache-first, 7-day TTL) ─────────────────────────
registerRoute(
	({ request }) => request.destination === 'image',
	new CacheFirst({
		cacheName: 'vanguard-images-v1',
		plugins: [
			new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 7 * 24 * 60 * 60 }),
			new CacheableResponsePlugin({ statuses: [0, 200] }),
		],
	}),
);

// ── Runtime: Google Fonts / CDN icon scripts (stale-while-revalidate) ────────
registerRoute(
	({ url }) =>
		url.hostname === 'fonts.googleapis.com' ||
		url.hostname === 'fonts.gstatic.com' ||
		url.hostname === 'unpkg.com',
	new StaleWhileRevalidate({
		cacheName: 'vanguard-cdn-v1',
		plugins: [
			new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 }),
			new CacheableResponsePlugin({ statuses: [0, 200] }),
		],
	}),
);

// ── Runtime: Firebase SDK / API (network-first, no cache) ────────────────────
// These must never be served stale — auth tokens, Firestore queries,
// and Cloud Function calls are always network-first.
registerRoute(
	({ url }) =>
		url.hostname.includes('firebaseapp.com') ||
		url.hostname.includes('googleapis.com') ||
		url.hostname.includes('firebase.com') ||
		url.hostname.includes('cloudfunctions.net'),
	new NetworkFirst({
		cacheName: 'vanguard-firebase-v1',
		networkTimeoutSeconds: 10,
		plugins: [
			new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 }),
			new CacheableResponsePlugin({ statuses: [0, 200] }),
		],
	}),
);

// ── Offline fallback ─────────────────────────────────────────────────────────
// When a navigation request fails (no network, SW has no cached version),
// serve the precached root index.html so the app can show its own offline
// state rather than a bare browser error page.
self.addEventListener('fetch', (event) => {
	if (event.request.mode === 'navigate') {
		event.respondWith(
			fetch(event.request).catch(() => caches.match('/').then((r) => r ?? Response.error())),
		);
	}
});
