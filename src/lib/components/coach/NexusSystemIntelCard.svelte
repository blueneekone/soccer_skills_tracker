<script lang="ts">
	// NexusSystemIntelCard — Consolidated sidecar telemetry for Mission Control
	// Merges: Forge/Intent Engine + ZDP Engine + Squad Uptime into one dense card

	interface Props {
		squadUptimePct?: number;
		teamSize?: number;
	}

	let { squadUptimePct = 0, teamSize = 0 }: Props = $props();

	const uptimeColor = $derived(
		squadUptimePct >= 80 ? '#14b8a6'
		: squadUptimePct >= 60 ? '#daff0a'
		: '#f59e0b'
	);
</script>

<div
	class="vanguard-panel tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 tw-font-mono"
	style="border-radius: 0px;"
>
	<!-- Card Header -->
	<div class="tw-flex tw-items-center tw-justify-between tw-mb-3 tw-pb-2.5 tw-border-b tw-border-[#334155]">
		<span class="tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.22em] tw-text-[#14b8a6]">
			NEXUS INTELLIGENCE
		</span>
		<span class="tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/30 tw-text-[#14b8a6] tw-text-[9px] tw-font-bold tw-px-1.5 tw-py-0.5">
			SIEM
		</span>
	</div>

	<!-- Metric Row 1: Forge & Intent Engine (RL Inference) -->
	<div class="tw-mb-3">
		<div class="tw-flex tw-items-baseline tw-justify-between tw-mb-1.5">
			<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-400">
				Forge · RL Inference
			</span>
			<span class="tw-text-sm tw-font-black tw-text-[#14b8a6]">+12%</span>
		</div>
		<div class="tw-w-full tw-h-1 tw-bg-[#020617] tw-border tw-border-[#334155]" style="border-radius: 0px;">
			<div class="tw-h-full tw-bg-[#14b8a6] tw-transition-all" style="width: 62%; border-radius: 0px;"></div>
		</div>
		<div class="tw-flex tw-items-center tw-justify-between tw-mt-1">
			<span class="tw-text-[9px] tw-text-slate-500">INTENSITY DELTA</span>
			<span class="tw-text-[9px] tw-text-slate-500">62 / 100</span>
		</div>
	</div>

	<!-- Metric Row 2: ZDP Engine -->
	<div class="tw-mb-3">
		<div class="tw-flex tw-items-baseline tw-justify-between tw-mb-1.5">
			<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-400">
				ZDP Engine · Latency
			</span>
			<span class="tw-text-sm tw-font-black tw-text-[#daff0a]">14ms</span>
		</div>
		<div class="tw-w-full tw-h-1 tw-bg-[#020617] tw-border tw-border-[#334155]" style="border-radius: 0px;">
			<div class="tw-h-full tw-bg-[#daff0a] tw-transition-all" style="width: 14%; border-radius: 0px;"></div>
		</div>
		<p class="tw-text-[9px] tw-text-slate-500 tw-mt-1 tw-m-0 tw-leading-relaxed">
			Vygotsky inference active — press + transitional zones
		</p>
	</div>

	<!-- Metric Row 3: Squad Uptime -->
	<div>
		<div class="tw-flex tw-items-baseline tw-justify-between tw-mb-1.5">
			<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-400">
				Squad Uptime
			</span>
			<span class="tw-text-sm tw-font-black" style="color: {uptimeColor};">
				{squadUptimePct}%
			</span>
		</div>
		<div class="tw-w-full tw-h-1 tw-bg-[#020617] tw-border tw-border-[#334155]" style="border-radius: 0px;">
			<div
				class="tw-h-full tw-transition-all"
				style="width: {squadUptimePct}%; background-color: {uptimeColor}; border-radius: 0px;"
			></div>
		</div>
		<div class="tw-flex tw-items-center tw-justify-between tw-mt-1">
			<span class="tw-text-[9px] tw-text-slate-500">READINESS SCORE</span>
			{#if teamSize > 0}
				<span class="tw-text-[9px] tw-text-slate-500">{teamSize} ATHLETES</span>
			{/if}
		</div>
	</div>
</div>
