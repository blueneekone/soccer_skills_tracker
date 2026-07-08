import { browser } from '$app/environment';

/** @type {Promise<typeof globalThis.google> | null} */
let loadPromise = null;

/** @type {(() => void) | null} */
let pendingAuthCleanup = null;

export function getGoogleMapsApiKey() {
	const a =
		typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'string' ?
			import.meta.env.VITE_GOOGLE_MAPS_API_KEY.trim()
		:	'';
	const b =
		typeof import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY === 'string' ?
			import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY.trim()
		:	'';
	return a || b || '';
}

/** Required for {@link https://developers.google.com/maps/documentation/javascript/advanced-markers/overview Advanced markers} (replaces deprecated Marker). Create under Google Cloud → Map Management → Map IDs. */
export function getGoogleMapsMapId() {
	const a =
		typeof import.meta.env.VITE_GOOGLE_MAPS_MAP_ID === 'string' ?
			import.meta.env.VITE_GOOGLE_MAPS_MAP_ID.trim()
		:	'';
	const b =
		typeof import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_MAP_ID === 'string' ?
			import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_MAP_ID.trim()
		:	'';
	return a || b || '';
}

/**
 * Loads Maps JS via `callback=` — avoids polling races from npm loaders.
 * Loads core JS only (no deprecated `libraries=drawing`; polygon UX uses google.maps.Polygon + clicks).
 *
 * @see https://developers.google.com/maps/documentation/javascript/overview#Loading_the_Maps_JavaScript_API
 * @param {string} apiKey
 */
function loadMapsScriptClassic(apiKey) {
	return new Promise((resolve, reject) => {
		if (!browser || typeof document === 'undefined') {
			reject(new Error('Google Maps is browser-only'));
			return;
		}
		if (typeof globalThis.google?.maps?.Map === 'function') {
			resolve();
			return;
		}

		document.querySelectorAll('script[data-sst-google-maps="1"]').forEach((el) => el.remove());

		const cbName = `__sstGmReady_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

		const failTimer = globalThis.setTimeout(() => {
			cleanup();
			reject(new Error('Google Maps script timed out (network, ad blocker, or CSP blocking maps.googleapis.com)'));
		}, 25000);

		function cleanup() {
			globalThis.clearTimeout(failTimer);
			try {
				Reflect.deleteProperty(globalThis, cbName);
			} catch {
				/* ignore */
			}
			if (pendingAuthCleanup) {
				pendingAuthCleanup();
				pendingAuthCleanup = null;
			}
		}

		globalThis[cbName] = () => {
			try {
				cleanup();
				if (!globalThis.google?.maps?.Map) {
					reject(new Error('Maps callback ran but google.maps.Map is missing'));
					return;
				}
				resolve();
			} catch (e) {
				reject(e instanceof Error ? e : new Error(String(e)));
			}
		};

		const prevGmFail = globalThis.gm_authFailure;
		pendingAuthCleanup = () => {
			if (globalThis.gm_authFailure === gmFail) {
				globalThis.gm_authFailure = prevGmFail;
			}
		};
		function gmFail() {
			cleanup();
			reject(
				new Error(
					'Google Maps API key rejected (gm_authFailure). Enable Maps JavaScript API, billing, and HTTP referrer restrictions for this origin.',
				),
			);
		}
		globalThis.gm_authFailure = gmFail;

		const s = document.createElement('script');
		s.setAttribute('data-sst-google-maps', '1');
		s.async = true;
		s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async&v=weekly&callback=${cbName}`;
		s.onerror = () => {
			cleanup();
			reject(new Error('Failed to fetch maps.googleapis.com/maps/api/js (blocked network/CSP)'));
		};
		document.head.appendChild(s);
	});
}

/**
 * Loads Maps JS once app-wide.
 */
export async function ensureGoogleMapsLoaded() {
	if (!browser) {
		throw new Error('Google Maps is browser-only');
	}
	const key = getGoogleMapsApiKey();
	if (!key) {
		throw new Error('Missing Google Maps API key');
	}

	if (!loadPromise) {
		loadPromise = (async () => {
			try {
				await loadMapsScriptClassic(key);
				const g = globalThis.google;
				if (typeof g?.maps?.Map !== 'function') {
					throw new Error('Google Maps failed to initialize');
				}
				return g;
			} catch (err) {
				loadPromise = null;
				try {
					document.querySelectorAll('script[data-sst-google-maps="1"]').forEach((el) => el.remove());
				} catch {
					/* ignore */
				}
				throw err;
			}
		})();
	}

	try {
		const g = await loadPromise;
		if (typeof g?.maps?.Map !== 'function') {
			throw new Error('Google Maps unavailable');
		}
		return g;
	} catch (e) {
		loadPromise = null;
		throw e;
	}
}
