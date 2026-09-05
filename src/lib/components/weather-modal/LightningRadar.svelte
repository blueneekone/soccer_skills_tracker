<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import {
		calculateBearing,
		bearingToCompass,
		calculateHaversineDistance,
		getDestinationPoint,
		latLngToTile,
	} from '$lib/utils/geoMath.js';

	interface Strike {
		id: number;
		distMiles: number;
		bearingDeg: number;
		timestamp: number;
		amplitudeKa: number;
		lat: number;
		lng: number;
	}

	interface Props {
		weatherLockout?: boolean;
		fieldLat?: number;
		fieldLng?: number;
	}

	let {
		weatherLockout = $bindable(false),
		fieldLat = 41.633,
		fieldLng = -111.851,
	}: Props = $props();

	let rangeMiles = $state<15 | 30 | 50>(30);
	let strikes = $state<Strike[]>([]);
	let sweepAngle = $state(0);
	let countdown = $state(0);
	let selectedStrike = $state<Strike | null>(null);

	let mapContainer: HTMLElement | undefined = $state();
	let googleMapsActive = $state(false);
	let mapInstance: any = undefined;

	let rafId: number | undefined;
	let strikeTimer: ReturnType<typeof setInterval> | undefined;
	let cdTimer: ReturnType<typeof setInterval> | undefined;

	// Slippy tile state for fallback dark cartography
	let tileZoom = $derived(rangeMiles === 15 ? 11 : rangeMiles === 30 ? 10 : 9);
	const centerTile = $derived(latLngToTile(fieldLat, fieldLng, tileZoom));
	const r15 = $derived((15 / rangeMiles) * 48);
	const r8 = $derived((8 / rangeMiles) * 48);

	const nearestStrike = $derived.by(() => {
		if (strikes.length === 0) return null;
		return [...strikes].sort((a, b) => a.distMiles - b.distMiles)[0];
	});

	async function initGoogleMaps(apiKey: string, mapId: string) {
		if (!mapContainer || !apiKey.trim()) return;
		try {
			const { importLibrary } = await import('@googlemaps/js-api-loader');
			// @ts-ignore
			const { Map } = (await importLibrary('maps', { apiKey, version: 'weekly' })) as any;
			mapInstance = new Map(mapContainer, {
				center: { lat: fieldLat, lng: fieldLng },
				zoom: rangeMiles === 15 ? 12 : rangeMiles === 30 ? 11 : 10,
				mapId: mapId || undefined,
				disableDefaultUI: true,
				backgroundColor: '#05050a',
			});
			googleMapsActive = true;
		} catch {
			googleMapsActive = false;
		}
	}

	function triggerLockout() {
		weatherLockout = true;
		countdown = 30 * 60; // 30 minutes NSSL 30-30 rule
		if (cdTimer) clearInterval(cdTimer);
		cdTimer = setInterval(() => {
			if (countdown > 0) {
				countdown--;
			} else {
				if (cdTimer) clearInterval(cdTimer);
			}
		}, 1000);
	}

	function generateStrikeCluster() {
		const now = Date.now();
		// Purge strikes older than 30 minutes
		strikes = strikes.filter((s) => now - s.timestamp < 30 * 60 * 1000);

		// Random probability of lightning strike
		if (Math.random() < 0.28) {
			const distMiles = Math.random() * (rangeMiles * 0.95);
			const bearingDeg = Math.random() * 360;
			const dest = getDestinationPoint(fieldLat, fieldLng, distMiles, bearingDeg);
			const amplitudeKa = Math.round(20 + Math.random() * 95);

			const newStrike: Strike = {
				id: now + Math.random(),
				distMiles: Math.round(distMiles * 10) / 10,
				bearingDeg: Math.round(bearingDeg),
				timestamp: now,
				amplitudeKa,
				lat: dest.lat,
				lng: dest.lng,
			};

			strikes = [newStrike, ...strikes];

			// 8-Mile NFHS / US Soccer Safety Lockout Rule
			if (distMiles <= 8.0) {
				triggerLockout();
			}
		}
	}

	function seedInitialStrikes() {
		const now = Date.now();
		const initial: Strike[] = [];
		const samples = [
			{ dist: 4.8, bearing: 285, ageMin: 1.5, amp: 78 },
			{ dist: 7.2, bearing: 310, ageMin: 4.0, amp: 54 },
			{ dist: 12.5, bearing: 240, ageMin: 8.5, amp: 92 },
			{ dist: 18.0, bearing: 195, ageMin: 14.0, amp: 65 },
			{ dist: 22.4, bearing: 270, ageMin: 22.0, amp: 41 },
		];
		for (const s of samples) {
			const dest = getDestinationPoint(fieldLat, fieldLng, s.dist, s.bearing);
			initial.push({
				id: now - s.ageMin * 60000,
				distMiles: s.dist,
				bearingDeg: s.bearing,
				timestamp: now - s.ageMin * 60000,
				amplitudeKa: s.amp,
				lat: dest.lat,
				lng: dest.lng,
			});
		}
		strikes = initial;
		if (initial.some((s) => s.distMiles <= 8)) {
			triggerLockout();
		}
	}

	onMount(() => {
		const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
		const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '';
		if (apiKey) initGoogleMaps(apiKey, mapId);

		seedInitialStrikes();

		let lastTime = performance.now();
		const animate = (time: number) => {
			sweepAngle = (sweepAngle + (time - lastTime) * 0.12) % 360;
			lastTime = time;
			rafId = requestAnimationFrame(animate);
		};
		rafId = requestAnimationFrame(animate);

		strikeTimer = setInterval(generateStrikeCluster, 3000);
	});

	onDestroy(() => {
		if (rafId) cancelAnimationFrame(rafId);
		if (strikeTimer) clearInterval(strikeTimer);
		if (cdTimer) clearInterval(cdTimer);
	});

	function fmtTime(s: number) {
		const m = Math.floor(s / 60).toString().padStart(2, '0');
		const sec = (s % 60).toString().padStart(2, '0');
		return `${m}:${sec}`;
	}

	function getStrikeAgeCategory(ts: number): 'critical' | 'recent' | 'old' {
		const ageMs = Date.now() - ts;
		if (ageMs < 5 * 60 * 1000) return 'critical';
		if (ageMs < 15 * 60 * 1000) return 'recent';
		return 'old';
	}
