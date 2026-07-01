/// <reference types="@sveltejs/kit" />
/**
 * src/service-worker.ts — VANGUARD PWA Service Worker
 * ─────────────────────────────────────────────────────────────────────────────
 * Sprint 1.2: Canonical, hash-versioned SvelteKit-native service worker.
 *
 * This file is the ONLY service worker for the SSTracker PWA shell.
 * SvelteKit auto-registers it at scope '/' as '/service-worker.js'.
 *
 * Coexistence
 * ───────────
 * Firebase Cloud Messaging continues to use static/firebase-messaging-sw.js,
 * registered explicitly in src/lib/fcm/client.js. That registration targets
 * a different filename and handles only 'push' events — no fetch interception.
 *
 * Hash-versioned caching
 * ──────────────────────
 * SvelteKit's `build` virtual module exports the list of all compiled
 * asset URLs (JS, CSS) whose paths already contain a Vite-generated
 * cryptographic content hash, e.g. /_app/immutable/entry.B1c2d3e4.js.
 * The `version` token is bumped on every production build, so the cache
 * key `sst-pwa-{version}` changes with every deploy.  The activate handler
 * deletes ALL caches whose key != CACHE_NAME, ensuring stale hashed chunks
 * are evicted atomically rather than serving mixed-deploy content.
 *
 * Caching strategies
 * ──────────────────
 * 1. BYPASS (explicit fetch pass-through)
 *      Auth routes, WebAuthn, Firebase Identity REST APIs, SvelteKit API
 *      routes, __data.json, and /_app/ dynamic chunks.  These must NEVER
 *      be served from cache.  We call event.respondWith(fetch(req)) rather
 *      than returning silently to prevent Chromium navigation-preload from
 *      accidentally racing to a cached response.
 *
 * 2. NAVIGATION — network-only pass-through
 *      SvelteKit owns HTML rendering server-side.  We never cache HTML.
 *
 * 3. CACHE-FIRST (hashed precache)
 *      Only URLs in the PRECACHE set (= `build` + `files`).  Because the
 *      URL itself contains the content hash, a cache hit is always
 *      bit-for-bit identical to the origin — safe to serve offline.
 *
 * 4. NETWORK-FIRST (Firebase SDK / Firestore / Functions)
 *      Dynamic data must always attempt the network.  Falls back to cache
 *      with a short TTL so coaches can keep the app alive briefly offline
 *      (e.g. sideline, poor signal).  Returns Response.error() — never
 *      a stale HTML fallback — on complete failure.
 *
 * 5. STALE-WHILE-REVALIDATE (CDN fonts / icons)
 *      Google Fonts and unpkg CDN assets: serve from cache immediately,
 *      revalidate in the background.
 */

import { build, files, version } from '$service-worker';

// ── Cache identity ────────────────────────────────────────────────────────────

/**
 * Unique cache bucket for this deploy.  `version` is a hash/timestamp
 * injected by SvelteKit at build time — it changes on every build so stale
 * caches from previous deploys are always wiped on activation.
 */
const CACHE_NAME = `sst-pwa-${version}`;

/**
 * The complete set of assets to precache at install time.
 *   build = Vite-compiled JS/CSS chunks (hash-named, safe to cache forever)
 *   files = static/* assets (icons, manifest, etc.)
 */
const PRECACHE: string[] = [...build, ...files];

/** Lookup set for O(1) membership checks in the fetch handler. */
const PRECACHE_SET = new Set(PRECACHE);

// ── Bypass predicate ──────────────────────────────────────────────────────────

/**
 * Sprint 9.1 (Routing & Service Worker Resolution) — DO NOT collapse this list.
 *
 * Auth, WebAuthn, Firebase Identity, API routes, and SvelteKit client modules
 * must bypass the PWA cache entirely.  A stale or HTML fallback response breaks
 * challenge retrieval, dynamic `import()`, and client routing.
 *
 * The explicit `/_app/immutable/` entry is intentional and must remain separate
 * from the broader `/_app/` rule.  SvelteKit hashed chunks MUST always hit the
 * network so a new deploy never serves stale module hashes from a warm cache,
 * causing the PWA routing-stasis bug (user sees old page after deploy until
 * they force-refresh).  Removing or merging this entry re-opens that bug.
 *
 * Returns true → call `event.respondWith(fetch(req))` (strict network pass-through).
 */
function shouldBypass(url: URL): boolean {
	const path = url.pathname.toLowerCase();
	const host = url.hostname.toLowerCase();

	if (path.startsWith('/auth/') || path.includes('passkey')) {
		return true;
	}

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

/** True for Firebase SDK / Firestore / Functions endpoints (network-first). */
function isFirebaseEndpoint(url: URL): boolean {
	const host = url.hostname.toLowerCase();
	return (
		host.includes('firebaseapp.com') ||
		host.includes('googleapis.com') ||
		host.includes('firebase.com') ||
		host.includes('cloudfunctions.net') ||
		host.includes('firestore.googleapis.com')
	);
}

/** True for CDN font/icon hosts (stale-while-revalidate). */
function isCdnFont(url: URL): boolean {
	const host = url.hostname.toLowerCase();
	return (
		host === 'fonts.googleapis.com' ||
		host === 'fonts.gstatic.com' ||
		host === 'unpkg.com'
	);
}

// ── Install: precache hashed app-shell assets ────────────────────────────────

self.addEventListener('install', (event: ExtendableEvent) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => (self as unknown as ServiceWorkerGlobalScope).skipWaiting()),
	);
});

