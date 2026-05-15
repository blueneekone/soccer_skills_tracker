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
 * 1. NetworkOnly  — SvelteKit code-split chunks (/_app/*), API routes (/api/*),
 *                   and __data.json endpoints are ALWAYS network-only. Stale
 *                   cached chunks cause module-hash mismatches after deploys.
 * 2. Precache     — All other app-shell assets (CSS, fonts, icons) are stored
 *                   at install time via Workbox's precache list.
 * 3. Cache-first  — Static images (SVG, PNG) from the /static path.
 * 4. Network-first — Firebase SDK requests (firestore, auth, functions)
 *                    are always network-first so stale tokens never block auth.
 * 5. StaleWhileRevalidate — Google Fonts and CDN icon fonts.
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ── CRITICAL: bypass cache for SvelteKit code-split chunks and API routes ─────
// Register these routes BEFORE precacheAndRoute so Workbox router matches them
// first. Serving stale hashed JS chunks breaks dynamic import() after deploys.
registerRoute(
	({ url }) =>
		url.pathname.startsWith('/_app/') ||
		url.pathname.startsWith('/api/') ||
		url.pathname.endsWith('__data.json') ||
		url.pathname.endsWith('/_app/version.json'),
	new NetworkOnly(),
);

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

// ── Navigate: network-first with offline fallback ───────────────────────────
// When a navigation request fails (no network, SW has no cached version),
// serve the precached root index.html so the app can show its own offline
// state rather than a bare browser error page.
self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET' || req.mode !== 'navigate') return;

	event.respondWith(
		fetch(req).catch(async () => {
			const cached = await caches.match('/');
			return cached ?? Response.error();
		}),
	);
});

// ── AEGIS Lightning Alert: background push via postMessage ───────────────────
// The WeatherAegis service calls `navigator.serviceWorker.controller.postMessage()`
// with type AEGIS_LIGHTNING_ALERT when a DANGER transition occurs.
// The SW shows a persistent notification even when the page is minimised.
self.addEventListener('message', (event) => {
	if (!event.data || event.data.type !== 'AEGIS_LIGHTNING_ALERT') return;

	const { title, body, tag } = event.data;
	const showNotification = self.registration.showNotification(title ?? 'LIGHTNING ALERT', {
		body: body ?? 'CRITICAL: LIGHTNING DETECTED — CLEAR THE PITCH.',
		icon: '/icons/icon-192.png',
		badge: '/icons/icon-72.png',
		tag: tag ?? 'aegis-lightning',
		requireInteraction: true,
		vibrate: [200, 100, 200, 100, 200],
		actions: [
			{ action: 'acknowledge', title: 'Acknowledged' },
		],
	});

	event.waitUntil(showNotification);
});

// Notification click — bring the coach portal to the foreground.
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	if (event.action === 'acknowledge') return;

	event.waitUntil(
		self.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clients) => {
				const focused = clients.find((c) => c.focused);
				if (focused) return focused.focus();
				const any = clients.find((c) => 'focus' in c);
				if (any) return any.focus();
				return self.clients.openWindow('/coach');
			}),
	);
});
