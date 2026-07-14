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

	const isThreatActive = $derived(weatherAegis.alertLevel === 'DANGER');
</script>

<div class="tw-h-full tw-w-full tw-min-h-[220px] {isThreatActive ? 'vanguard-panel-breach' : 'vanguard-panel'} tw-relative tw-flex tw-flex-col">
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
