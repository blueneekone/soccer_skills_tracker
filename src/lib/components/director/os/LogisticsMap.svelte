<script>
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { createAdvancedPinMarker } from '$lib/maps/advancedMarkers.js';
	import { ensureGoogleMapsLoaded, getGoogleMapsApiKey, getGoogleMapsMapId } from '$lib/maps/ensureGoogleMaps.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	/**
	 * @typedef {{ lat: number; lng: number }} LatLng
	 */

	let {
		latitude = $bindable(/** @type {number | null} */ (null)),
		longitude = $bindable(/** @type {number | null} */ (null)),
		readonly = false,
	} = $props();

	const apiKey = getGoogleMapsApiKey();
	const mapsMapId = getGoogleMapsMapId();

	let mapRoot = $state(/** @type {HTMLDivElement | null} */ (null));
	let loadError = $state(false);

	$effect(() => {
		if (!browser || !mapRoot || !apiKey || !mapsMapId) return;

		loadError = false;

		const lat0 = untrack(() => latitude);
		const lng0 = untrack(() => longitude);
		const readOnly = untrack(() => readonly);

		let cancelled = false;
		let map = /** @type {any} */ (null);
		let marker = /** @type {any} */ (null);
		let clickListener = /** @type {any} */ (null);

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
					mapId: mapsMapId,
					center,
					zoom,
					mapTypeControl: false,
					streetViewControl: false,
					fullscreenControl: false,
					clickableIcons: false,
				});

				if (lat0 != null && lng0 != null) {
					marker = await createAdvancedPinMarker(g, map, center, {
						title: 'Facility location',
						background: '#f59e0b',
						zIndex: 10,
					});
				}

				if (!readOnly) {
					clickListener = map.addListener('click', (/** @type {any} */ e) => {
						if (!e.latLng || cancelled) return;
						const lat = e.latLng.lat();
						const lng = e.latLng.lng();
						void (async () => {
							try {
								if (marker) {
									try {
										marker.map = null;
									} catch {
										/* ignore */
									}
									marker = null;
								}
								marker = await createAdvancedPinMarker(g, map, { lat, lng }, {
									title: 'Facility location',
									background: '#f59e0b',
									zIndex: 10,
								});
								latitude = lat;
								longitude = lng;
							} catch (err) {
								console.error('[LogisticsMap]', err);
							}
						})();
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
				try {
					marker.map = null;
				} catch {
					/* ignore */
				}
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
		<span class="logistics-map-empty__icon"><Icon name="sys.lock" size={36} /></span>
		<p class="logistics-map-empty__text">
			Google Maps API Key Required. Configure in .env to activate visual routing.
		</p>
	</div>
{:else if !mapsMapId}
	<div class="logistics-map-empty logistics-map-empty--no-key" role="img" aria-label="Google Maps Map ID required">
		<span class="logistics-map-empty__icon"><Icon name="sys.map-pin" size={36} /></span>
		<p class="logistics-map-empty__text">
			Set <code class="lm-code">VITE_GOOGLE_MAPS_MAP_ID</code> (Google Cloud → Map Management → Map IDs) for Advanced
			Markers.
		</p>
	</div>
{:else if loadError}
	<div
		class="logistics-map-empty logistics-map-empty--error"
		role="img"
		aria-label="Google Maps failed to load"
	>
		<span class="logistics-map-empty__icon"><Icon name="sys.map-pin" size={36} /></span>
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
	.lm-code {
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
		font-weight: 700;
		color: #d97706;
	}

	.logistics-map-root {
		box-sizing: border-box;
		min-height: 500px;
		height: 500px;
		width: 100%;
		border-radius: 14px;
		border: 1px solid #e5e5e5;
	}

	:global(html.dark) .logistics-map-root {
		border-color: #404040;
	}

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
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
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
