<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Loader } from '@googlemaps/js-api-loader';
	let { weatherLockout = $bindable(false), fieldLat = 41.633, fieldLng = -111.851 }: { weatherLockout: boolean; fieldLat?: number; fieldLng?: number } = $props();
	let strikes = $state<{ id: number; dist: number; angle: number; time: number }[]>([]);
	let sweepAngle = $state(0), countdown = $state(0);
	let rafId: number, strikeInt: ReturnType<typeof setInterval>, cdInt: ReturnType<typeof setInterval>;
	const MOCK_PROB = 0.05; // 5% chance per tick

	let mapContainer: HTMLElement;
	let mapInstance: google.maps.Map | undefined;

	onMount(async () => {
		if (typeof window === 'undefined') return;

		try {
			// Pull from Vite env directly - will be empty if not present, but loader handles it or throws warning
			const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
			const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '';

			if (apiKey) {
				const loader = new Loader({
					apiKey,
					version: 'weekly'
				});

				// @ts-ignore: Types for this specific loader version may lack importLibrary signature
				const { Map } = await loader.importLibrary('maps') as google.maps.MapsLibrary;

				mapInstance = new Map(mapContainer, {
					center: { lat: fieldLat, lng: fieldLng },
					zoom: 12,
					mapId: mapId || undefined,
					disableDefaultUI: true,
					backgroundColor: '#0a0a0a',
					styles: [
						{ elementType: 'geometry', stylers: [{ color: '#10141a' }] },
						{ elementType: 'labels.text.stroke', stylers: [{ color: '#10141a' }] },
						{ elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
						{ featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
						{ featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
						{ featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
						{ featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
						{ featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
						{ featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
						{ featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
						{ featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
						{ featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
						{ featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
						{ featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
						{ featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
						{ featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
						{ featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
						{ featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] }
					]
				});
			} else {
				console.warn('No Google Maps API Key provided in environment variables.');
			}
		} catch (e) {
			console.error('Failed to load Google Maps', e);
		}

		let lastTime = performance.now();
		const animate = (time: number) => {
			sweepAngle = (sweepAngle + ((time - lastTime) * 0.1)) % 360;
			lastTime = time;
			rafId = requestAnimationFrame(animate);
		};
		rafId = requestAnimationFrame(animate);

		strikeInt = setInterval(() => {
			if (typeof window === 'undefined') return;
			if (Math.random() < MOCK_PROB) {
				const dist = Math.random() * 15, angle = Math.random() * 360;
				strikes = [...strikes, { id: Date.now(), dist, angle, time: Date.now() }];
				if (dist <= 8 && !weatherLockout) {
					weatherLockout = true;
					countdown = 30 * 60; // 30 mins
					if (!cdInt) cdInt = setInterval(() => { countdown > 0 ? countdown-- : clearInterval(cdInt); }, 1000);
				}
			}
			strikes = strikes.filter(s => Date.now() - s.time < 3000);
		}, 1000);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') { cancelAnimationFrame(rafId); clearInterval(strikeInt); clearInterval(cdInt); }
	});

	const fmtTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
</script>

<div class="tw-relative tw-w-full tw-h-full tw-bg-[#10141a] tw-border tw-rounded-none {weatherLockout ? 'tw-border-red-600' : 'tw-border-[#334155]'} tw-overflow-hidden tw-flex tw-flex-col">
	<!-- Google Map Container -->
	<div bind:this={mapContainer} class="tw-absolute tw-inset-0 tw-z-0 tw-bg-[#10141a]"></div>

	<!-- Radar Overlay -->
	<svg viewBox="0 0 100 100" class="tw-absolute tw-inset-0 tw-w-full tw-h-full tw-z-10 tw-pointer-events-none">
		<!-- Target Reticle Overlay over map -->
		<circle cx="50" cy="50" r="16.6" fill="none" stroke="#14b8a6" stroke-opacity="0.3" stroke-dasharray="2 2" stroke-width="0.5"/>
		<circle cx="50" cy="50" r="33.3" fill="none" stroke="#14b8a6" stroke-opacity="0.3" stroke-dasharray="2 2" stroke-width="0.5"/>
		<circle cx="50" cy="50" r="50" fill="none" class={weatherLockout ? 'tw-stroke-red-600 tw-animate-pulse' : 'tw-stroke-[#14b8a6]'} stroke-opacity="0.5" stroke-width="0.5"/>
		<line x1="50" y1="0" x2="50" y2="100" stroke="#14b8a6" stroke-opacity="0.2" stroke-width="0.25"/>
		<line x1="0" y1="50" x2="100" y2="50" stroke="#14b8a6" stroke-opacity="0.2" stroke-width="0.25"/>
		
		<!-- Radar Sweep -->
		<g style="transform: rotate({sweepAngle}deg); transform-origin: 50px 50px;">
			<path d="M 50 50 L 50 0 A 50 50 0 0 1 100 50 Z" fill="url(#radarSweep)" opacity="0.6"/>
		</g>
		
		<!-- Lightning Strikes -->
		{#each strikes as s (s.id)}
			<circle cx={50 + (s.dist / 15 * 50) * Math.sin(s.angle * Math.PI / 180)} cy={50 - (s.dist / 15 * 50) * Math.cos(s.angle * Math.PI / 180)} r="2" fill="none" stroke="red" stroke-width="1" class="tw-animate-ping"/>
			<circle cx={50 + (s.dist / 15 * 50) * Math.sin(s.angle * Math.PI / 180)} cy={50 - (s.dist / 15 * 50) * Math.cos(s.angle * Math.PI / 180)} r="0.5" fill="#fff"/>
		{/each}
		<defs>
			<radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stop-color="#14b8a6" stop-opacity="1"/><stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
			</radialGradient>
		</defs>
	</svg>

	{#if weatherLockout}
		<div class="tw-absolute tw-bottom-2 tw-left-2 tw-right-2 tw-z-20 tw-text-center tw-font-mono tw-text-red-500 tw-bg-[#0a0a0a]/90 tw-p-2 tw-border tw-border-red-600 tw-shadow-[0_0_15px_rgba(220,38,38,0.5)] tw-backdrop-blur-sm">
			30 MINUTE RESTART DETECTED // COUNTDOWN SINCE LAST LIGHTNING EVENT<br/><span class="tw-text-2xl tw-font-bold">{fmtTime(countdown)}</span>
		</div>
	{/if}
</div>
