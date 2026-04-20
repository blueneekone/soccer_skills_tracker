<script>
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';

	/**
	 * @typedef {{ lat: number; lng: number }} LatLng
	 */

	let {
		latitude = $bindable(/** @type {number | null} */ (null)),
		longitude = $bindable(/** @type {number | null} */ (null)),
		readonly = false,
	} = $props();

	const apiKey =
		typeof import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY === 'string' ?
			import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY.trim()
		:	'';

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
		const readOnly = readonly;

		let cancelled = false;
		/** @type {any} */
		let map = null;
		/** @type {any} */
		let marker = null;
		/** @type {any} */
		let clickListener = null;

		(async () => {
			try {
				/**
				 * v2+ uses `setOptions` + `importLibrary` (`Loader` is deprecated and throws).
				 * @see https://github.com/googlemaps/js-api-loader/blob/main/MIGRATION.md
				 */
				const { setOptions, importLibrary } = await import('@googlemaps/js-api-loader');
				setOptions({ key: apiKey, v: 'weekly' });
				await importLibrary('maps');
				if (cancelled || !mapRoot) return;

				const g = globalThis.google;
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

{#if !apiKey || loadError}
	<div
		class="logistics-map-empty flex h-72 w-full flex-col items-center justify-center gap-2 rounded-[14px] border border-[#e5e5e5] bg-[#f4f4f5] text-center dark:border-neutral-700 dark:bg-neutral-900/80"
		role="img"
		aria-label={!apiKey ? 'Google Maps API key missing' : 'Google Maps failed to load'}
	>
		<i class="ph ph-map-pin text-3xl text-[#a1a1aa]" aria-hidden="true"></i>
		<p class="mx-4 text-sm font-medium text-[#52525b] dark:text-neutral-400">
			{#if !apiKey}
				Google Maps API Key Required
			{:else}
				Unable to load Google Maps. Check your API key and billing.
			{/if}
		</p>
	</div>
{:else}
	<div
		bind:this={mapRoot}
		class="logistics-map-root h-72 w-full rounded-[14px] border border-[#e5e5e5] dark:border-neutral-700"
		role="application"
		aria-label={readonly ? 'Facility location map' : 'Click to set facility location'}
	></div>
{/if}
