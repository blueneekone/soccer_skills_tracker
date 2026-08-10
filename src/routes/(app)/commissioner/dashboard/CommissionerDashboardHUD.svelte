<script lang="ts">
	import type { CommissionerDashboardEngine } from './CommissionerDashboardEngine.svelte.js';

	let { engine = $bindable() }: { engine: CommissionerDashboardEngine } = $props();
</script>

<div class="commissioner-hud tw-bg-[#0f172a] tw-border-b tw-border-[#334155] tw-rounded-none tw-px-6 tw-py-4 tw-flex tw-items-center tw-justify-between">
	<div class="tw-flex tw-flex-col">
		<h1 class="tw-text-[#fafafa] tw-font-sans tw-font-bold tw-text-2xl tw-uppercase tw-tracking-wide">
			State-Wide Federation Command
		</h1>
		<h2 class="tw-text-[#14b8a6] tw-font-mono tw-text-sm">
			ODP Talent Pipeline & Master Tenant Overview
		</h2>
	</div>

	<div class="tw-flex tw-items-center tw-gap-8">
		<div class="tw-flex tw-flex-col tw-items-end">
			<span class="tw-text-[#334155] tw-font-sans tw-text-xs tw-uppercase tw-font-bold">Total Clubs</span>
			<span class="tw-text-[#fafafa] tw-font-mono tw-text-xl">{engine.totalClubs}</span>
		</div>

		<div class="tw-flex tw-flex-col tw-items-end">
			<span class="tw-text-[#334155] tw-font-sans tw-text-xs tw-uppercase tw-font-bold">Network Status</span>
			{#if engine.isLoading}
				<span class="tw-text-[#fbbf24] tw-font-mono tw-text-sm">SYNCING...</span>
			{:else if engine.error}
				<span class="tw-text-[#ef4444] tw-font-mono tw-text-sm">ERROR</span>
			{:else}
				<span class="tw-text-[#14b8a6] tw-font-mono tw-text-sm">SECURE</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.commissioner-hud {
		/* Strict 90-degree corners and tactical SIEM styling */
		border-radius: 0;
	}
</style>
