<script lang="ts">
	import type { CommissionerDashboardEngine } from './CommissionerDashboardEngine.svelte.js';
	import VanguardPrism from '$lib/components/commissioner/VanguardPrism.svelte';
	import FederationComplianceMatrix from '$lib/components/commissioner/FederationComplianceMatrix.svelte';

	let { engine = $bindable() }: { engine: CommissionerDashboardEngine } = $props();
</script>

<div class="commissioner-arena tw-w-full tw-h-full tw-bg-[#000000] tw-p-6 tw-overflow-y-auto">
	{#if !engine.isAuthorized && !engine.isLoading}
		<div class="tw-flex tw-items-center tw-justify-center tw-h-64 tw-border tw-border-[#ef4444] tw-bg-[#0f172a]">
			<span class="tw-text-[#ef4444] tw-font-mono tw-text-xl">ACCESS DENIED: INSUFFICIENT CLEARANCE</span>
		</div>
	{:else}
		<div class="bento-grid tw-grid tw-gap-6" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">

			<!-- Vanguard Prism Component -->
			<div class="z2-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-flex tw-flex-col">
				<div class="tw-p-4 tw-border-b tw-border-[#334155]">
					<h3 class="tw-text-[#fafafa] tw-font-sans tw-font-bold tw-text-lg">ODP Talent Vanguard</h3>
					<span class="tw-text-[#14b8a6] tw-font-mono tw-text-xs">AGGREGATED MULTI-TENANT TELEMETRY</span>
				</div>
				<div class="tw-p-6 tw-flex tw-items-center tw-justify-center tw-flex-1">
					<div class="tw-w-full tw-max-w-[400px] tw-aspect-square">
						<VanguardPrism metrics={engine.odpMetrics} />
					</div>
				</div>
			</div>

			<!-- Federation Compliance Matrix -->
			<div class="z2-panel tw-col-span-1 md:tw-col-span-2 xl:tw-col-span-3 tw-flex tw-flex-col">
				<FederationComplianceMatrix clubs={engine.clubs as any[]} />
			</div>

		</div>
	{/if}
</div>

<style>
	.commissioner-arena {
		border-radius: 0;
	}
	.z2-panel {
		border-radius: 0;
	}
</style>
