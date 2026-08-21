<script lang="ts">
	import type { DashboardEngine } from './DashboardEngine.svelte.js';
	import WeatherHub from '$lib/components/coach/WeatherHub.svelte';
	import SquadMatrix from '$lib/components/coach/SquadMatrix.svelte';
	import WarRoomGrid from '$lib/components/coach/WarRoomGrid.svelte';
	import CoachTeamRosterPanel from '$lib/coach/logistics/CoachTeamRosterPanel.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { engine }: { engine: DashboardEngine } = $props();
</script>

<div class="coach-mainboard-grid tw-grid-cols-12 tw-gap-4 st-bento" style="display: grid;" aria-label="Nexus Command workspace">
	<!-- Top Navigation Section (3-section grid) -->
	<div class="tw-col-span-12 tw-grid-cols-3 tw-gap-4 tw-mb-2" style="display: grid;">
		<a href="/coach/dashboard" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-amber-500 tw-border-amber-500/40 hover:tw-text-amber-500 tw-transition-colors tw-no-underline" style="border-radius: 0px !important;">
			<Icon name="status.shield-check" size={14} class="tw-text-amber-500" />
			<span>MISSION CONTROL</span>
		</a>
		<a href="/coach/logistics" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-400 hover:tw-text-[#14b8a6] tw-transition-colors tw-no-underline" style="border-radius: 0px !important;">
			<Icon name="user.group" size={14} class="tw-text-slate-400 group-hover:tw-text-[#14b8a6]" />
			<span>TEAM OPS</span>
		</a>
		<a href="/coach/match-day" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-400 hover:tw-text-[#14b8a6] tw-transition-colors tw-no-underline" style="border-radius: 0px !important;">
			<Icon name="data.activity" size={14} class="tw-text-slate-400 group-hover:tw-text-[#14b8a6]" />
			<span>MATCH DAY</span>
		</a>
	</div>

	<!-- WarRoomGrid (8 cols) -->
	<div class="tw-col-span-12 lg:tw-col-span-8 tw-min-w-0">
		<WarRoomGrid />
	</div>

	<!-- Weather & Roster (4 cols) -->
	<div class="tw-col-span-12 lg:tw-col-span-4 tw-min-w-0 tw-flex tw-flex-col tw-gap-4">
		<WeatherHub fieldLat={engine.fieldLat} fieldLng={engine.fieldLng} weatherCoords={engine.weatherCoords} />
		
		<div class="st-bento roster-panel vanguard-surface tw-rounded-none tw-border tw-border-slate-700 tw-bg-slate-900/80 tw-p-4 tw-min-w-0 tw-flex-1" style="background: #0f172a;">
			<h3 class="tw-text-xs tw-text-[#14b8a6] tw-mb-4 tw-uppercase tw-tracking-widest tw-min-w-0" style="font-family: 'Geist Sans', sans-serif;">Active Roster & Operatives</h3>
			{#if engine.effectiveTeamId}
				<CoachTeamRosterPanel teamId={engine.effectiveTeamId} />
			{:else}
				<div class="tw-text-[#D4D4D8] tw-text-sm tw-min-w-0" style="font-family: 'Switzer', sans-serif;">No active squad.</div>
			{/if}
		</div>
	</div>

	<!-- SquadMatrix (12 cols) -->
	<div class="tw-col-span-12 tw-min-w-0">
		<SquadMatrix teamId={engine.effectiveTeamId} teams={engine.myTeams} />
	</div>
</div>
