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

<div
	class="pd-page-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-min-h-0 tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border"
	style="padding: var(--bento-pad-liquid, clamp(20px, 4vw, 32px)); box-sizing: border-box;"
>
	<DirectorDashboardHUD {engine} />
	<main class="tw-flex-1 tw-flex tw-flex-col tw-min-w-0">
		<DirectorDashboardArena {engine} />
	</main>
</div>
