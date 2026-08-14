<script lang="ts">
	import type AdminDashboardEngine from './AdminDashboardEngine.svelte.ts';

	let { engine }: { engine: AdminDashboardEngine } = $props();

	// The Glass: Renders the high-density multi-tenant resource matrix and system-level tables.
	// Constraints:
	// - Must inject the .pd-page-root class selector on the outermost wrapper.
	// - Grid Math: Enforce the asymmetric 12-column Bento Grid utilizing fluid anti-squish layout configuration.
</script>

<div class="pd-page-root tw-w-full tw-max-w-[1920px] tw-mx-auto tw-p-[clamp(16px,3vw,24px)] tw-flex-1 tw-flex tw-flex-col">

	{#if engine.isLoading}
		<div class="tw-flex-1 tw-flex tw-items-center tw-justify-center">
			<p class="tw-font-mono tw-text-sm tw-text-[#94A3B8] tw-tracking-widest tw-animate-pulse">LOADING_TELEMETRY...</p>
		</div>
	{:else if engine.error}
		<div class="z2-panel siem-panel siem-warning tw-p-[clamp(16px,3vw,24px)]">
			<h2 class="tw-text-red-500 tw-font-bold tw-uppercase tw-tracking-widest tw-text-sm tw-mb-2">System Error</h2>
			<p class="tw-font-mono tw-text-xs tw-text-[#94A3B8]">{engine.error}</p>
		</div>
	{:else}

		{#if engine.activeTab === 'overview'}
			<!-- Telemetry Tiles -->
			<div class="bento-grid-container tw-mb-6 tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4">
				<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0" style="background: #0f172a; border: 1px solid #334155;">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-2" style="font-family: 'Geist Sans', sans-serif;">Total Organizations</span>
					<span class="tw-text-4xl tw-font-black tw-text-[#FAFAFA]" style="font-family: 'Geist Mono', monospace;">{engine.clubsCount}</span>
				</div>
				<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0" style="background: #0f172a; border: 1px solid #334155;">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-2" style="font-family: 'Geist Sans', sans-serif;">Total Users</span>
					<span class="tw-text-4xl tw-font-black tw-text-[#FAFAFA]" style="font-family: 'Geist Mono', monospace;">{engine.usersCount}</span>
				</div>
				<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0" style="background: #0f172a; border: 1px solid #334155;">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-2" style="font-family: 'Geist Sans', sans-serif;">Active Incidents</span>
					<span class="tw-text-4xl tw-font-black" class:tw-text-[#ef4444]={engine.activeIncidents > 0} class:tw-text-[#14b8a6]={engine.activeIncidents === 0} style="font-family: 'Geist Mono', monospace;">{engine.activeIncidents}</span>
				</div>
				<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0" style="background: #0f172a; border: 1px solid #334155;">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA] tw-mb-2" style="font-family: 'Geist Sans', sans-serif;">System Status</span>
					<span class="tw-text-4xl tw-font-black tw-text-[#14b8a6]" style="font-family: 'Geist Mono', monospace;">NOMINAL</span>
				</div>
			</div>

			<!-- Asymmetric 12-column Bento Grid with fluid anti-squish -->
			<div class="bento-grid-container tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-4">

				<!-- Main Chart Area (Spans 8 cols on xl) -->
				<div class="lg:tw-col-span-8 z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-min-h-[400px] tw-flex tw-flex-col tw-min-w-0" style="background: #0f172a; border: 1px solid #334155;">
					<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6" style="font-family: 'Geist Sans', sans-serif;">Global Activity Matrix</h3>
					<div class="tw-flex-1 z1-well tw-flex tw-items-center tw-justify-center tw-min-w-0" style="background: #000000; border: 1px solid #334155;">
						<span class="tw-text-xs tw-text-[#A1A1AA] tw-tracking-widest" style="font-family: 'Geist Mono', monospace;">[VISUALIZATION_PENDING]</span>
					</div>
				</div>

				<!-- Secondary Details (Spans 4 cols on xl) -->
				<div class="lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">

					<div class="tw-flex-1 z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-flex tw-flex-col tw-min-w-0" style="background: #0f172a; border: 1px solid #334155;">
						<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6" style="font-family: 'Geist Sans', sans-serif;">Recent Org Registrations</h3>
						<div class="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-min-w-0" style="background: #000000; border: 1px solid #334155;">
							<span class="tw-text-xs tw-text-[#A1A1AA] tw-tracking-widest" style="font-family: 'Geist Mono', monospace;">NO_DATA</span>
						</div>
					</div>

				</div>
			</div>

			<div class="admin-hud-grid bento-grid-container tw-mt-6 tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-4">
				<!-- Global Telemetry Feed -->
				<div class="global-telemetry-feed lg:tw-col-span-8 z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-min-w-0" style="background: #0f172a; border: 1px solid #334155;">
					<h3 class="tw-text-xs tw-text-[#14b8a6] tw-mb-2 tw-uppercase tw-tracking-widest" style="font-family: 'Geist Sans', sans-serif;">Global Telemetry Feed</h3>
					<div class="tw-text-[#D4D4D8] tw-text-xs" style="font-family: 'Switzer', sans-serif;">Stream Offline</div>
				</div>

				<!-- System Health Diagnostics -->
				<div class="system-health-diagnostics lg:tw-col-span-4 z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-min-w-0" style="background: #0f172a; border: 1px solid #334155;">
					<h3 class="tw-text-xs tw-text-[#14b8a6] tw-mb-2 tw-uppercase tw-tracking-widest" style="font-family: 'Geist Sans', sans-serif;">System Health Diagnostics</h3>
					<div class="tw-text-[#D4D4D8] tw-text-xs" style="font-family: 'Switzer', sans-serif;">All Systems Nominal</div>
				</div>
			</div>
		{/if}

		{#if engine.activeTab === 'security'}
			<div class="z2-panel siem-panel tw-p-[clamp(16px,3vw,24px)]">
				<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6">Security Operations Center</h3>
				<p class="tw-font-mono tw-text-sm tw-text-[#94A3B8]">Security matrix initialized.</p>
			</div>
		{/if}

		{#if engine.activeTab === 'platform'}
			<div class="z2-panel siem-panel tw-p-[clamp(16px,3vw,24px)]">
				<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6">Platform Controls</h3>

				<div class="tw-mt-4 tw-p-4 z1-well tw-flex tw-items-center tw-justify-between">
					<div>
						<h4 class="tw-text-sm tw-font-bold tw-text-[#FAFAFA]">Infrastructure Override</h4>
						<p class="tw-text-xs tw-text-[#94A3B8] tw-mt-1">Eject non-admin users and block new sessions.</p>
					</div>
					<button
						class="tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-border tw-transition-colors"
						class:tw-bg-red-500={engine.maintenanceMode}
						class:tw-text-white={engine.maintenanceMode}
						class:tw-border-red-600={engine.maintenanceMode}
						class:tw-bg-transparent={!engine.maintenanceMode}
						class:tw-text-red-500={!engine.maintenanceMode}
						class:tw-border-red-500={!engine.maintenanceMode}
						class:hover:tw-bg-red-950={!engine.maintenanceMode}
						onclick={() => engine.toggleMaintenanceMode()}
					>
						{engine.maintenanceMode ? 'ENGAGED' : 'ENGAGE LOCKDOWN'}
					</button>
				</div>
			</div>
		{/if}

	{/if}

</div>
