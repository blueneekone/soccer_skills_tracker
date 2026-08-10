<script lang="ts">
	/**
	 * CommissionerDashboardHUD.svelte — Command Plane Status
	 * Strict 90-degree corners, zero gamification, Data Cyan telemetry.
	 */
</script>

<header class="command-plane-system-status tw-w-full tw-bg-[#0f172a] tw-border-b tw-border-[#334155] tw-p-4 tw-flex tw-items-center tw-justify-between tw-z-10 tw-rounded-none">
	<div class="tw-flex tw-items-center tw-gap-4 tw-rounded-none">
		<div class="tw-w-8 tw-h-8 tw-bg-[#14b8a6] tw-rounded-none tw-flex tw-items-center tw-justify-center tw-text-[#000000] tw-font-bold tw-font-geist-sans tw-uppercase tw-tracking-widest tw-text-xs">
			FED
		</div>
		<div>
			<h1 class="tw-text-white tw-font-geist-sans tw-uppercase tw-tracking-widest tw-text-sm tw-m-0">Federation Command</h1>
			<p class="tw-text-[#14b8a6] tw-font-geist-mono tw-text-xs tw-m-0">STATUS: ODP ONLINE // MASTER TENANT ACTIVE</p>
		</div>
	</div>

	<div class="tw-flex tw-items-center tw-gap-6 tw-font-geist-mono tw-text-xs tw-text-[#334155] tw-rounded-none">
		<div class="tw-flex tw-flex-col tw-text-right tw-rounded-none">
			<span class="tw-uppercase tw-tracking-widest">Network Safety</span>
			<span class="tw-text-[#14b8a6]">SECURE</span>
		</div>
		<div class="tw-w-px tw-h-8 tw-bg-[#334155]"></div>
		<div class="tw-flex tw-flex-col tw-text-right tw-rounded-none">
			<span class="tw-uppercase tw-tracking-widest">Nodes</span>
			<span class="tw-text-white">1,024 ACTIVE</span>
		</div>
	</div>
</header>
