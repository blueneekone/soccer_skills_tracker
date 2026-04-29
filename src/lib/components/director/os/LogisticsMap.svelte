<script>
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { ensureGoogleMapsLoaded, getGoogleMapsApiKey } from '$lib/maps/ensureGoogleMaps.js';

	/**
	 * @typedef {{ lat: number; lng: number }} LatLng
	 */

	let {
		latitude = $bindable(/** @type {number | null} */ (null)),
		longitude = $bindable(/** @type {number | null} */ (null)),
		readonly = false,
	} = $props();

	const apiKey = getGoogleMapsApiKey();

	let mapRoot = $state(/** @type {HTMLDivElement | null} */ (null));
	let loadError = $state(false);

	/**
	 * @param {string} hex
	 */
	function markerSvgDataUrl(hex) {
		const svg =
			`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 24">` +
			`<path fill="${hex}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>` +
			`</svg>`;
		return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
	}

	function brandPrimaryHex() {
		if (!browser) return '#f59e0b';
		const v = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim();
		if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
		return '#f59e0b';
	}

	$effect(() => {
		if (!browser || !mapRoot || !apiKey) return;

		loadError = false;

		const lat0 = untrack(() => latitude);
		const lng0 = untrack(() => longitude);
		const readOnly = untrack(() => readonly);

		let cancelled = false;
		/** @type {any} */
		let map = null;
		/** @type {any} */
		let marker = null;
		/** @type {any} */
		let clickListener = null;

		(async () => {
			try {
				const g = await ensureGoogleMapsLoaded();
				if (cancelled || !mapRoot) return;

				if (!g?.maps) {
					loadError = true;
					return;
				}

				const center =
					lat0 != null && lng0 != null ?
						{ lat: lat0, lng: lng0 }
					:	{ lat: 39.8283, lng: -98.5795 };
				const zoom = lat0 != null && lng0 != null ? 16 : 4;

				map = new g.maps.Map(mapRoot, {
					center,
					zoom,
					mapTypeControl: false,
					streetViewControl: false,
					fullscreenControl: false,
					clickableIcons: false,
				});

				const iconUrl = markerSvgDataUrl(brandPrimaryHex());
				const icon = {
					url: iconUrl,
					scaledSize: new g.maps.Size(32, 40),
					anchor: new g.maps.Point(16, 40),
				};

				if (lat0 != null && lng0 != null) {
					marker = new g.maps.Marker({
						map,
						position: center,
						icon,
					});
				}

				if (!readOnly) {
					clickListener = map.addListener('click', (/** @type {any} */ e) => {
						if (!e.latLng || cancelled) return;
						const lat = e.latLng.lat();
						const lng = e.latLng.lng();
						if (marker) {
							marker.setMap(null);
							marker = null;
						}
						marker = new g.maps.Marker({
							map,
							position: { lat, lng },
							icon,
						});
						latitude = lat;
						longitude = lng;
					});
				}
			} catch (e) {
				console.error('[LogisticsMap]', e);
				loadError = true;
			}
		})();

		return () => {
			cancelled = true;
			if (clickListener && globalThis.google?.maps?.event) {
				globalThis.google.maps.event.removeListener(clickListener);
			}
			if (marker) {
				marker.setMap(null);
				marker = null;
			}
			if (map && globalThis.google?.maps?.event) {
				globalThis.google.maps.event.clearInstanceListeners(map);
			}
			map = null;
		};
	});
</script>

{#if !apiKey}
	<div
		class="logistics-map-empty logistics-map-empty--no-key"
		role="img"
		aria-label="Google Maps API key required"
	>
		<i class="ph ph-lock-key logistics-map-empty__icon" aria-hidden="true"></i>
		<p class="logistics-map-empty__text">
			Google Maps API Key Required. Configure in .env to activate visual routing.
		</p>
	</div>
{:else if loadError}
	<div
		class="logistics-map-empty logistics-map-empty--error"
		role="img"
		aria-label="Google Maps failed to load"
	>
		<i class="ph ph-map-pin logistics-map-empty__icon" aria-hidden="true"></i>
		<p class="logistics-map-empty__text">
			Unable to load Google Maps. Check your API key and billing.
		</p>
	</div>
{:else}
	<div
		bind:this={mapRoot}
		class="logistics-map-root"
		role="application"
		aria-label={readonly ? 'Facility location map' : 'Click to set facility location'}
	></div>
{/if}

<style>
	.logistics-map-root {
		box-sizing: border-box;
		/* Explicit height is critical — Google Maps API silently fails to render
		   tiles inside a 0-height container. Use min-height so parent containers
		   using flex-1 can stretch beyond this floor. */
		min-height: 500px;
		height: 500px;
		width: 100%;
		border-radius: 14px;
		border: 1px solid #e5e5e5;
	}

	:global(html.dark) .logistics-map-root {
		border-color: #404040;
	}

	/* Enterprise empty state — works without Tailwind (e.g. coach tools tab). */
	.logistics-map-empty {
		box-sizing: border-box;
		display: flex;
		min-height: 500px;
		height: 500px;
		width: 100%;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		text-align: center;
		border-radius: 14px;
		border: 1px solid #e4e4e7;
	}

	.logistics-map-empty--no-key {
		background-color: #f4f4f5;
		background-image: repeating-linear-gradient(
			135deg,
			transparent,
			transparent 10px,
			rgba(113, 113, 122, 0.09) 10px,
			rgba(113, 113, 122, 0.09) 11px
		);
	}

	.logistics-map-empty--error {
		background-color: #f4f4f5;
		border-color: #e4e4e7;
	}

	:global(html.dark) .logistics-map-empty {
		border-color: rgba(255, 255, 255, 0.12);
		background-color: #18181b;
	}

	:global(html.dark) .logistics-map-empty--no-key {
		background-color: #18181b;
		background-image: repeating-linear-gradient(
			135deg,
			transparent,
			transparent 10px,
			rgba(255, 255, 255, 0.06) 10px,
			rgba(255, 255, 255, 0.06) 11px
		);
	}

	.logistics-map-empty__icon {
		font-size: 2.25rem;
		line-height: 1;
		color: #d97706;
	}

	:global(html.dark) .logistics-map-empty__icon {
		color: #fbbf24;
	}

	.logistics-map-empty__text {
		margin: 0;
		max-width: 22rem;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.45;
		color: #3f3f46;
	}

	:global(html.dark) .logistics-map-empty__text {
		color: #d4d4d8;
	}

	.logistics-map-empty--error .logistics-map-empty__icon {
		color: #a1a1aa;
	}

	:global(html.dark) .logistics-map-empty--error .logistics-map-empty__icon {
		color: #71717a;
	}
</style>
