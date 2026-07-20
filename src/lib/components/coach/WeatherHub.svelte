<script lang="ts">
	import WeatherWidget from '$lib/components/weather/WeatherWidget.svelte';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
	import { weatherAegis } from '$lib/services/weather.svelte.js';

	interface Props {
		fieldLat?: number;
		fieldLng?: number;
		weatherCoords?: string;
	}

	let { fieldLat = 41.633, fieldLng = -111.851, weatherCoords }: Props = $props();

	const activeWeatherThreat = $derived(weatherAegis.alertLevel === 'DANGER');
</script>

<div class="tw-h-full tw-w-full tw-min-h-[220px] {activeWeatherThreat ? 'vanguard-panel-breach' : 'vanguard-panel'} tw-relative tw-flex tw-flex-col tw-overflow-hidden">
	<!-- Ambient radar rings (perfect SVG circles) -->
	<svg class="tw-absolute tw-inset-0 tw-w-full tw-h-full tw-pointer-events-none tw-opacity-[0.15]" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
		<circle cx="50" cy="50" r="25" fill="none" stroke="#14b8a6" stroke-width="0.25" stroke-dasharray="1 2" class="tw-animate-[spin_20s_linear_infinite]" style="transform-origin: center;" />
		<circle cx="50" cy="50" r="50" fill="none" stroke="#14b8a6" stroke-width="0.5" opacity="0.6" />
		<circle cx="50" cy="50" r="85" fill="none" stroke="#14b8a6" stroke-width="0.75" stroke-dasharray="2 4" opacity="0.3" class="tw-animate-[spin_40s_linear_infinite_reverse]" style="transform-origin: center;" />
	</svg>
	{#if vanguardFlags.weatherEnabled}
		<WeatherWidget lat={fieldLat} lng={fieldLng} coordsLabel={weatherCoords} />
	{:else}
		<div
			class="coach-os-well font-mono text-xs p-4 text-center tw-flex tw-h-full tw-flex-col tw-items-center tw-justify-center"
			style="color: var(--pd-data-cyan, #14b8a6); opacity: 0.55; min-height: 220px;"
		>
			⏸ AEGIS WEATHER MODULE OFFLINE<br/>
			<span style="font-size: 9px; opacity: 0.6;">Disabled by platform configuration. Contact your administrator.</span>
		</div>
	{/if}
</div>
