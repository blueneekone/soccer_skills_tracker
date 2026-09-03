<script lang="ts">
	import type { Snippet } from 'svelte';
	
	let { error = null }: { error?: any } = $props();
</script>

<div class="sentry-boundary-hud tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-[#000000] tw-p-6">
	<div class="tw-max-w-2xl tw-w-full tw-rounded-xl tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-8 tw-shadow-[0_0_40px_rgba(245,158,11,0.15)]">
		<div class="tw-flex tw-items-start tw-gap-4">
			<div class="tw-flex-shrink-0 tw-text-[#f59e0b]">
				<svg class="tw-w-8 tw-h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			<div class="tw-flex-1">
				<h2 class="tw-text-xl tw-font-bold tw-text-[#fafafa] tw-mb-2">Telemetry Intercepted</h2>
				<p class="tw-text-[#d4d4d8] tw-text-sm tw-mb-6">
					A systemic anomaly has been detected and logged to our secure telemetry grid. 
					Your current session data has been preserved.
				</p>
				<button 
					class="tw-px-4 tw-py-2 tw-bg-[#fbbf24] tw-text-[#000000] tw-font-semibold tw-rounded tw-text-sm tw-transition-colors hover:tw-bg-[#f59e0b]"
					onclick={() => window.location.reload()}
				>
					Re-Initialize Uplink
				</button>
			</div>
		</div>
	</div>
</div>
