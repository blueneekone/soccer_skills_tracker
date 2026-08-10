<script lang="ts">
	/**
	 * CommissionerDashboardArena.svelte — The Glass
	 * High-Density Data UI mapping out Federation Compliance and the ODP Talent Prism.
	 * 12-column asymmetric Bento Grid using fluid anti-squish math.
	 * Strict 90-degree corners, Geist Mono typography, zero gamification.
	 */
	import FederationComplianceMatrix from '$lib/components/commissioner/FederationComplianceMatrix.svelte';
	import VanguardPrism from '$lib/components/commissioner/VanguardPrism.svelte';

	interface Props {
		engine: any;
	}

	let { engine = $bindable() }: Props = $props();
</script>

<div data-panel="odp-matrix" class="tenant-matrix-grid tw-w-full tw-h-full tw-p-6 tw-overflow-y-auto tw-bg-[#000000]">

	<!-- 12-Column Asymmetric Bento Grid Math -->
	<div
		class="bento-grid-container tw-grid tw-gap-6 tw-w-full"
		style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"
	>
		<!-- Federation Matrix Column -->
		<div class="tw-h-[600px] tw-flex tw-flex-col tw-rounded-none">
			{#await engine.loadFederationCompliance()}
				<FederationComplianceMatrix complianceData={[]} isLoading={true} />
			{:then _}
				<FederationComplianceMatrix complianceData={engine.complianceData} />
			{/await}
		</div>

		<!-- ODP Talent Vanguard Prism Column -->
		<section class="z2-panel siem-panel tw-flex tw-flex-col tw-h-[600px] tw-rounded-none tw-bg-[#0f172a] tw-border tw-border-[#334155]">
			<header class="tw-border-b tw-border-[#334155] tw-p-4">
				<h2 class="tw-font-geist-sans tw-text-white tw-uppercase tw-tracking-widest tw-text-sm tw-m-0">
					ODP Vanguard Prism
				</h2>
				<p class="tw-font-geist-mono tw-text-[#334155] tw-text-xs tw-uppercase tw-m-0 tw-mt-1">
					6-Axis Physical Telemetry Matrix
				</p>
			</header>

			<div class="tw-flex-1 tw-relative tw-p-6 tw-overflow-hidden">
				{#if engine.odpPipeline.length > 0}
					<VanguardPrism
						sixAxis={engine.odpPipeline[0].sixAxis}
						playerLabel={engine.odpPipeline[0].name}
					/>
				{:else}
					<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-font-geist-mono tw-text-[#334155] tw-text-sm">
						NO ODP TELEMETRY SIGNAL
					</div>
				{/if}
			</div>
		</section>

	</div>
</div>
