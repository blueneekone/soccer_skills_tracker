<script lang="ts">
	import { Play, Loader2, FileDown } from 'lucide-svelte';

	let { engine } = $props<{ engine: any }>();
</script>

<div class="hud-panel tw-w-full tw-p-6 tw-flex tw-flex-col md:tw-flex-row tw-items-center tw-justify-between tw-mt-6">
	<div class="tw-mb-4 md:tw-mb-0">
		<h2 class="tw-text-white tw-font-bold tw-text-xl tw-mb-1">Automated End-of-Season Dossiers</h2>
		<p class="tw-text-slate-400 tw-text-sm">
			1-click batch export. Generates a personalized PDF report card for every athlete and dispatches it directly to the linked Parent OS via FCM.
		</p>
	</div>

	<div class="tw-flex tw-items-center tw-gap-4">
		{#if engine.error}
			<span class="tw-text-red-400 tw-text-sm tw-font-mono">{engine.error}</span>
		{/if}

		<button 
			class="tw-bg-[#334155] hover:tw-bg-[#475569] tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2 tw-px-6 tw-py-3 tw-rounded-none tw-font-bold tw-transition-all active:tw-scale-95 disabled:tw-opacity-50 disabled:tw-pointer-events-none"
			disabled={engine.isDispatching}
			onclick={() => engine.dispatchReportCards()}>
			{#if engine.isDispatching}
				<Loader2 class="tw-w-5 tw-h-5 tw-animate-spin" />
				<span class="tw-font-mono tw-uppercase tw-tracking-wider">Compiling...</span>
			{:else}
				<FileDown class="tw-w-5 tw-h-5" />
				<span class="tw-font-mono tw-uppercase tw-tracking-wider">Dispatch Batch</span>
			{/if}
		</button>
	</div>
</div>

<style>
	.hud-panel {
		background-color: #0f172a;
		border: 1px solid #1e293b;
		border-radius: 24px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
	}
</style>
