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

/**
 * Loads Maps JS via `callback=` — runtime logs showed map DOM sized (`map-effect-enter`) but
 * no `bootstrap`: `onload` + polling for `google.maps.Map` never completed on weekly builds.
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
		// Truthy non-function stubs (extensions/tests) must not skip the real loader.
		if (typeof globalThis.google?.maps?.Map === 'function') {
			resolve();
			return;
		}

		/** Strip failed/incomplete loads so the next attempt gets a fresh script+callback. */
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

		// Google calls this when the library has finished initializing (preferred vs onload + polling).
		globalThis[cbName] = () => {
			// #region agent log
			fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
				body: JSON.stringify({
					sessionId: 'dd2828',
					location: 'ensureGoogleMaps.js:callback',
					message: 'Maps API callback invoked',
					data: {
						hypothesisId: 'Z2',
						hasMapCtor: Boolean(globalThis.google?.maps?.Map),
					},
					timestamp: Date.now(),
				}),
			}).catch(() => {});
			// #endregion
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

		/** Documented global for invalid keys / referrer / billing. */
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
		s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=drawing&v=weekly&callback=${cbName}`;
		s.onerror = () => {
			cleanup();
			reject(new Error('Failed to fetch maps.googleapis.com/maps/api/js (blocked network/CSP)'));
		};
		document.head.appendChild(s);
		// #region agent log
		fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
			body: JSON.stringify({
				sessionId: 'dd2828',
				location: 'ensureGoogleMaps.js:script-insert',
				message: 'classic Maps script tag appended',
				data: {
					hypothesisId: 'Z1',
					cbLen: cbName.length,
				},
				timestamp: Date.now(),
			}),
		}).catch(() => {});
		// #endregion
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
