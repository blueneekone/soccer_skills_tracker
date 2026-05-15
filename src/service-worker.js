/// <reference types="@sveltejs/kit" />
// PWA shell: precache + network-first with cache fallback.
// Note: `static/firebase-messaging-sw.js` is a separate registration for FCM; only one SW can
// control `/` at a time — if both are used, merge FCM `onBackgroundMessage` into this file or
// coordinate registration in `src/lib/fcm/client.js`.
// Virtual module — prerendered static asset paths + client build output (immutable chunks).
// @ts-expect-error virtual module
import { build, files, version } from '$service-worker';

const CACHE = `pwa-core-${version}-v3`;

/**
 * Auth, WebAuthn, and Firebase Identity traffic must not go through the PWA
 * cache / offline shell — a stale or HTML fallback response breaks challenge
 * retrieval and can crash WebAuthn clients.
 *
 * Returning without `respondWith()` lets the browser handle the request on the
 * real network.
 *
 * @param {URL} url
 * @returns {boolean}
 */
function shouldBypassServiceWorker(url) {
	const path = url.pathname.toLowerCase();
	const host = url.hostname.toLowerCase();

	if (path.startsWith('/auth/') || path.includes('passkey')) {
		return true;
	}

	// API routes must always hit the network directly.
	if (path.startsWith('/api/')) {
		return true;
	}

	// Firebase Auth / Identity Platform (REST)
	if (
		host === 'identitytoolkit.googleapis.com' ||
		host === 'securetoken.googleapis.com'
	) {
		return true;
	}

	// Auth iframe / handler assets on Firebase Hosting or custom authDomain
	if (path.includes('/__/auth/') || path.includes('/__/firebase/')) {
		return true;
	}

	return false;
}

/**
 * SvelteKit client modules and data fetches must not be satisfied from the SW
 * cache with an HTML shell fallback — that breaks dynamic `import()` and client
 * routing until a full reload.
 *
 * Explicitly enumerates immutable chunks, the version manifest, and __data.json
 * so none of these can accidentally receive a cached HTML fallback.
 *
 * @param {URL} url
 * @returns {boolean}
 */
function isSvelteKitClientFetch(url) {
	const p = url.pathname;
	return (
		p.startsWith('/_app/immutable/') ||
		p.startsWith('/_app/') ||
		p.endsWith('__data.json') ||
		p.endsWith('/_app/version.json')
	);
}

self.addEventListener('install', (event) => {
	// Precache only static files (fonts, icons, offline shell, etc.).
	// SvelteKit `build` chunks are hashed and versioned — caching them here
	// causes stale-module bugs after deploys because the SW serves the old
	// hash while the HTML references new ones. Let those hit the network.
	const precache = files;
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(precache))
			.then(() => self.skipWaiting())
			.catch((err) => {
				console.error('[sw] precache', err);
			}),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE) {
					await caches.delete(key);
				}
			}
			await self.clients.claim();
		}),
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const req = event.request;
	const url = new URL(req.url);

	if (shouldBypassServiceWorker(url)) return;
	if (isSvelteKitClientFetch(url)) return;
	// Page navigations must go through SvelteKit's server — never serve cached HTML.
	if (req.mode === 'navigate') return;
	// JS module requests must never be shimmed with a cached response.
	if (req.destination === 'script') return;
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		caches.open(CACHE).then((cache) =>
			fetch(req)
				.then((res) => {
					if (res.status === 200) {
						cache.put(req, res.clone());
					}
					return res;
				})
				// Never fall back to '/' — that would serve HTML for a non-navigation request.
				.catch(() => cache.match(req)),
		),
	);
});
