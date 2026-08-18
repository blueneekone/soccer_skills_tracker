<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import CoachTeamRosterPanel from '$lib/coach/logistics/CoachTeamRosterPanel.svelte';
	
	const selectedTeamId = $derived(teamsStore.selectedTeamId);
</script>

<svelte:head>
	<title>Daily Intel · Coach OS</title>
</svelte:head>

<div class="tw-p-8 tw-bg-[#000000] tw-h-[100dvh] tw-overflow-hidden tw-text-white pd-page-root st-bento">
	<h1 class="tw-font-sans tw-text-2xl tw-font-bold tw-mb-6">Daily Intel</h1>

	<!-- .intel-panel with 24px vertical padding (tw-py-6) and 16px horizontal padding (tw-px-4) -->
	<div class="intel-panel tw-py-6 tw-px-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-mb-6 tw-rounded-none">
		<h2 class="tw-text-sm tw-uppercase tw-tracking-widest tw-text-[#94a3b8] tw-mb-4 tw-font-sans">Squad Telemetry</h2>
		<div class="tw-gap-8" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
			<div class="bento-cell tw-bg-[#000000] tw-p-4 tw-border tw-border-[#334155]">
				<span class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase">Load</span>
				<!-- Numeric telemetry values must use Geist Mono -->
				<div class="telemetry-readout-val tw-font-mono tw-text-3xl tw-text-[#14b8a6]">82%</div>
			</div>
			<div class="bento-cell tw-bg-[#000000] tw-p-4 tw-border tw-border-[#334155]">
				<span class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase">Readiness</span>
				<div class="telemetry-readout-val tw-font-mono tw-text-3xl tw-text-[#14b8a6]">95%</div>
			</div>
		</div>
	</div>

	<!-- The Forge & Intent Engine -->
	<div class="intel-panel tw-py-6 tw-px-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-mb-6 tw-rounded-none">
		<h2 class="tw-text-sm tw-uppercase tw-tracking-widest tw-text-[#94a3b8] tw-mb-4 tw-font-sans">The Forge & Intent Engine (RL Volume)</h2>
		<div class="tw-gap-8" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
			<div class="bento-cell tw-bg-[#000000] tw-p-4 tw-border tw-border-[#334155]">
				<span class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase">Drill Volume Autoregulator</span>
				<div class="tw-mt-4 tw-flex tw-flex-wrap tw-items-baseline tw-justify-between tw-gap-2">
					<span class="tw-text-xs tw-text-[#64748b] tw-uppercase tw-font-bold">RL Inference</span>
					<span class="tw-font-mono tw-text-lg tw-text-[#14b8a6]">+12% Intensity</span>
				</div>
				<div class="tw-w-full tw-bg-[#0f172a] tw-h-1.5 tw-mt-2 tw-border tw-border-[#334155]">
					<div class="tw-bg-[#14b8a6] tw-h-full" style="width: 62%;"></div>
				</div>
			</div>
			
			<div class="bento-cell tw-bg-[#000000] tw-p-4 tw-border tw-border-[#334155]">
				<span class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase">ZPD Engine (Dynamic Difficulty)</span>
				<div class="tw-mt-4 tw-flex tw-flex-wrap tw-items-baseline tw-justify-between tw-gap-2">
					<span class="tw-text-xs tw-text-[#64748b] tw-uppercase tw-font-bold">Latency</span>
					<span class="tw-font-mono tw-text-lg tw-text-[#d97706]">14ms</span>
				</div>
				<p class="tw-mt-2 tw-text-[10px] tw-text-[#94a3b8] tw-leading-relaxed tw-font-sans">
					Vygotsky inference active. Skill boundary scaling applied to central press and transitional width phases.
				</p>
			</div>
		</div>
	</div>

	<!-- Roster Scannable Feed -->
	<div class="intel-panel tw-py-6 tw-px-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none">
		<h2 class="tw-text-sm tw-uppercase tw-tracking-widest tw-text-[#94a3b8] tw-mb-4 tw-font-sans">Active Roster & Operatives</h2>
		<CoachTeamRosterPanel teamId={selectedTeamId} />
	</div>
</div>
