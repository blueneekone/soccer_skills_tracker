<script lang="ts">
	import type AdminDashboardEngine from './AdminDashboardEngine.svelte.ts';

	let { engine }: { engine: AdminDashboardEngine } = $props();

	// The Glass: Renders the high-density multi-tenant resource matrix and system-level tables.
	// Constraints:
	// - Must inject the .tenant-matrix-grid class selector on the outermost wrapper.
	// - Grid Math: Enforce the asymmetric 12-column Bento Grid utilizing fluid anti-squish layout configuration.
</script>

<div class="tenant-matrix-grid tw-w-full tw-max-w-[1920px] tw-mx-auto tw-p-6 tw-flex-1 tw-flex tw-flex-col">

	{#if engine.isLoading}
		<div class="tw-flex-1 tw-flex tw-items-center tw-justify-center">
			<p class="tw-font-mono tw-text-sm tw-text-[#94A3B8] tw-tracking-widest tw-animate-pulse">LOADING_TELEMETRY...</p>
		</div>
	{:else if engine.error}
		<div class="tw-bg-[#0B0F19] tw-border tw-border-red-900/50 tw-p-6 tw-rounded-none">
			<h2 class="tw-text-red-500 tw-font-bold tw-uppercase tw-tracking-widest tw-text-sm tw-mb-2">System Error</h2>
			<p class="tw-font-mono tw-text-xs tw-text-[#94A3B8]">{engine.error}</p>
		</div>
	{:else}

		{#if engine.activeTab === 'overview'}
			<!-- Telemetry Tiles -->
			<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-6 tw-mb-6">
				<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6 tw-flex tw-flex-col">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#94A3B8] tw-mb-2">Total Organizations</span>
					<span class="tw-font-mono tw-text-4xl tw-font-black tw-text-[#FAFAFA]">{engine.clubsCount}</span>
				</div>
				<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6 tw-flex tw-flex-col">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#94A3B8] tw-mb-2">Total Users</span>
					<span class="tw-font-mono tw-text-4xl tw-font-black tw-text-[#FAFAFA]">{engine.usersCount}</span>
				</div>
				<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6 tw-flex tw-flex-col">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#94A3B8] tw-mb-2">Active Incidents</span>
					<span class="tw-font-mono tw-text-4xl tw-font-black" class:tw-text-[#ef4444]={engine.activeIncidents > 0} class:tw-text-[#14b8a6]={engine.activeIncidents === 0}>{engine.activeIncidents}</span>
				</div>
				<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6 tw-flex tw-flex-col">
					<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#94A3B8] tw-mb-2">System Status</span>
					<span class="tw-font-mono tw-text-4xl tw-font-black tw-text-[#14b8a6]">NOMINAL</span>
				</div>
			</div>

			<!-- Asymmetric 12-column Bento Grid with fluid anti-squish -->
			<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">

				<!-- Main Chart Area (Spans 8 cols on xl) -->
				<div class="tw-col-span-1 xl:tw-col-span-8 tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6 tw-min-h-[400px] tw-flex tw-flex-col">
					<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6">Global Activity Matrix</h3>
					<div class="tw-flex-1 tw-border tw-border-dashed tw-border-[#1E293B] tw-flex tw-items-center tw-justify-center tw-bg-[#020617]">
						<span class="tw-font-mono tw-text-xs tw-text-[#334155] tw-tracking-widest">[VISUALIZATION_PENDING]</span>
					</div>
				</div>

				<!-- Secondary Details (Spans 4 cols on xl) -->
				<div class="tw-col-span-1 xl:tw-col-span-4 tw-flex tw-flex-col tw-gap-6">

					<div class="tw-flex-1 tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6 tw-flex tw-flex-col">
						<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6">Recent Org Registrations</h3>
						<div class="tw-flex-1 tw-flex tw-items-center tw-justify-center">
							<span class="tw-font-mono tw-text-xs tw-text-[#334155] tw-tracking-widest">NO_DATA</span>
						</div>
					</div>

				</div>

			</div>
		{/if}

		{#if engine.activeTab === 'security'}
			<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6">
				<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6">Security Operations Center</h3>
				<p class="tw-font-mono tw-text-sm tw-text-[#94A3B8]">Security matrix initialized.</p>
			</div>
		{/if}

		{#if engine.activeTab === 'platform'}
			<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-none tw-p-6">
				<h3 class="tw-text-xs tw-font-bold tw-uppercase tw-font-sans tw-tracking-widest tw-text-[#FAFAFA] tw-mb-6">Platform Controls</h3>

				<div class="tw-mt-4 tw-p-4 tw-border tw-border-[#1E293B] tw-bg-[#020617] tw-flex tw-items-center tw-justify-between">
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
