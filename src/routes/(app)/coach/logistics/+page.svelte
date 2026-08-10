<script lang="ts">
	import { CoachLogisticsView } from '$lib/coach/logistics/index.js';
</script>

<svelte:head>
	<title>Coach • Team Ops • Vanguard OS</title>
</svelte:head>

<div class="pd-page-root tw-min-h-[100dvh] tw-bg-[#020617] tw-text-slate-300 tw-flex tw-flex-col tw-overflow-x-hidden">
	<div class="tw-pt-[var(--st-header-h,64px)] tw-flex-1 tw-flex tw-flex-col">
		<div class="tw-w-full tw-max-w-[1600px] tw-mx-auto tw-p-[clamp(12px,3vw,32px)]">
			<div class="st-bento vanguard-panel tw-bg-[#0f172a] tw-border tw-border-slate-800">
				<CoachLogisticsView />
			</div>
		</div>
	</div>
</div>