</script>

<div class="tw-relative tw-w-full tw-h-full tw-bg-[#020617] tw-border {weatherLockout ? 'tw-border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'tw-border-[#334155]'} tw-overflow-hidden tw-flex tw-flex-col tw-font-mono">
	<!-- Top Tactical Readout HUD -->
	<div class="tw-relative tw-z-20 tw-bg-[#0f172a]/95 tw-backdrop-blur-md tw-border-b tw-border-[#334155] tw-px-3 tw-py-2 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
		<!-- Nearest Strike Badge -->
		<div class="tw-flex tw-items-center tw-gap-2">
			<span class="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-tracking-widest tw-uppercase">
				NEAREST STRIKE:
			</span>
			{#if nearestStrike}
				{@const compass = bearingToCompass(nearestStrike.bearingDeg)}
				{@const isDanger = nearestStrike.distMiles <= 8}
				{@const isCaution = nearestStrike.distMiles <= 15 && !isDanger}
				<span class="tw-px-2 tw-py-0.5 tw-rounded tw-text-xs tw-font-black {isDanger ? 'tw-bg-red-950 tw-border tw-border-red-600 tw-text-red-400 animate-pulse' : isCaution ? 'tw-bg-amber-950 tw-border tw-border-amber-600 tw-text-amber-400' : 'tw-bg-teal-950 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6]'}">
					⚡ {nearestStrike.distMiles} MI · {nearestStrike.bearingDeg}° {compass}
				</span>
			{:else}
				<span class="tw-text-xs tw-font-bold tw-text-[#14b8a6]">NONE IN RANGE</span>
			{/if}
		</div>

		<!-- Range Zoom Controls -->
		<div class="tw-flex tw-items-center tw-gap-1">
			<span class="tw-text-[9px] tw-text-slate-500 tw-mr-1">SCALE:</span>
			{#each [15, 30, 50] as r}
				<button
					type="button"
					class="tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold tw-border tw-transition-colors {rangeMiles === r ? 'tw-border-[#14b8a6] tw-text-[#14b8a6] tw-bg-[#14b8a6]/20' : 'tw-border-[#334155] tw-text-slate-400 hover:tw-text-white'}"
					onclick={() => (rangeMiles = r as 15 | 30 | 50)}
				>
					{r} MI
				</button>
			{/each}
		</div>
	</div>

	<!-- Map & Radar Viewport -->
	<div class="tw-relative tw-flex-1 tw-min-h-[360px] tw-w-full tw-overflow-hidden">
		<!-- 1. Google Maps Container (if active) -->
		<div
			bind:this={mapContainer}
			class="tw-absolute tw-inset-0 tw-z-0"
			class:tw-hidden={!googleMapsActive}
		></div>

		<!-- 2. Dark Cartography Tile Layer (CartoDB Dark Matter) -->
		{#if !googleMapsActive}
			<div class="tw-absolute tw-inset-0 tw-z-0 tw-pointer-events-none tw-overflow-hidden tw-bg-[#020617]">
				<div
					class="tw-absolute tw-inset-[-50%] tw-grid tw-grid-cols-3 tw-opacity-70"
					style="filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(110%);"
				>
					{#each [-1, 0, 1] as dy}
						{#each [-1, 0, 1] as dx}
							{@const tx = Math.floor(centerTile.x) + dx}
							{@const ty = Math.floor(centerTile.y) + dy}
							<img
								src="https://tile.openstreetmap.org/{tileZoom}/{tx}/{ty}.png"
								alt="Geographic cartography"
								class="tw-w-full tw-h-full tw-object-cover"
								loading="lazy"
							/>
						{/each}
					{/each}
				</div>
			</div>
		{/if}

		<!-- 3. Tactical Radar SVG & Range Rings -->
		<svg
			viewBox="0 0 100 100"
			class="tw-absolute tw-inset-0 tw-w-full tw-h-full tw-z-10 tw-pointer-events-none"
			preserveAspectRatio="xMidYMid meet"
		>
			<!-- Regional 30-Mile Advisory Ring -->
			<circle
				cx="50"
				cy="50"
				r="48"
				fill="none"
				stroke="#14b8a6"
				stroke-width="0.3"
				stroke-dasharray="1.5 2"
				opacity="0.4"
			/>
			<text x="50" y="4" font-size="2" fill="#14b8a6" text-anchor="middle" opacity="0.6">
				{rangeMiles} MI PERIMETER
			</text>

			<!-- 15-Mile Warning Ring -->
			{#if r15 < 48}
				<circle
					cx="50"
					cy="50"
					r={r15}
					fill="none"
					stroke="#f59e0b"
					stroke-width="0.4"
					stroke-dasharray="2 2"
					opacity="0.6"
				/>
				<text x="50" y={50 - r15 + 2.5} font-size="2" fill="#f59e0b" text-anchor="middle" opacity="0.75">
					15 MI // CAUTION
				</text>
			{/if}

			<!-- 8-Mile NFHS / Lockout Ring (Red) -->
			{#if r8 < 48}
				<circle
					cx="50"
					cy="50"
					r={r8}
					fill="none"
					stroke="#ef4444"
					stroke-width="0.6"
					class={weatherLockout ? 'tw-animate-pulse' : ''}
					opacity="0.85"
				/>
				<text x="50" y={50 - r8 + 2.5} font-size="2.2" fill="#ef4444" text-anchor="middle" font-weight="bold">
					8 MI // LOCKOUT ZONE
				</text>
			{/if}

			<!-- Crosshairs -->
			<line x1="50" y1="2" x2="50" y2="98" stroke="#14b8a6" stroke-width="0.2" opacity="0.3" />
			<line x1="2" y1="50" x2="98" y2="50" stroke="#14b8a6" stroke-width="0.2" opacity="0.3" />

			<!-- Radar Sweep Blade -->
			<g style="transform: rotate({sweepAngle}deg); transform-origin: 50px 50px;">
				<path d="M 50 50 L 50 2 A 48 48 0 0 1 98 50 Z" fill="url(#aegisSweepGrad)" opacity="0.45" />
			</g>

			<!-- Home Field Center Marker -->
			<circle cx="50" cy="50" r="1.5" fill="#daff0a" stroke="#000" stroke-width="0.3" />
			<circle cx="50" cy="50" r="3" fill="none" stroke="#daff0a" stroke-width="0.3" class="tw-animate-ping" />
			<text x="50" y="55" font-size="2" fill="#daff0a" text-anchor="middle" font-weight="bold">
				HOME FIELD
			</text>

			<!-- Plotted Lightning Strikes -->
			{#each strikes as s (s.id)}
				{@const distPct = Math.min(1, s.distMiles / rangeMiles)}
				{@const rad = ((s.bearingDeg - 90) * Math.PI) / 180}
				{@const cx = 50 + distPct * 48 * Math.cos(rad)}
				{@const cy = 50 + distPct * 48 * Math.sin(rad)}
				{@const ageCat = getStrikeAgeCategory(s.timestamp)}

				{#if ageCat === 'critical'}
					<!-- Shockwave ripple -->
					<circle cx={cx} cy={cy} r="3" fill="none" stroke="#daff0a" stroke-width="0.4" class="tw-animate-ping" />
					<circle cx={cx} cy={cy} r="1.2" fill="#ffffff" stroke="#daff0a" stroke-width="0.4" />
				{:else if ageCat === 'recent'}
					<circle cx={cx} cy={cy} r="1" fill="#f59e0b" opacity="0.9" />
				{:else}
					<circle cx={cx} cy={cy} r="0.8" fill="#ef4444" opacity="0.6" />
				{/if}
			{/each}

			<defs>
				<radialGradient id="aegisSweepGrad" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stop-color="#14b8a6" stop-opacity="0.9" />
					<stop offset="60%" stop-color="#14b8a6" stop-opacity="0.2" />
					<stop offset="100%" stop-color="#14b8a6" stop-opacity="0" />
				</radialGradient>
			</defs>
		</svg>

		<!-- Interactive Strike Legend & Coordinates Badge -->
		<div class="tw-absolute tw-bottom-2 tw-left-2 tw-z-20 tw-flex tw-flex-col tw-gap-1 tw-bg-[#020617]/90 tw-border tw-border-[#334155] tw-px-2.5 tw-py-1.5 tw-rounded tw-text-[9px] tw-backdrop-blur-md">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-h-2 tw-w-2 tw-rounded-full tw-bg-[#daff0a]"></span>
				<span class="tw-text-slate-300">&lt; 5m (Critical)</span>
				<span class="tw-h-2 tw-w-2 tw-rounded-full tw-bg-[#f59e0b] tw-ml-1"></span>
				<span class="tw-text-slate-300">5-15m</span>
				<span class="tw-h-2 tw-w-2 tw-rounded-full tw-bg-[#ef4444] tw-ml-1"></span>
				<span class="tw-text-slate-300">15-30m</span>
			</div>
			<div class="tw-text-slate-500 tw-font-mono">
				PITCH: {fieldLat.toFixed(3)}°N, {Math.abs(fieldLng).toFixed(3)}°W
			</div>
		</div>

		<!-- 30-Minute Safety Lockout Overlay -->
		{#if weatherLockout}
			<div class="tw-absolute tw-top-3 tw-left-1/2 -tw-translate-x-1/2 tw-z-30 tw-bg-red-950/95 tw-border tw-border-red-600 tw-px-4 tw-py-2 tw-rounded-lg tw-shadow-[0_0_30px_rgba(220,38,38,0.7)] tw-backdrop-blur-md tw-text-center">
				<div class="tw-text-red-400 tw-font-bold tw-text-[11px] tw-tracking-widest tw-uppercase tw-animate-pulse">
					⚠ 30-MINUTE SAFETY LOCKOUT // STRIKE WITHIN 8 MILES
				</div>
				<div class="tw-text-2xl tw-font-black tw-text-white tw-font-mono tw-tabular-nums tw-mt-0.5">
					{fmtTime(countdown)}
				</div>
				<div class="tw-text-[9px] tw-text-red-300 tw-tracking-wider">
					RESTARTS ON EACH STRIKE (NSSL 30-30 RULE)
				</div>
			</div>
		{/if}
	</div>
</div>
