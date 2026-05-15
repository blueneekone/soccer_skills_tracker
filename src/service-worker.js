/// <reference types="@sveltejs/kit" />
// PWA shell: precache static assets + strict network-first bypass for SvelteKit
// code-split chunks and API routes.
//
// Coexistence: `static/firebase-messaging-sw.js` is registered separately for FCM
// by `src/lib/fcm/client.js`. That registration uses `getToken({ serviceWorkerRegistration })`
// so Firebase SDK binds its push listener to its own registration object — not this SW.
// If FCM push is ever needed in background here, merge `onBackgroundMessage` into this file
// and remove the separate FCM SW registration.
// @ts-expect-error virtual module
import { build, files, version } from '$service-worker';

const CACHE = `pwa-core-${version}-v5`;

/**
 * Sprint 9.1 (Routing & Service Worker Resolution) — DO NOT collapse this list.
 *
 * Auth, WebAuthn, Firebase Identity, API routes, and SvelteKit client modules
 * must bypass the PWA cache entirely. A stale or HTML fallback response breaks
 * challenge retrieval, dynamic `import()`, and client routing.
 *
 * The explicit `/_app/immutable/` entry is intentional and must remain separate
 * from the broader `/_app/` rule. SvelteKit hashed chunks MUST always hit the
 * network so a new deploy never serves stale module hashes from a warm cache,
 * causing the PWA routing-stasis bug (user sees old page after deploy until
 * they force-refresh). Removing or merging this entry re-opens that bug.
 *
 * Returns true → call `event.respondWith(fetch(req))` (strict network pass-through).
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

	// SvelteKit code-split chunks and API routes must always hit the network directly.
	if (
		path.startsWith('/api/') ||
		path.startsWith('/_app/immutable/') ||
		path.startsWith('/_app/') ||
		path.endsWith('__data.json') ||
		path.endsWith('/_app/version.json')
	) {
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
 * @param {Response | undefined} res
 * @returns {boolean}
 */
function isHtmlResponse(res) {
	if (!res) return false;
	const ct = res.headers.get('content-type') || '';
	return ct.includes('text/html');
}

self.addEventListener('install', (event) => {
	// Precache only static files (fonts, icons, offline shell, etc.).
	// SvelteKit `build` chunks are hashed — caching them here causes stale-module
	// bugs after deploys because the SW serves the old hash while the HTML references
	// new ones. Let those hit the network via shouldBypassServiceWorker above.
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

	// Explicit network pass-through: respondWith(fetch) rather than silent return so
	// Chromium's navigation-preload racing cannot accidentally fall back to a cached response.
	if (shouldBypassServiceWorker(url)) {
		event.respondWith(fetch(req));
		return;
	}

	// Page navigations must go through SvelteKit's server — never serve cached HTML.
	if (req.mode === 'navigate') return;
	// JS module requests must never be shimmed with a cached response.
	if (req.destination === 'script') return;
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		caches.open(CACHE).then((cache) =>
			fetch(req)
				.then((res) => {
					if (res.status === 200 && !isHtmlResponse(res)) {
						cache.put(req, res.clone());
					}
					return res;
				})
				.catch(async () => {
					const cached = await cache.match(req);
					// Never fall back to HTML — that would break dynamic imports and routing.
					if (!cached || isHtmlResponse(cached)) {
						return Response.error();
					}
					return cached;
				}),
		),
	);
});
