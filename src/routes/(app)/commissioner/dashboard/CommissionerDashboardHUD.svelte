<script lang="ts">
	import type { CommissionerDashboardEngine } from './CommissionerDashboardEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine = $bindable() }: { engine: CommissionerDashboardEngine } = $props();
</script>

<header class="command-plane-system-status commissioner-hud tw-w-full tw-bg-[#0B0F19] tw-border-b tw-border-[#1E293B] tw-rounded-none tw-px-6 tw-py-4">
	<div class="tw-max-w-[1920px] tw-mx-auto tw-flex tw-flex-col md:tw-flex-row md:tw-items-center tw-justify-between tw-gap-4">
		<div class="tw-flex tw-items-center tw-gap-4">
			<div class="tw-w-10 tw-h-10 tw-bg-[#1E293B] tw-rounded-none tw-flex tw-items-center tw-justify-center tw-border tw-border-[#334155] tw-text-amber-500">
				<Icon name={"sys.server" as IconName} size={20} />
			</div>
			<div>
				<h1 class="tw-text-sm tw-font-bold tw-font-sans tw-tracking-[0.2em] tw-uppercase tw-text-[#FAFAFA] tw-flex tw-items-center tw-gap-2 tw-m-0">
					State-Wide Federation Command
					<span class="tw-text-[9px] tw-px-1.5 tw-py-0.5 tw-font-mono tw-border tw-border-slate-700 tw-bg-slate-900 tw-text-amber-500 tw-rounded-none">COMMISSIONER-OS</span>
				</h1>
				<h2 class="tw-text-[10px] tw-font-mono tw-text-[#14b8a6] tw-tracking-widest tw-m-0 tw-mt-1">
					ODP TALENT PIPELINE // MASTER TENANT ACTIVE
				</h2>
			</div>
		</div>

		<div class="tw-flex tw-items-center tw-gap-6 tw-font-mono">
			<div class="tw-flex tw-flex-col tw-items-end">
				<span class="tw-text-[10px] tw-font-sans tw-text-slate-400 tw-uppercase tw-font-bold tw-tracking-widest">Total Clubs</span>
				<span class="tw-text-amber-500 tw-font-mono tw-text-xl tw-font-black">{engine.totalClubs}</span>
			</div>

			<div class="tw-w-px tw-h-8 tw-bg-[#1E293B]"></div>

			<div class="tw-flex tw-flex-col tw-items-end">
				<span class="tw-text-[10px] tw-font-sans tw-text-slate-400 tw-uppercase tw-font-bold tw-tracking-widest">Network Status</span>
				{#if engine.isLoading}
					<span class="tw-text-[#daff0a] tw-font-mono tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-1">
						<Icon name={"status.loading" as IconName} size={12} class="tw-animate-spin" />
						SYNCING...
					</span>
				{:else if engine.error}
					<span class="tw-text-red-400 tw-font-mono tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-1">
						<Icon name={"status.shield-alert" as IconName} size={12} />
						ERROR
					</span>
				{:else}
					<span class="tw-text-amber-500 tw-font-mono tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-1">
						<Icon name={"status.shield-check" as IconName} size={12} />
						SECURE
					</span>
				{/if}
			</div>

			<div class="tw-w-px tw-h-8 tw-bg-[#1E293B]"></div>

			<button
				type="button"
				class="tw-px-3 tw-py-1.5 tw-text-xs tw-font-mono tw-font-bold tw-tracking-widest tw-uppercase tw-rounded-none tw-border tw-border-[#daff0a] tw-bg-[#1E293B] tw-text-[#daff0a] hover:tw-bg-[#daff0a] hover:tw-text-black tw-transition-colors tw-flex tw-items-center tw-gap-2 cursor-pointer"
				onclick={() => engine.fetchFederationData()}
				title="Refresh Federation Telemetry"
			>
				<Icon name={"nav.refresh" as IconName} size={14} class={engine.isLoading ? "tw-animate-spin" : ""} />
				Sync
			</button>
		</div>
	</div>
</header>

<style>
	.commissioner-hud {
		/* Strict 90-degree corners and tactical SIEM styling */
		border-radius: 0;
	}
</style>
