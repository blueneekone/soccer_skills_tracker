<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import LightningRadar from './LightningRadar.svelte';
	import ForecastPanel from './ForecastPanel.svelte';
	let { isOpen, onClose }: { isOpen: boolean; onClose: () => void } = $props();
	let lockout = $state(false);
</script>

{#if isOpen}
	<div class="tw-fixed tw-inset-0 tw-z-[999] tw-flex tw-items-center tw-justify-center tw-bg-black/80 tw-backdrop-blur-sm tw-p-4">
		<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-rounded-none tw-w-full tw-max-w-4xl tw-max-h-[90vh] tw-overflow-y-auto tw-font-mono tw-text-white tw-shadow-2xl">
			<div class="tw-flex tw-justify-between tw-items-center tw-p-4 tw-border-b tw-border-[#334155]">
				<h2 class="tw-text-lg tw-font-bold tw-text-[#14b8a6]">AEGIS WEATHER MONITORING</h2>
				<button onclick={onClose} class="tw-text-gray-400 hover:tw-text-white" aria-label="Close"><Icon name="sys.close" size={24} /></button>
			</div>

			<div class="tw-p-4">
				{#if lockout}
					<div class="tw-bg-red-600/20 tw-border tw-border-red-600 tw-text-red-500 tw-p-3 tw-text-center tw-font-bold tw-text-sm">[ ADVISORY STATUS // LOCKOUT ACTIVE: IMMEDIATELY CLEAR FIELDS ]</div>
				{:else}
					<div class="tw-bg-[#14b8a6]/20 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-p-3 tw-text-center tw-font-bold tw-text-sm">[ ADVISORY STATUS // SAFE TO PLAY ]</div>
				{/if}
			</div>

			<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6 tw-p-4">
				<div class="tw-flex tw-flex-col tw-gap-4">
					<div class="tw-border tw-border-[#334155] tw-p-4">
						<h3 class="tw-text-[#14b8a6] tw-text-xs tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-2">PROXIMITY RADAR</h3>
						<LightningRadar bind:weatherLockout={lockout} />
					</div>
				</div>

				<div class="tw-flex tw-flex-col tw-gap-4">
					<div class="tw-border tw-border-[#334155] tw-p-4">
						<h3 class="tw-text-[#14b8a6] tw-text-xs tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-2">OUTDOOR SAFETY TELEMETRY</h3>
						<div class="tw-grid tw-grid-cols-2 tw-gap-4 tw-text-center">
							<div class="tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-p-2"><div class="tw-text-[10px] tw-text-gray-400">WBGT</div><div class="tw-text-xl tw-font-bold">78°</div></div>
							<div class="tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-p-2"><div class="tw-text-[10px] tw-text-gray-400">UV INDEX</div><div class="tw-text-xl tw-font-bold">6</div></div>
							<div class="tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-p-2"><div class="tw-text-[10px] tw-text-gray-400">WIND</div><div class="tw-text-xl tw-font-bold">12 <span class="tw-text-xs">MPH NE</span></div></div>
							<div class="tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-p-2"><div class="tw-text-[10px] tw-text-gray-400">HUMIDITY</div><div class="tw-text-xl tw-font-bold">45%</div></div>
						</div>
					</div>
					<ForecastPanel />
				</div>
			</div>
		</div>
	</div>
{/if}
