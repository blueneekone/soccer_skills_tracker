<script lang="ts">
	import type { DashboardEngine } from './DashboardEngine.svelte.js';
	import WeatherHub from '$lib/components/coach/WeatherHub.svelte';
	import SquadMatrix from '$lib/components/coach/SquadMatrix.svelte';
	import WarRoomGrid from '$lib/components/coach/WarRoomGrid.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { engine }: { engine: DashboardEngine } = $props();
</script>

<div class="coach-mainboard-grid tw-grid-cols-12 tw-gap-4 st-bento" style="display: grid;" aria-label="Nexus Command workspace">
	<!-- Top Navigation Section (4-section tactical quick-launch) -->
	<div class="tw-col-span-12 tw-grid tw-grid-cols-2 sm:tw-grid-cols-4 tw-gap-3 tw-mb-2">
		<a href="/coach/tactical" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-slate-300 hover:tw-text-[#14b8a6] tw-border tw-border-[#334155] tw-bg-[#0f172a] hover:tw-border-[#14b8a6] tw-transition-all tw-no-underline" style="border-radius: 0px !important;">
			<Icon name="action.edit" size={14} class="tw-text-[#14b8a6]" />
			<span>WAR ROOM</span>
		</a>
		<a href="/coach/forge" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-slate-300 hover:tw-text-[#daff0a] tw-border tw-border-[#334155] tw-bg-[#0f172a] hover:tw-border-[#daff0a] tw-transition-all tw-no-underline" style="border-radius: 0px !important;">
			<Icon name="game.dumbbell" size={14} class="tw-text-[#daff0a]" />
			<span>THE FORGE</span>
		</a>
		<a href="/coach/matchday" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-slate-300 hover:tw-text-[#14b8a6] tw-border tw-border-[#334155] tw-bg-[#0f172a] hover:tw-border-[#14b8a6] tw-transition-all tw-no-underline" style="border-radius: 0px !important;">
			<Icon name="data.activity" size={14} class="tw-text-[#14b8a6]" />
			<span>MATCH DAY</span>
		</a>
		<a href="/coach/logistics" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-slate-300 hover:tw-text-[#fbbf24] tw-border tw-border-[#334155] tw-bg-[#0f172a] hover:tw-border-[#fbbf24] tw-transition-all tw-no-underline" style="border-radius: 0px !important;">
			<Icon name="user.group" size={14} class="tw-text-[#fbbf24]" />
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
		<SquadMatrix
			teamId={engine.effectiveTeamId}
			teams={engine.myTeams}
			selectedPlayerId={engine.selectedPlayerId}
			onSelectPlayer={(id) => engine.selectPlayer(id)}
		/>
	</div>
</div>
