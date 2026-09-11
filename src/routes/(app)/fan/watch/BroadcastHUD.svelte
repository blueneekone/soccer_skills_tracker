<script lang="ts">
	import type { BroadcastEngine } from './BroadcastEngine.svelte.js';

	let { engine }: { engine: BroadcastEngine } = $props();
</script>

<header class="fan-broadcast-hud tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a]/90 tw-border tw-border-[#334155] tw-rounded-xl tw-px-6 tw-py-4 tw-backdrop-blur-md tw-mb-6">
	<!-- Left: Status & Live Ticker -->
	<div class="tw-flex tw-items-center tw-gap-4">
		<div class="tw-flex tw-items-center tw-gap-2">
			<span class="tw-relative tw-flex tw-h-3 tw-w-3">
				<span class="tw-animate-ping tw-absolute tw-inline-flex tw-h-full tw-w-full tw-rounded-full tw-bg-emerald-400 tw-opacity-75"></span>
				<span class="tw-relative tw-inline-flex tw-rounded-full tw-h-3 tw-w-3 tw-bg-emerald-500"></span>
			</span>
			<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-text-emerald-400">LIVE FEED</span>
		</div>
		<div class="tw-h-4 tw-w-[1px] tw-bg-[#334155]"></div>
		<span class="tw-font-mono tw-text-xs tw-text-[#d4d4d8]">
			SESSION: <span class="tw-text-[#14b8a6]">{engine.sessionId || 'SYNCHRONIZING'}</span>
		</span>
	</div>

	<!-- Center / Right: Superdraw & Voting Metrics -->
	<div class="tw-flex tw-items-center tw-gap-6">
		<div class="tw-flex tw-flex-col tw-items-end">
			<span class="tw-text-[10px] tw-font-mono tw-text-[#94a3b8] tw-uppercase tw-tracking-wider">SUPERDRAW POOL</span>
			<span class="tw-font-mono tw-text-base tw-font-bold tw-text-[#daff0a]">
				${(engine.activeSuperdrawPool || 0).toLocaleString()}
			</span>
		</div>

		<div class="tw-h-6 tw-w-[1px] tw-bg-[#334155]"></div>

		<div class="tw-flex tw-items-center tw-gap-2">
			<span class="tw-text-xs tw-font-mono tw-text-[#d4d4d8]">VOTING:</span>
			{#if engine.isVotingOpen}
				<span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-emerald-500/10 tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-emerald-400 tw-border tw-border-emerald-500/20">
					OPEN
				</span>
			{:else}
				<span class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-amber-500/10 tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-amber-400 tw-border tw-border-amber-500/20">
					LOCKED
				</span>
			{/if}
		</div>
	</div>
</header>
