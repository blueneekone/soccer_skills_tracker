<script lang="ts">
	import { LightningRadarEngine } from './LightningRadarEngine.svelte';
	import TacticalRadarArena from '$lib/components/director/radar/TacticalRadarArena.svelte';
	import TacticalRadarHUD from '$lib/components/director/radar/TacticalRadarHUD.svelte';

	// Mocking active club coordinates for this demo
	const clubLat = 34.0522;
	const clubLng = -118.2437;

	const engine = new LightningRadarEngine(clubLat, clubLng);

	// Expose to window for easy testing/simulation via console in development
	if (typeof window !== 'undefined') {
		(window as any)._radarEngine = engine;
	}
</script>

<div class="tw-h-[100dvh] tw-w-full tw-overflow-hidden tw-flex tw-bg-[#0a0a0a]">
	<!-- Main Arena (Glass) -->
	<div class="tw-flex-1 tw-relative">
		<TacticalRadarArena {engine} />
	</div>

	<!-- Right Sidebar (HUD) -->
	<div class="tw-w-80 tw-h-full tw-border-l tw-border-[#334155] tw-bg-[#0a0a0a] tw-shrink-0">
		<TacticalRadarHUD {engine} />
	</div>
</div>
