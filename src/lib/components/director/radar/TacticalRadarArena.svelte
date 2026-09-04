<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { ensureGoogleMapsLoaded, getGoogleMapsApiKey, getGoogleMapsMapId } from '$lib/maps/ensureGoogleMaps.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { LightningRadarEngine } from '../../../../routes/(app)/director/logistics/radar/LightningRadarEngine.svelte';

	let { engine }: { engine: LightningRadarEngine } = $props();

	const apiKey = getGoogleMapsApiKey();
	const mapsMapId = getGoogleMapsMapId();

	let mapContainer: HTMLElement | null = $state(null);
	let map: any | undefined;
	let rotationAngle = $state(0);
	let animationFrame: number;
	let loadError = $state(false);

	const voidBlackTheme = [
		{ elementType: "geometry", stylers: [{ color: "#000000" }] },
		{ elementType: "labels.icon", stylers: [{ visibility: "off" }] },
		{ elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
		{ elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
		{ featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
		{ featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
		{ featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
		{ featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
		{ featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
		{ featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#050505" }] },
		{ featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
		{ featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
		{ featureType: "road", elementType: "geometry", stylers: [{ color: "#2c3e50" }] },
		{ featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#34495e" }] },
		{ featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#34495e" }] },
		{ featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4c5c68" }] },
		{ featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
		{ featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
		{ featureType: "water", elementType: "geometry", stylers: [{ color: "#00ffff" }] },
		{ featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
	];

	$effect(() => {
		if (!browser || !mapContainer || !apiKey || !mapsMapId) return;

		loadError = false;
		let cancelled = false;

		(async () => {
			try {
				const g = await ensureGoogleMapsLoaded();
				if (cancelled || !mapContainer) return;

				if (!g?.maps) {
					loadError = true;
					return;
				}

				map = new g.maps.Map(mapContainer, {
					mapId: mapsMapId,
					center: { lat: engine.clubLat || 39.8283, lng: engine.clubLng || -98.5795 },
					zoom: 10,
					styles: voidBlackTheme,
					disableDefaultUI: true,
					mapTypeControl: false,
					streetViewControl: false,
					fullscreenControl: false,
					clickableIcons: false,
				});
			} catch (e) {
				console.error('[TacticalRadarArena]', e);
				loadError = true;
			}
		})();

		const animate = () => {
			rotationAngle = (rotationAngle + 2) % 360;
			animationFrame = requestAnimationFrame(animate);
		};
		animationFrame = requestAnimationFrame(animate);

		return () => {
			cancelled = true;
			if (animationFrame) cancelAnimationFrame(animationFrame);
			if (map && globalThis.google?.maps?.event) {
				globalThis.google.maps.event.clearInstanceListeners(map);
			}
			map = undefined;
		};
	});

	function stopProp(e: MouseEvent) {
		e.stopPropagation();
	}
</script>

{#if !apiKey || !mapsMapId || loadError}
	<div class="tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-h-full tw-w-full tw-flex tw-items-center tw-justify-center">
		<Icon name="sys.map-pin" class="tw-text-[#334155]" size={36} />
	</div>
{:else}
	<div class="tw-relative tw-w-full tw-h-full tw-bg-black tw-overflow-hidden">
		<div bind:this={mapContainer} class="tw-absolute tw-inset-0"></div>

		<!-- SVG Radar Overlay -->
		<svg class="tw-absolute tw-inset-0 tw-w-full tw-h-full tw-pointer-events-none" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
			<defs>
				<radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stop-color="#14b8a6" stop-opacity="0.3" />
					<stop offset="100%" stop-color="#14b8a6" stop-opacity="0" />
				</radialGradient>

				<filter id="neonBloom" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
					<feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur2" />
					<feMerge>
						<feMergeNode in="blur2" />
						<feMergeNode in="blur1" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			<!-- Center Point -->
			<circle cx="50%" cy="50%" r="4" fill="#14b8a6" />
			<circle cx="50%" cy="50%" r="250" fill="url(#radarGlow)" />
			<circle cx="50%" cy="50%" r="250" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-opacity="0.5" />
			<circle cx="50%" cy="50%" r="500" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-opacity="0.2" />

			<!-- Radial Sweep -->
			<g style="transform-origin: 50% 50%; transform: rotate({rotationAngle}deg);">
				<path d="M 500 500 L 500 0 A 500 500 0 0 1 650 23 Z" fill="#14b8a6" opacity="0.15" />
				<line x1="500" y1="500" x2="500" y2="0" stroke="#14b8a6" stroke-width="1.5" />
			</g>

			<!-- Strikes Overlay (Mocked positions based on distance/angle) -->
			{#each engine.strikes as strike, i}
				{#if strike.dist_miles < 10}
					<!-- Pulsating red target ring for critical strikes -->
					<circle
						cx="{500 + strike.dist_miles * 20}"
						cy="{500 - strike.dist_miles * 10}"
						r="15"
						fill="none"
						stroke="#ff007f"
						stroke-width="1.5"
						filter="url(#neonBloom)"
						class="tw-animate-pulse"
						onmousedown={stopProp}
						onclick={stopProp}
					/>
					<circle cx="{500 + strike.dist_miles * 20}" cy="{500 - strike.dist_miles * 10}" r="4" fill="#ff007f" filter="url(#neonBloom)" onmousedown={stopProp} onclick={stopProp} />
				{:else}
					<!-- Amber for warning -->
					<circle cx="{500 - strike.dist_miles * 15}" cy="{500 + strike.dist_miles * 5}" r="4" fill="#f59e0b" onmousedown={stopProp} onclick={stopProp} />
				{/if}
			{/each}
		</svg>
	</div>
{/if}
