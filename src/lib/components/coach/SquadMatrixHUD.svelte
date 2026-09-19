<script lang="ts">
	import type { SquadMatrixEngine } from './SquadMatrixEngine.svelte.js';

	let { engine }: { engine: SquadMatrixEngine } = $props();
</script>

<section
	class="vanguard-panel tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-xl tw-p-4 tw-shadow-2xl"
	aria-label="Squad uptime"
>
	<div class="tw-flex tw-flex-col lg:tw-flex-row lg:tw-items-center tw-justify-between tw-gap-4">
		<div class="tw-flex tw-items-center tw-gap-3">
			<span class="tw-relative tw-flex tw-h-3 tw-w-3">
				<span class="tw-animate-ping tw-absolute tw-inline-flex tw-h-full tw-w-full tw-rounded-full tw-bg-[#14b8a6] tw-opacity-75"></span>
				<span class="tw-relative tw-inline-flex tw-rounded-full tw-h-3 tw-w-3 tw-bg-[#14b8a6]"></span>
			</span>
			<div>
				<div class="tw-flex tw-items-center tw-gap-2">
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-[0.2em] tw-text-[#14b8a6] tw-uppercase">
						SQUAD UPTIME · LIVE TICKER
					</span>
					<span class="tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/40 tw-text-[#14b8a6] tw-text-[9px] tw-font-mono tw-px-1.5 tw-py-0.5 tw-rounded">
						SIEM v2
					</span>
				</div>
				<p class="tw-font-mono tw-text-[11px] tw-text-slate-400 tw-m-0 tw-mt-0.5">
					Real-time readiness telemetry for {engine.readinessMatrixLabel}
				</p>
			</div>
		</div>

		<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-4">
			<div class="tw-flex tw-items-baseline tw-gap-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-px-3 tw-py-1.5 tw-rounded-lg">
				<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-400">
					READINESS SCORE
				</span>
				<span class="tw-font-mono tw-text-2xl tw-font-black tw-tabular-nums tw-text-[#daff0a] tw-drop-shadow-[0_0_8px_rgba(218,255,10,0.4)]">
					{engine.squadUptimePct}%
				</span>
			</div>

			<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
				<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-px-2 tw-py-1 tw-rounded tw-bg-[#14b8a6]/15 tw-border tw-border-[#14b8a6]/40 tw-text-[#14b8a6]">
					● COMBAT READY: <span class="tw-text-[#fafafa] tw-ml-1">{engine.rmReady}</span>
				</span>
				<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-px-2 tw-py-1 tw-rounded tw-bg-[#f59e0b]/15 tw-border tw-border-[#f59e0b]/40 tw-text-[#f59e0b]">
					⏳ CONSENT PENDING: <span class="tw-text-[#fafafa] tw-ml-1">{engine.rmConsent}</span>
				</span>
				<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-px-2 tw-py-1 tw-rounded tw-bg-[#0f172a] tw-border tw-border-slate-700 tw-text-slate-400">
					○ OFFLINE: <span class="tw-text-[#fafafa] tw-ml-1">{engine.rmOffline}</span>
				</span>
				{#if engine.rmAtRisk > 0}
					<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-px-2 tw-py-1 tw-rounded tw-bg-[#ef4444]/15 tw-border tw-border-[#ef4444]/40 tw-text-[#ef4444]">
						⚠ INJURY RISK: <span class="tw-text-[#fafafa] tw-ml-1">{engine.rmAtRisk}</span>
					</span>
				{/if}
			</div>
		</div>
	</div>

	<div class="tw-w-full tw-h-2 tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-full tw-overflow-hidden tw-mt-3">
		<div
			class="tw-h-full tw-bg-gradient-to-r tw-from-[#14b8a6] tw-to-[#daff0a] tw-transition-all tw-duration-500"
			style="width: {engine.squadUptimePct}%;"
		></div>
	</div>
</section>
