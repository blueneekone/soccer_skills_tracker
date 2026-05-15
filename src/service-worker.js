/// <reference types="@sveltejs/kit" />
// PWA shell: precache + network-first with cache fallback.
// Note: `static/firebase-messaging-sw.js` is a separate registration for FCM; only one SW can
// control `/` at a time — if both are used, merge FCM `onBackgroundMessage` into this file or
// coordinate registration in `src/lib/fcm/client.js`.
// Virtual module — prerendered static asset paths + client build output (immutable chunks).
// @ts-expect-error virtual module
import { build, files, version } from '$service-worker';

const CACHE = `pwa-core-${version}`;

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

self.addEventListener('install', (event) => {
	const precache = build.concat(files);
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
	const url = new URL(event.request.url);
	if (shouldBypassServiceWorker(url)) return;
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		caches.open(CACHE).then((cache) =>
			fetch(event.request)
				.then((res) => {
					if (res.status === 200) {
						cache.put(event.request, res.clone());
					}
					return res;
				})
				.catch(() => cache.match(event.request).then((r) => r || cache.match('/'))),
		),
	);
});
