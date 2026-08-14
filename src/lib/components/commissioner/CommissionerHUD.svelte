<script lang="ts">
	/**
	 * CommissionerHUD.svelte — Command Plane Status
	 * Strict 90-degree corners, zero gamification, Nuclear Yellow & Data Cyan telemetry.
	 */
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
</script>

<header class="command-plane-system-status tw-w-full tw-bg-[#0B0F19] tw-border-b tw-border-[#1E293B] tw-p-4 tw-flex tw-items-center tw-justify-between tw-z-10 tw-rounded-none">
	<div class="tw-flex tw-items-center tw-gap-4">
		<div class="tw-w-10 tw-h-10 tw-bg-[#1E293B] tw-rounded-none tw-flex tw-items-center tw-justify-center tw-border tw-border-[#334155] tw-text-nuclear-yellow">
			<Icon name={"sys.server" as IconName} size={20} />
		</div>
		<div>
			<h1 class="tw-text-[#FAFAFA] tw-font-sans tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-sm tw-m-0 tw-flex tw-items-center tw-gap-2">
				Federation Command
				<span class="tw-text-[9px] tw-px-1.5 tw-py-0.5 tw-font-mono tw-border tw-border-slate-700 tw-bg-slate-900 tw-text-nuclear-yellow tw-rounded-none">COMMISSIONER-OS</span>
			</h1>
			<p class="tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-m-0 tw-mt-0.5">
				STATUS: <span class="tw-text-nuclear-yellow tw-font-bold">ODP ONLINE</span> // MASTER TENANT ACTIVE
			</p>
		</div>
	</div>

	<div class="tw-flex tw-items-center tw-gap-6 tw-font-mono tw-text-xs">
		<div class="tw-flex tw-flex-col tw-text-right">
			<span class="tw-uppercase tw-tracking-widest tw-text-slate-400">Network Safety</span>
			<span class="tw-text-nuclear-yellow tw-font-bold tw-flex tw-items-center tw-gap-1 tw-justify-end">
				<Icon name={"status.shield-check" as IconName} size={12} />
				SECURE
			</span>
		</div>
		<div class="tw-w-px tw-h-8 tw-bg-[#1E293B]"></div>
		<div class="tw-flex tw-flex-col tw-text-right">
			<span class="tw-uppercase tw-tracking-widest tw-text-slate-400">Nodes</span>
			<span class="tw-text-white tw-font-bold">1,024 ACTIVE</span>
		</div>
	</div>
</header>

