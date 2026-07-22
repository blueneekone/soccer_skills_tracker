<script lang="ts">
	import type { DashboardEngine } from './DashboardEngine.svelte.js';
	import WeatherHub from '$lib/components/coach/WeatherHub.svelte';
	import SquadMatrix from '$lib/components/coach/SquadMatrix.svelte';
	import WarRoomGrid from '$lib/components/coach/WarRoomGrid.svelte';

	let { engine }: { engine: DashboardEngine } = $props();
</script>

<div class="tw-grid tw-grid-cols-12 tw-gap-4" aria-label="Nexus Command workspace">
	<!-- Top Navigation Section (3-section grid) -->
	<div class="tw-col-span-12 tw-grid tw-grid-cols-3 tw-gap-4 tw-mb-2">
		<div class="vanguard-panel tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-[#14b8a6]">MISSION CONTROL</div>
		<div class="vanguard-panel tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-400">FACILITY OPS</div>
		<div class="vanguard-panel tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-400">WEATHER HUB</div>
	</div>

	<!-- WarRoomGrid (8 cols) -->
	<div class="tw-col-span-12 lg:tw-col-span-8 tw-min-w-0">
		<WarRoomGrid />
	</div>

	<!-- WeatherHub (4 cols) -->
	<div class="tw-col-span-12 lg:tw-col-span-4 tw-min-w-0">
		<WeatherHub fieldLat={engine.fieldLat} fieldLng={engine.fieldLng} weatherCoords={engine.weatherCoords} />
	</div>

	<!-- SquadMatrix (12 cols) -->
	<div class="tw-col-span-12 tw-min-w-0">
		<SquadMatrix teamId={engine.effectiveTeamId} teams={engine.myTeams} />
	</div>
</div>