// ── Activate: evict all caches from previous deploys ─────────────────────────

self.addEventListener('activate', (event: ExtendableEvent) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE_NAME) {
					await caches.delete(key);
				}
			}
			await (self as unknown as ServiceWorkerGlobalScope).clients.claim();
		}),
	);
});

// ── Fetch: tiered caching strategies ─────────────────────────────────────────

self.addEventListener('fetch', (event: FetchEvent) => {
	if (event.request.method !== 'GET') return;

	const req = event.request;
	const url = new URL(req.url);

	// Strategy 1: explicit bypass — hard network pass-through.
	if (shouldBypass(url)) {
		return;
	}

	// Strategy 2: navigation requests — SvelteKit owns HTML; never cache.
	if (req.mode === 'navigate') return;

	// Never shim JS module requests with a cached response.
	if (req.destination === 'script') return;

	// Ignore cross-origin requests that are not Firebase/CDN.
	if (url.origin !== self.location.origin && !isFirebaseEndpoint(url) && !isCdnFont(url)) {
		return;
	}

	// Strategy 3: cache-first for hashed precache assets.
	if (PRECACHE_SET.has(url.pathname)) {
		event.respondWith(
			caches.open(CACHE_NAME).then(async (cache) => {
				const cached = await cache.match(req);
				if (cached) return cached;
				const fresh = await fetch(req);
				if (fresh.status === 200) {
					cache.put(req, fresh.clone());
				}
				return fresh;
			}),
		);
		return;
	}

	// Strategy 4: network-first for Firebase SDK / Firestore / Functions.
	if (isFirebaseEndpoint(url)) {
		event.respondWith(
			caches.open(CACHE_NAME).then(async (cache) => {
				try {
					const res = await fetch(req);
					if (res.status === 200) {
						cache.put(req, res.clone());
					}
					return res;
				} catch {
					const cached = await cache.match(req);
					return cached ?? Response.error();
				}
			}),
		);
		return;
	}

	// Strategy 5: stale-while-revalidate for CDN fonts / icon scripts.
	if (isCdnFont(url)) {
		event.respondWith(
			caches.open(CACHE_NAME).then(async (cache) => {
				const cached = await cache.match(req);
				const networkFetch = fetch(req).then((res) => {
					if (res.status === 200) {
						cache.put(req, res.clone());
					}
					return res;
				});
				return cached ?? networkFetch;
			}),
		);
		return;
	}

	// Default: network-first with cache fallback for same-origin assets
	// not in the precache set (e.g. dynamically generated files).
	event.respondWith(
		caches.open(CACHE_NAME).then(async (cache) => {
			try {
				const res = await fetch(req);
				if (res.status === 200 && !res.headers.get('content-type')?.includes('text/html')) {
					cache.put(req, res.clone());
				}
				return res;
			} catch {
				const cached = await cache.match(req);
				if (!cached || cached.headers.get('content-type')?.includes('text/html')) {
					return Response.error();
				}
				return cached;
			}
		}),
	);
});

// ── AEGIS Lightning Alert: background push via postMessage ───────────────────
// WeatherAegis calls `navigator.serviceWorker.controller.postMessage()`
// with type AEGIS_LIGHTNING_ALERT when a DANGER transition occurs.

self.addEventListener('message', (event: ExtendableMessageEvent) => {
	if (!event.data || event.data.type !== 'AEGIS_LIGHTNING_ALERT') return;

	const { title, body, tag } = event.data as { title?: string; body?: string; tag?: string };

	const showNotification = (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(
		title ?? 'LIGHTNING ALERT',
		{
			body: body ?? 'CRITICAL: LIGHTNING DETECTED — CLEAR THE PITCH.',
			icon: '/icons/icon-192.png',
			badge: '/icons/icon-72.png',
			tag: tag ?? 'aegis-lightning',
			requireInteraction: true,
			vibrate: [200, 100, 200, 100, 200],
			actions: [{ action: 'acknowledge', title: 'Acknowledged' }],
		},
	);

	event.waitUntil(showNotification);
});

// Notification click — bring the coach portal to the foreground.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
	event.notification.close();
	if (event.action === 'acknowledge') return;

	event.waitUntil(
		(self as unknown as ServiceWorkerGlobalScope).clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clients) => {
				const focused = clients.find((c) => c.focused);
				if (focused) return focused.focus();
				const any = clients.find((c) => 'focus' in c);
				if (any) return any.focus();
				return (self as unknown as ServiceWorkerGlobalScope).clients.openWindow('/coach');
			}),
	);
});
