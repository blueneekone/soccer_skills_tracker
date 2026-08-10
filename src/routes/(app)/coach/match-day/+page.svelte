<script lang="ts">
	import { CoachMatchDayView } from '$lib/coach/match-day/index.js';
	import HalftimeChoicePlanner from '$lib/components/coach/halftime-choice-planner.svelte';
</script>

<svelte:head>
	<title>Coach • Match Day • Sideline Terminal</title>
</svelte:head>

<div class="pd-page-root tw-min-h-[100dvh] tw-bg-[#020617] tw-text-slate-300 tw-flex tw-flex-col tw-overflow-x-hidden">
	<div class="tw-pt-[var(--st-header-h,64px)] tw-flex-1 tw-flex tw-flex-col">
		<div class="tw-w-full tw-max-w-[1600px] tw-mx-auto tw-p-[clamp(12px,3vw,32px)]">
			
			<div class="st-bento vanguard-panel tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-mb-[clamp(16px,2vw,24px)]">
				<CoachMatchDayView />
			</div>

			<div class="st-bento vanguard-panel tw-bg-[#0f172a] tw-border tw-border-slate-800">
				<HalftimeChoicePlanner />
			</div>

		</div>
	</div>
</div>
