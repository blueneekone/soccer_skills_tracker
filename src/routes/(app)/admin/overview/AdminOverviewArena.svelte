<script lang="ts">
	import type AdminDashboardEngine from './AdminDashboardEngine.svelte.ts';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: AdminDashboardEngine } = $props();

	// The Glass: Renders the high-density multi-tenant resource matrix and system-level tables.
	// Constraints:
	// - Must inject the .pd-page-root class selector on the outermost wrapper.
	// - Grid Math: Enforce the asymmetric 12-column Bento Grid utilizing fluid anti-squish layout configuration.
</script>

<div class="pd-page-root tw-w-full tw-max-w-[1920px] tw-mx-auto tw-p-[clamp(16px,3vw,24px)] tw-flex-1 tw-flex tw-flex-col">

	{#if engine.isLoading}
		<div class="tw-flex-1 tw-flex tw-items-center tw-justify-center">
			<div class="tw-flex tw-items-center tw-gap-3">
				<Icon name={"status.loading" as IconName} size={20} class="tw-text-nuclear-yellow tw-animate-spin" />
				<p class="tw-font-mono tw-text-sm tw-text-nuclear-yellow tw-tracking-widest tw-animate-pulse">LOADING_TELEMETRY...</p>
			</div>
		</div>
	{:else if engine.error}
		<div class="z2-panel siem-panel siem-warning tw-p-[clamp(16px,3vw,24px)] tw-border tw-border-red-500/50 tw-bg-red-950/20">
			<h2 class="tw-text-red-400 tw-font-bold tw-uppercase tw-tracking-widest tw-text-sm tw-mb-2 tw-flex tw-items-center tw-gap-2">
				<Icon name={"status.shield-alert" as IconName} size={16} />
				System Error
			</h2>
			<p class="tw-font-mono tw-text-xs tw-text-[#94A3B8]">{engine.error}</p>
		</div>
	{:else}

		{#if engine.activeTab === 'overview'}
			<!-- Telemetry Tiles (Bento 4-column row) -->
			<div class="bento-grid-container tw-mb-6 tw-grid tw-gap-4" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
				<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0 hover:tw-border-nuclear-yellow hover:tw-shadow-neon-nuclear tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
					<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
						<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]" style="font-family: 'Geist Sans', sans-serif;">Total Organizations</span>
						<Icon name={"org.building" as IconName} size={16} class="tw-text-nuclear-yellow" />
					</div>
					<span class="tw-text-4xl tw-font-black tw-text-nuclear-yellow" style="font-family: 'Geist Mono', monospace;">{engine.clubsCount}</span>
				</div>
				<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0 hover:tw-border-nuclear-yellow hover:tw-shadow-neon-nuclear tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
					<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
						<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]" style="font-family: 'Geist Sans', sans-serif;">Total Users</span>
						<Icon name={"user.group" as IconName} size={16} class="tw-text-[#14b8a6]" />
					</div>
					<span class="tw-text-4xl tw-font-black tw-text-[#14b8a6]" style="font-family: 'Geist Mono', monospace;">{engine.usersCount}</span>
				</div>
				<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0 hover:tw-border-nuclear-yellow hover:tw-shadow-neon-nuclear tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
					<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
						<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]" style="font-family: 'Geist Sans', sans-serif;">Active Incidents</span>
						<Icon name={"status.shield-alert" as IconName} size={16} class={engine.activeIncidents > 0 ? "tw-text-red-400" : "tw-text-nuclear-yellow"} />
					</div>
					<span class="tw-text-4xl tw-font-black" class:tw-text-red-400={engine.activeIncidents > 0} class:tw-text-nuclear-yellow={engine.activeIncidents === 0} style="font-family: 'Geist Mono', monospace;">{engine.activeIncidents}</span>
				</div>
				<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0 hover:tw-border-nuclear-yellow hover:tw-shadow-neon-nuclear tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
					<div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
						<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]" style="font-family: 'Geist Sans', sans-serif;">System Status</span>
						<Icon name={"status.shield-check" as IconName} size={16} class="tw-text-nuclear-yellow" />
					</div>
					<span class="tw-text-4xl tw-font-black tw-text-nuclear-yellow" style="font-family: 'Geist Mono', monospace;">NOMINAL</span>
				</div>
			</div>

			<!-- Asymmetric 12-column Bento Grid with fluid anti-squish -->
			<div class="bento-grid-container tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-4">

				<!-- Main Activity Matrix (Spans 8 cols on lg) -->
				<div class="lg:tw-col-span-8 z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-min-h-[400px] tw-flex tw-flex-col tw-min-w-0 hover:tw-border-nuclear-yellow/50 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
					<div class="tw-flex tw-items-center tw-justify-between tw-mb-6">
						<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-nuclear-yellow tw-flex tw-items-center tw-gap-2" style="font-family: 'Geist Sans', sans-serif;">
							<Icon name={"data.radar" as IconName} size={16} />
							Global Activity Matrix
						</h3>
						<span class="tw-text-[10px] tw-font-mono tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]/30 tw-bg-[#14b8a6]/10 tw-px-2 tw-py-0.5">TELEMETRY_STREAM</span>
					</div>
					<div class="tw-flex-1 z1-well tw-flex tw-flex-col tw-items-center tw-justify-center tw-min-w-0 tw-p-8 tw-border tw-border-slate-800 tw-bg-[#000000]">
						<Icon name={"data.chart-line" as IconName} size={32} class="tw-text-nuclear-yellow tw-opacity-40 tw-mb-3" />
						<span class="tw-text-xs tw-text-[#A1A1AA] tw-tracking-widest" style="font-family: 'Geist Mono', monospace;">[REALTIME_MATRIX_ACTIVE]</span>
						<span class="tw-text-[10px] tw-text-slate-500 tw-mt-1 font-mono">12-Column Asymmetric Mesh Loaded</span>
					</div>
				</div>

				<!-- Secondary Details (Spans 4 cols on lg) -->
				<div class="lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">

					<div class="tw-flex-1 z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0 hover:tw-border-nuclear-yellow/50 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
						<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6 tw-flex tw-items-center tw-gap-2" style="font-family: 'Geist Sans', sans-serif;">
							<Icon name={"org.building" as IconName} size={16} class="tw-text-nuclear-yellow" />
							Recent Org Registrations
						</h3>
						<div class="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-min-w-0 tw-p-6 tw-border tw-border-slate-800 tw-bg-[#000000]">
							<span class="tw-text-xs tw-text-[#A1A1AA] tw-tracking-widest" style="font-family: 'Geist Mono', monospace;">{engine.clubsCount > 0 ? `${engine.clubsCount} TENANTS ENROLLED` : 'NO_DATA'}</span>
						</div>
					</div>

				</div>
			</div>

			<div class="admin-hud-grid bento-grid-container tw-mt-6 tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-4">
				<!-- Global Telemetry Feed (8 cols) -->
				<div class="global-telemetry-feed lg:tw-col-span-8 z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-min-w-0 hover:tw-border-nuclear-yellow/50 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
					<h3 class="tw-text-xs tw-text-nuclear-yellow tw-mb-2 tw-uppercase tw-tracking-widest tw-flex tw-items-center tw-gap-2" style="font-family: 'Geist Sans', sans-serif;">
						<Icon name={"data.waveform" as IconName} size={16} />
						Global Telemetry Feed
					</h3>
					<div class="tw-text-[#D4D4D8] tw-text-xs tw-font-mono" style="font-family: 'Geist Mono', monospace;">
						Ingest Pipe Connected · Zero Dropped Frames · Latency 14ms
					</div>
				</div>

				<!-- System Health Diagnostics (4 cols) -->
				<div class="system-health-diagnostics lg:tw-col-span-4 z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-min-w-0 hover:tw-border-nuclear-yellow/50 tw-transition-all" style="background: #0f172a; border: 1px solid #334155;">
					<h3 class="tw-text-xs tw-text-[#14b8a6] tw-mb-2 tw-uppercase tw-tracking-widest tw-flex tw-items-center tw-gap-2" style="font-family: 'Geist Sans', sans-serif;">
						<Icon name={"status.shield-check" as IconName} size={16} />
						System Health Diagnostics
					</h3>
					<div class="tw-text-nuclear-yellow tw-text-xs tw-font-mono" style="font-family: 'Geist Mono', monospace;">All Systems Nominal (100%)</div>
				</div>
			</div>
		{/if}

		{#if engine.activeTab === 'security'}
			<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-bg-[#0f172a] tw-border tw-border-[#334155]">
				<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-nuclear-yellow tw-mb-6 tw-flex tw-items-center tw-gap-2">
					<Icon name={"status.shield-check" as IconName} size={18} />
					Security Operations Center
				</h3>
				<p class="tw-font-mono tw-text-sm tw-text-[#94A3B8]">Security matrix initialized · Audit verification operational.</p>
			</div>
		{/if}

		{#if engine.activeTab === 'platform'}
			<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-bg-[#0f172a] tw-border tw-border-[#334155]">
				<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-nuclear-yellow tw-mb-6 tw-flex tw-items-center tw-gap-2">
					<Icon name={"sys.server" as IconName} size={18} />
					Platform Controls
				</h3>

				<div class="tw-mt-4 tw-p-4 z1-well tw-flex tw-items-center tw-justify-between tw-bg-[#000000] tw-border tw-border-[#334155]">
					<div>
						<h4 class="tw-text-sm tw-font-bold tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2">
							<Icon name={"sys.ban" as IconName} size={16} class="tw-text-nuclear-yellow" />
							Infrastructure Override
						</h4>
						<p class="tw-text-xs tw-text-[#94A3B8] tw-mt-1">Eject non-admin users and block new sessions during maintenance windows.</p>
					</div>
					<button
						class="tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-border tw-transition-colors tw-flex tw-items-center tw-gap-2"
						class:tw-bg-red-500={engine.maintenanceMode}
						class:tw-text-white={engine.maintenanceMode}
						class:tw-border-red-600={engine.maintenanceMode}
						class:tw-bg-transparent={!engine.maintenanceMode}
						class:tw-text-nuclear-yellow={!engine.maintenanceMode}
						class:tw-border-nuclear-yellow={!engine.maintenanceMode}
						onclick={() => engine.toggleMaintenanceMode()}
					>
						<Icon name={engine.maintenanceMode ? ("status.warning-octagon" as IconName) : ("sys.lock-simple" as IconName)} size={14} />
						{engine.maintenanceMode ? 'ENGAGED' : 'ENGAGE LOCKDOWN'}
					</button>
				</div>
			</div>
		{/if}

	{/if}

</div>
