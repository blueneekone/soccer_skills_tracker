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
		<a href="/coach/tactical" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3.5 tw-font-mono tw-font-bold tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-slate-200 hover:tw-text-[#14b8a6] tw-border tw-border-[#334155] tw-bg-[#0f172a]/90 tw-backdrop-blur-md tw-shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:tw-shadow-[0_0_20px_rgba(20,184,166,0.25)] hover:tw-border-[#14b8a6] tw-border-t-[rgba(255,255,255,0.08)] tw-transition-all tw-no-underline hover:tw-translate-y-[-2px]">
			<Icon name="data.target" size={14} class="tw-text-[#14b8a6]" />
			<span>WAR ROOM</span>
		</a>
		<a href="/coach/forge" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3.5 tw-font-mono tw-font-bold tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-slate-200 hover:tw-text-[#daff0a] tw-border tw-border-[#334155] tw-bg-[#0f172a]/90 tw-backdrop-blur-md tw-shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:tw-shadow-[0_0_20px_rgba(218,255,10,0.25)] hover:tw-border-[#daff0a] tw-border-t-[rgba(255,255,255,0.08)] tw-transition-all tw-no-underline hover:tw-translate-y-[-2px]">
			<Icon name="game.dumbbell" size={14} class="tw-text-[#daff0a]" />
			<span>THE FORGE</span>
		</a>
		<a href="/coach/matchday" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3.5 tw-font-mono tw-font-bold tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-slate-200 hover:tw-text-[#14b8a6] tw-border tw-border-[#334155] tw-bg-[#0f172a]/90 tw-backdrop-blur-md tw-shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:tw-shadow-[0_0_20px_rgba(20,184,166,0.25)] hover:tw-border-[#14b8a6] tw-border-t-[rgba(255,255,255,0.08)] tw-transition-all tw-no-underline hover:tw-translate-y-[-2px]">
			<Icon name="data.activity" size={14} class="tw-text-[#14b8a6]" />
			<span>MATCH DAY</span>
		</a>
		<a href="/coach/logistics" class="vanguard-panel dashboard-card tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-center tw-p-3.5 tw-font-mono tw-font-bold tw-text-[11px] tw-uppercase tw-tracking-widest tw-text-slate-200 hover:tw-text-[#fbbf24] tw-border tw-border-[#334155] tw-bg-[#0f172a]/90 tw-backdrop-blur-md tw-shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:tw-shadow-[0_0_20px_rgba(251,191,36,0.25)] hover:tw-border-[#fbbf24] tw-border-t-[rgba(255,255,255,0.08)] tw-transition-all tw-no-underline hover:tw-translate-y-[-2px]">
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
			onSelectPlayer={(id: string) => engine.selectPlayer(id)}
		/>
	</div>
</div>
