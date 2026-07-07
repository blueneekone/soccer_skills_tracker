<script lang="ts">
	import type { CoachClearanceEngine } from './CoachClearanceEngine.svelte.js';
	import AdminConsoleSearch from '$lib/components/admin/AdminConsoleSearch.svelte';

	let { engine, headerLabel, pageTitle }: { engine: CoachClearanceEngine, headerLabel: string, pageTitle: string } = $props();
</script>

{#if engine.toastMsg}
	<div class="tw-bg-[#0f172a] tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-px-4 tw-py-2 tw-rounded-none tw-font-mono tw-text-sm tw-mb-4" role="status" aria-live="polite">
		{engine.toastMsg}
	</div>
{/if}

<div class="tw-flex tw-flex-col tw-gap-4 tw-mb-4 tw-w-full">
	<!-- Top Row: Title and Metrics Bento Grid -->
	<div class="tw-flex tw-flex-col lg:tw-flex-row tw-justify-between tw-items-stretch tw-gap-4 tw-border-b tw-border-[#334155] tw-pb-4">
		<div class="tw-flex tw-flex-col tw-justify-end">
			<h1 class="tw-text-2xl tw-font-bold tw-text-[#FAFAFA] tw-m-0 tw-leading-none">{pageTitle}</h1>
			<div class="tw-text-[#94A3B8] tw-text-sm tw-font-mono tw-mt-2 tw-uppercase tw-tracking-widest">
				{headerLabel}
			</div>
		</div>
		
		<div class="tw-flex tw-gap-3 tw-flex-wrap">
			<!-- Total -->
			<div class="vanguard-panel tw-px-4 tw-py-2 tw-flex tw-flex-col tw-items-end tw-justify-center tw-min-w-[100px]">
				<span class="tw-text-[#FAFAFA] tw-text-xl tw-font-bold tw-font-mono tw-leading-none">{engine.counts.total}</span>
				<span class="tw-text-[#94A3B8] tw-text-[10px] tw-font-mono tw-uppercase tw-tracking-widest tw-mt-1">TOTAL</span>
			</div>
			<!-- Cleared -->
			<div class="vanguard-panel tw-px-4 tw-py-2 tw-flex tw-flex-col tw-items-end tw-justify-center tw-min-w-[100px] tw-border-l-2 tw-border-[#14b8a6]">
				<span class="tw-text-[#14b8a6] tw-text-xl tw-font-bold tw-font-mono tw-leading-none">{engine.counts.cleared}</span>
				<span class="tw-text-[#14b8a6]/70 tw-text-[10px] tw-font-mono tw-uppercase tw-tracking-widest tw-mt-1">CLEARED</span>
			</div>
			<!-- Pending -->
			<div class="vanguard-panel tw-px-4 tw-py-2 tw-flex tw-flex-col tw-items-end tw-justify-center tw-min-w-[100px] tw-border-l-2 tw-border-[#f59e0b]">
				<span class="tw-text-[#f59e0b] tw-text-xl tw-font-bold tw-font-mono tw-leading-none">{engine.counts.pending}</span>
				<span class="tw-text-[#f59e0b]/70 tw-text-[10px] tw-font-mono tw-uppercase tw-tracking-widest tw-mt-1">PENDING</span>
			</div>
			<!-- Flagged -->
			<div class="vanguard-panel tw-px-4 tw-py-2 tw-flex tw-flex-col tw-items-end tw-justify-center tw-min-w-[100px] tw-border-l-2 tw-border-[var(--vanguard-red,#f43f5e)]">
				<span class="tw-text-[var(--vanguard-red,#f43f5e)] tw-text-xl tw-font-bold tw-font-mono tw-leading-none">{engine.counts.flagged}</span>
				<span class="tw-text-[var(--vanguard-red,#f43f5e)]/70 tw-text-[10px] tw-font-mono tw-uppercase tw-tracking-widest tw-mt-1">FLAGGED</span>
			</div>
		</div>
	</div>

	<!-- Bottom Row: Unified SIEM Action Bar -->
	<div class="v-admin-toolbar tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
		<div class="tw-flex-1 tw-min-w-[320px]">
			<AdminConsoleSearch
				bind:value={engine.search}
				placeholder="Search staff…"
				ariaLabel="Search coaches"
			/>
		</div>

		<div class="tw-flex tw-items-center">
			<div class="tw-flex tw-items-center tw-gap-2 tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-px-3 tw-h-10 tw-rounded-none">
				<span class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-[#14b8a6] tw-animate-pulse"></span>
				<span class="tw-text-[10px] tw-font-mono tw-text-[#94A3B8] tw-tracking-widest tw-uppercase">
					QA BYPASS ACTIVE
				</span>
			</div>
		</div>
	</div>
</div>
