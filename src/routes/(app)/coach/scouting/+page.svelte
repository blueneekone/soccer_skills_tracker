<script lang="ts">
	import CoachScoutingView from '$lib/coach/scouting/CoachScoutingView.svelte';
	import CoachTryoutEvalPanel from '$lib/coach/scouting/CoachTryoutEvalPanel.svelte';
</script>

<svelte:head>
	<title>Coach • Scouting • Vanguard OS</title>
</svelte:head>

<!-- Outer wrapper with Vanguard background and flex flow -->
<div class="pd-page-root tw-min-h-[100dvh] tw-bg-[#020617] tw-text-slate-300 tw-flex tw-flex-col tw-overflow-x-hidden">
	
	<!-- Top padding to account for fixed header if present -->
	<div class="tw-pt-[var(--st-header-h,64px)] tw-flex-1 tw-flex tw-flex-col">
		
		<!-- 12-column asymmetric Bento Grid for content -->
		<div class="tw-w-full tw-max-w-[1600px] tw-mx-auto tw-p-[clamp(12px,3vw,32px)]">
			<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-[clamp(16px,2vw,24px)] tw-items-start">
				
				<!-- Main Scouting & Roster Eval Panel (Span 8) -->
				<div class="xl:tw-col-span-8 st-bento vanguard-panel tw-bg-[#0f172a] tw-border tw-border-slate-800">
					<CoachScoutingView />
				</div>
				
				<!-- Tryout Pipeline Eval Panel (Span 4) -->
				<div class="xl:tw-col-span-4 st-bento vanguard-panel tw-bg-[#0f172a] tw-border tw-border-slate-800">
					<CoachTryoutEvalPanel />
				</div>

			</div>
		</div>
	</div>
</div>
