<script lang="ts">
	import type { DashboardEngine } from './DashboardEngine.svelte.js';
	import WeatherHub from '$lib/components/coach/WeatherHub.svelte';
	import SquadMatrix from '$lib/components/coach/SquadMatrix.svelte';
	import WarRoomGrid from '$lib/components/coach/WarRoomGrid.svelte';

	let { engine }: { engine: DashboardEngine } = $props();
</script>

<div class="coach-mainboard-grid tw-grid tw-grid-cols-12 tw-gap-4" aria-label="Nexus Command workspace">
	<!-- Top Navigation Section (3-section grid) -->
	<div class="tw-col-span-12 tw-grid tw-grid-cols-3 tw-gap-4 tw-mb-2">
		<a href="/coach/dashboard" class="vanguard-panel dashboard-card tw-block tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-[#14b8a6] hover:tw-text-[#14b8a6] tw-transition-colors tw-no-underline" style="border-radius: 0px !important;">MISSION CONTROL</a>
		<a href="/coach/logistics" class="vanguard-panel dashboard-card tw-block tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-400 hover:tw-text-[#14b8a6] tw-transition-colors tw-no-underline" style="border-radius: 0px !important;">TEAM OPS</a>
		<a href="/coach/match-day" class="vanguard-panel dashboard-card tw-block tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-400 hover:tw-text-[#14b8a6] tw-transition-colors tw-no-underline" style="border-radius: 0px !important;">MATCH DAY</a>
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
