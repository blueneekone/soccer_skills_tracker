<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { portal } from '$lib/actions/portal.js';
	import LightningRadar from './LightningRadar.svelte';
	import ForecastPanel from './ForecastPanel.svelte';
	let { isOpen, onClose, fieldLat = 41.633, fieldLng = -111.851 }: { isOpen: boolean; onClose: () => void; fieldLat?: number; fieldLng?: number } = $props();
	let lockout = $state(false);
</script>

{#if isOpen}
	<div class="tw-fixed tw-inset-0 tw-z-[10005] tw-flex tw-items-center tw-justify-center tw-bg-black/85 tw-backdrop-blur-md tw-p-3 sm:tw-p-6" use:portal>
		<div class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-xl tw-w-full tw-max-w-6xl tw-h-full tw-max-h-[92vh] tw-flex tw-flex-col tw-font-mono tw-text-white tw-shadow-[0_0_50px_rgba(0,0,0,0.9)] tw-overflow-hidden">
			<!-- Header -->
			<div class="tw-flex tw-justify-between tw-items-center tw-p-3 sm:tw-p-4 tw-border-b tw-border-[#334155] tw-shrink-0">
				<h2 class="tw-text-base sm:tw-text-lg tw-font-bold tw-text-[#14b8a6]">AEGIS WEATHER MONITORING</h2>
				<button onclick={onClose} class="tw-text-gray-400 hover:tw-text-white" aria-label="Close"><Icon name="sys.close" size={24} /></button>
			</div>

			<!-- Status Bar -->
			<div class="tw-p-2 sm:tw-p-4 tw-shrink-0">
				{#if lockout}
					<div class="tw-bg-red-600/20 tw-border tw-border-red-600 tw-text-red-500 tw-p-2 sm:tw-p-3 tw-text-center tw-font-bold tw-text-xs sm:tw-text-sm">[ ADVISORY STATUS // LOCKOUT ACTIVE: IMMEDIATELY CLEAR FIELDS ]</div>
				{:else}
					<div class="tw-bg-[#14b8a6]/20 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-p-2 sm:tw-p-3 tw-text-center tw-font-bold tw-text-xs sm:tw-text-sm">[ ADVISORY STATUS // SAFE TO PLAY ]</div>
				{/if}
			</div>

			<!-- Main Content Area -->
			<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-4 tw-p-2 sm:tw-p-4 tw-flex-1 tw-min-h-0 tw-overflow-y-auto lg:tw-overflow-hidden">
				
				<!-- Radar Pane (Left) -->
				<div class="tw-col-span-1 lg:tw-col-span-7 tw-flex tw-flex-col tw-border tw-border-[#334155] tw-p-3 sm:tw-p-4 tw-min-h-[400px] lg:tw-min-h-0 tw-bg-[#0a0a0a]">
					<h3 class="tw-text-[#14b8a6] tw-text-xs tw-mb-3 tw-border-b tw-border-[#334155] tw-pb-2 tw-shrink-0">TACTICAL RADAR</h3>
					<div class="tw-flex-1 tw-relative tw-w-full tw-min-h-0">
						<LightningRadar bind:weatherLockout={lockout} {fieldLat} {fieldLng} />
					</div>
				</div>

				<!-- Telemetry & Forecast Pane (Right) -->
				<div class="tw-col-span-1 lg:tw-col-span-5 tw-flex tw-flex-col tw-gap-4 tw-min-h-0 lg:tw-overflow-y-auto">
					<div class="tw-border tw-border-[#334155] tw-p-3 sm:tw-p-4 tw-shrink-0 tw-bg-[#0a0a0a]">
						<h3 class="tw-text-[#14b8a6] tw-text-xs tw-mb-3 tw-border-b tw-border-[#334155] tw-pb-2">OUTDOOR SAFETY TELEMETRY</h3>
						<div class="tw-grid tw-grid-cols-2 tw-gap-3 tw-text-center">
							<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-2"><div class="tw-text-[10px] tw-text-gray-400">WBGT</div><div class="tw-text-lg sm:tw-text-xl tw-font-bold">78°</div></div>
							<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-2"><div class="tw-text-[10px] tw-text-gray-400">UV INDEX</div><div class="tw-text-lg sm:tw-text-xl tw-font-bold">6</div></div>
							<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-2"><div class="tw-text-[10px] tw-text-gray-400">WIND</div><div class="tw-text-lg sm:tw-text-xl tw-font-bold">12 <span class="tw-text-xs">MPH NE</span></div></div>
							<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-2"><div class="tw-text-[10px] tw-text-gray-400">HUMIDITY</div><div class="tw-text-lg sm:tw-text-xl tw-font-bold">45%</div></div>
						</div>
					</div>
					
					<div class="tw-flex-1 tw-min-h-0 tw-flex tw-flex-col">
						<ForecastPanel />
					</div>
				</div>

			</div>
		</div>
	</div>
{/if}
