<script lang="ts">
	import type { DashboardEngine } from './DashboardEngine.svelte.js';
	import WeatherHub from '$lib/components/coach/WeatherHub.svelte';
	import SquadMatrix from '$lib/components/coach/SquadMatrix.svelte';
	import WarRoomGrid from '$lib/components/coach/WarRoomGrid.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { engine }: { engine: DashboardEngine } = $props();
</script>

<div class="coach-mainboard-grid tw-grid-cols-12 tw-gap-4 st-bento" style="display: grid;" aria-label="Nexus Command workspace">
	<!-- Top Navigation Section (2-section grid) -->
	<div class="tw-col-span-12 tw-grid tw-grid-cols-2 tw-gap-4 tw-mb-2">
		<a href="/coach/dashboard" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-[#daff0a] tw-border-[#daff0a]/40 hover:tw-text-[#daff0a] tw-transition-colors tw-no-underline" style="border-radius: 0px !important;">
			<Icon name="status.shield-check" size={14} class="tw-text-[#daff0a]" />
			<span>MISSION CONTROL</span>
		</a>
		<a href="/coach/logistics" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-400 hover:tw-text-[#14b8a6] tw-transition-colors tw-no-underline" style="border-radius: 0px !important;">
			<Icon name="user.group" size={14} class="tw-text-slate-400 group-hover:tw-text-[#14b8a6]" />
			<span>TEAM OPS</span>
		</a>
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
