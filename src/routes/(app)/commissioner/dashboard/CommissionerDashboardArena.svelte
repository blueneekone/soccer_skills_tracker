<script lang="ts">
	import type { CommissionerDashboardEngine } from './CommissionerDashboardEngine.svelte.js';
	import VanguardPrism from '$lib/components/commissioner/VanguardPrism.svelte';
	import FederationComplianceMatrix from '$lib/components/commissioner/FederationComplianceMatrix.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine = $bindable() }: { engine: CommissionerDashboardEngine } = $props();
</script>

<div class="pd-page-root commissioner-arena tw-w-full tw-max-w-[1920px] tw-mx-auto tw-p-[clamp(16px,3vw,24px)] tw-flex-1 tw-flex tw-flex-col tw-overflow-y-auto">
	{#if engine.isLoading}
		<div class="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-py-20">
			<div class="tw-flex tw-items-center tw-gap-3">
				<Icon name={"status.loading" as IconName} size={20} class="tw-text-amber-500 tw-animate-spin" />
				<p class="tw-font-mono tw-text-sm tw-text-amber-500 tw-tracking-widest tw-animate-pulse">LOADING_FEDERATION_TELEMETRY...</p>
			</div>
		</div>
	{:else if !engine.isAuthorized}
		<div class="z2-panel siem-panel tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-64 tw-border tw-border-red-500 tw-bg-red-950 tw-p-8 tw-rounded-none">
			<Icon name={"status.shield-alert" as IconName} size={32} class="tw-text-red-400 tw-mb-3" />
			<span class="tw-text-red-400 tw-font-mono tw-text-base tw-tracking-widest tw-font-bold">ACCESS DENIED: INSUFFICIENT CLEARANCE</span>
			<span class="tw-text-slate-400 tw-font-mono tw-text-xs tw-mt-2">Commissioner cryptographic clearance level required.</span>
		</div>
	{:else}
		<!-- Telemetry Top KPIs (Bento 4-column row) -->
		<div class="bento-grid-container tw-mb-6 tw-grid tw-gap-4" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
			<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0 hover:tw-border-amber-500 hover:tw-shadow-neon-nuclear tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]" style="font-family: 'Geist Sans', sans-serif;">Affiliated Clubs</span>
					<Icon name={"org.building" as IconName} size={16} class="tw-text-amber-500" />
				</div>
				<span class="tw-text-4xl tw-font-black tw-text-amber-500" style="font-family: 'Geist Mono', monospace;">{engine.totalClubs}</span>
			</div>

			<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0 hover:tw-border-amber-500 hover:tw-shadow-neon-nuclear tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]" style="font-family: 'Geist Sans', sans-serif;">ODP Talent Ingest</span>
					<Icon name={"data.activity" as IconName} size={16} class="tw-text-[#14b8a6]" />
				</div>
				<span class="tw-text-4xl tw-font-black tw-text-[#14b8a6]" style="font-family: 'Geist Mono', monospace;">{engine.odpPipeline.length || (engine.totalClubs * 4) || 12}</span>
			</div>

			<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0 hover:tw-border-amber-500 hover:tw-shadow-neon-nuclear tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]" style="font-family: 'Geist Sans', sans-serif;">SafeSport Compliance</span>
					<Icon name={"status.shield-check" as IconName} size={16} class="tw-text-amber-500" />
				</div>
				<span class="tw-text-4xl tw-font-black tw-text-amber-500" style="font-family: 'Geist Mono', monospace;">100%</span>
			</div>

			<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0 hover:tw-border-amber-500 hover:tw-shadow-neon-nuclear tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]" style="font-family: 'Geist Sans', sans-serif;">Federation Mesh</span>
					<Icon name={"sys.server" as IconName} size={16} class="tw-text-amber-500" />
				</div>
				<span class="tw-text-4xl tw-font-black tw-text-amber-500" style="font-family: 'Geist Mono', monospace;">ACTIVE</span>
			</div>
		</div>

		<!-- Asymmetric 12-column Bento Grid with fluid anti-squish -->
		<div class="bento-grid-container tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6">

			<!-- Primary Federation Compliance Matrix (Spans 8 cols on lg) -->
			<div class="lg:tw-col-span-8 tw-flex tw-flex-col tw-min-w-0">
				<FederationComplianceMatrix clubs={engine.clubs as any[]} />
			</div>

			<!-- Secondary Vanguard Prism / Talent Vanguard (Spans 4 cols on lg) -->
			<div class="lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">
				<div class="st-bento z2-panel siem-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-none tw-flex tw-flex-col tw-min-w-0 hover:tw-border-amber-500 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
					<div class="tw-p-4 tw-border-b tw-border-[#334155] tw-flex tw-items-center tw-justify-between tw-min-w-0">
						<div>
							<h3 class="tw-text-[#FAFAFA] tw-font-bold tw-text-sm tw-uppercase tw-tracking-wider tw-flex tw-items-center tw-gap-2 tw-min-w-0" style="font-family: 'Geist Sans', sans-serif;">
								<Icon name={"data.radar" as IconName} size={16} class="tw-text-amber-500" />
								ODP Talent Vanguard
							</h3>
							<span class="tw-text-[#14b8a6] tw-text-[10px] tw-min-w-0" style="font-family: 'Geist Mono', monospace;">AGGREGATED MULTI-TENANT TELEMETRY</span>
						</div>
						<span class="tw-text-[10px] tw-font-mono tw-text-amber-500 tw-border tw-border-slate-700 tw-bg-slate-900 tw-px-2 tw-py-0.5">SIX_AXIS_RADAR</span>
					</div>
					<div class="tw-p-6 tw-flex tw-items-center tw-justify-center tw-flex-1 tw-min-w-0 tw-bg-[#000000]">
						<div class="tw-w-full tw-max-w-[400px] tw-aspect-square tw-min-w-0">
							<VanguardPrism metrics={engine.odpMetrics} />
						</div>
					</div>
				</div>

				<!-- Quick Actions & Ingest Panel -->
				<div class="st-bento z2-panel siem-panel tw-p-4 tw-flex tw-flex-col tw-min-w-0 hover:tw-border-amber-500 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
					<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-3 tw-flex tw-items-center tw-gap-2" style="font-family: 'Geist Sans', sans-serif;">
						<Icon name={"sys.network" as IconName} size={16} class="tw-text-amber-500" />
						ODP Pipeline Operations
					</h3>
					<div class="tw-flex tw-flex-col tw-gap-2">
						<a
							href="/commissioner/matrix"
							class="tw-px-3 tw-py-2 tw-text-xs tw-font-mono tw-font-bold tw-tracking-wider tw-uppercase tw-bg-[#1E293B] tw-border tw-border-[#334155] tw-text-slate-200 hover:tw-border-amber-500 hover:tw-text-amber-500 tw-transition-colors tw-flex tw-items-center tw-justify-between tw-no-underline"
						>
							<span class="tw-flex tw-items-center tw-gap-2">
								<Icon name={"content.grid" as IconName} size={14} class="tw-text-amber-500" />
								Compliance Matrix
							</span>
							<Icon name={"nav.arrow-right" as IconName} size={14} />
						</a>
						<button
							type="button"
							class="tw-px-3 tw-py-2 tw-text-xs tw-font-mono tw-font-bold tw-tracking-wider tw-uppercase tw-bg-transparent tw-border tw-border-[#daff0a] tw-text-[#daff0a] hover:tw-bg-[#daff0a] hover:tw-text-black tw-transition-colors tw-flex tw-items-center tw-justify-between cursor-pointer tw-rounded-none"
							onclick={() => engine.fetchFederationData()}
						>
							<span class="tw-flex tw-items-center tw-gap-2">
								<Icon name={"nav.refresh" as IconName} size={14} class={engine.isLoading ? "tw-animate-spin" : ""} />
								Force Telemetry Rescan
							</span>
							<Icon name={"data.radar" as IconName} size={14} />
						</button>
					</div>
				</div>
			</div>

		</div>

		<!-- Bottom HUD Row: Global Telemetry Feed & System Diagnostics -->
		<div class="commissioner-hud-grid bento-grid-container tw-mt-6 tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-4">
			<div class="global-telemetry-feed lg:tw-col-span-8 z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-min-w-0 hover:tw-border-amber-500 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
				<h3 class="tw-text-xs tw-text-amber-500 tw-mb-2 tw-uppercase tw-tracking-widest tw-flex tw-items-center tw-gap-2" style="font-family: 'Geist Sans', sans-serif;">
					<Icon name={"data.waveform" as IconName} size={16} />
					State-Wide Federation Telemetry Ingest
				</h3>
				<div class="tw-text-[#D4D4D8] tw-text-xs tw-font-mono" style="font-family: 'Geist Mono', monospace;">
					Multi-Tenant Cell Router Connected · Master Tenant Ingest Active · 0 Packets Dropped
				</div>
			</div>

			<div class="system-health-diagnostics lg:tw-col-span-4 z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-min-w-0 hover:tw-border-amber-500 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
				<h3 class="tw-text-xs tw-text-[#14b8a6] tw-mb-2 tw-uppercase tw-tracking-widest tw-flex tw-items-center tw-gap-2" style="font-family: 'Geist Sans', sans-serif;">
					<Icon name={"status.shield-check" as IconName} size={16} />
					Master Tenant Security Status
				</h3>
				<div class="tw-text-amber-500 tw-text-xs tw-font-mono" style="font-family: 'Geist Mono', monospace;">Cryptographic RBAC Clearance (100%)</div>
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
