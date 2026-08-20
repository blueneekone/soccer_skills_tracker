<script lang="ts">
	import { DirectorDashboardEngine } from './DirectorDashboardEngine.svelte.js';
	import DirectorDashboardHUD from './DirectorDashboardHUD.svelte';
	import DirectorDashboardArena from './DirectorDashboardArena.svelte';
	import WeatherAlert from '$lib/components/weather/WeatherAlert.svelte';

	// The Shell (+page.svelte) acts purely as an unauthenticated-safe Z0 wrapper
	// that instantiates the Engine and mounts the HUD and Arena.
	const engine = new DirectorDashboardEngine();
</script>

<!-- AEGIS Lightning Alert — directors and above only -->
<WeatherAlert />

<div class="pd-page-root tw-h-[100dvh] tw-overflow-hidden tw-bg-[#000000] tw-text-[#FAFAFA] tw-flex tw-flex-col">
	<DirectorDashboardHUD {engine} />
	<main class="tw-flex-1 tw-flex tw-flex-col tw-min-w-0 tw-min-h-0 tw-overflow-hidden">
		<DirectorDashboardArena {engine} />
	</main>
</div>
