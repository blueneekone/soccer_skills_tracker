<script lang="ts">
	import type { LightningRadarEngine } from '../../../../routes/(app)/director/logistics/radar/LightningRadarEngine.svelte';
	let { engine }: { engine: LightningRadarEngine } = $props();

	let threatColorClass = $derived.by(() => {
		if (engine.threatLevel === 'Red') return 'tw-text-[#ff007f]';
		if (engine.threatLevel === 'Amber') return 'tw-text-[#f59e0b]';
		return 'tw-text-[#14b8a6]'; // Data Cyan
	});

	let view = $state(5);
	const tabs = [5, 7, 10];

	// Mock forecast generation for demonstration
	let forecastDays = $derived.by(() => {
		const days = [];
		const baseDate = new Date();
		for (let i = 0; i < view; i++) {
			const d = new Date(baseDate);
			d.setDate(d.getDate() + i);
			const precip = Math.floor(Math.random() * 100);
			days.push({
				date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
				temp: Math.floor(Math.random() * 40 + 50),
				precip,
				isSevere: precip > 70
			});
		}
		return days;
	});
</script>

<div class="tw-h-full tw-w-full tw-flex tw-flex-col tw-p-4 tw-font-geist-mono tw-transition-colors tw-duration-500 {engine.threatLevel === 'Red' ? 'tw-bg-[#ff0000]/10' : ''}">
	<!-- Header -->
	<div class="tw-border-b tw-border-[#334155] tw-pb-4 tw-mb-4">
		<h2 class="tw-text-xs tw-uppercase tw-tracking-[0.2em] tw-text-gray-400">Tactical Telemetry</h2>
		<div class="tw-mt-2 tw-flex tw-items-center tw-justify-between">
			<span class="tw-text-sm tw-text-gray-500">THREAT STATUS</span>
			<span class="tw-text-lg tw-font-bold tw-uppercase tw-tracking-widest {threatColorClass} {engine.threatLevel === 'Red' ? 'tw-animate-pulse' : ''}">
				{engine.threatLevel}
			</span>
		</div>
	</div>

	<!-- Strike Log -->
	<div class="tw-flex-1 tw-overflow-y-auto">
		<h3 class="tw-text-xs tw-uppercase tw-tracking-[0.15em] tw-text-gray-500 tw-mb-3">Live Strike Array</h3>

		{#if engine.strikes.length === 0}
			<div class="tw-text-xs tw-text-gray-600 tw-italic">No strikes detected...</div>
		{:else}
			<ul class="tw-space-y-2">
				{#each engine.strikes.slice().reverse() as strike}
					{@const isCritical = strike.dist_miles < 10}
					{@const isWarning = strike.dist_miles >= 10 && strike.dist_miles <= 15}
					<li class="tw-p-2 tw-border tw-rounded-none {isCritical ? 'tw-border-[#ff007f] tw-bg-[#ff007f]/10' : (isWarning ? 'tw-border-[#f59e0b] tw-bg-[#f59e0b]/10' : 'tw-border-[#334155]')}">
						<div class="tw-flex tw-justify-between tw-text-[10px] tw-text-gray-400 tw-mb-1">
							<span class="tw-font-mono">{new Date(strike.timestamp).toLocaleTimeString()}</span>
							<span class="tw-font-mono">{strike.current_ka} kA</span>
						</div>
						<div class="tw-flex tw-justify-between tw-items-end">
							<span class="tw-text-xs tw-text-gray-300">PROXIMITY</span>
							<span class="tw-text-sm tw-font-bold tw-font-mono {isCritical ? 'tw-text-[#ff007f]' : (isWarning ? 'tw-text-[#f59e0b]' : 'tw-text-[#14b8a6]')}">
								{strike.dist_miles.toFixed(1)} MI
							</span>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Forecast Module -->
	<div class="tw-border-t tw-border-[#334155] tw-pt-4 tw-mt-4 tw-shrink-0">
		<div class="tw-flex tw-items-center tw-justify-between tw-mb-3">
			<h3 class="tw-text-xs tw-uppercase tw-tracking-[0.15em] tw-text-gray-500">METEOROLOGICAL OUTLOOK</h3>
			<div class="tw-flex tw-gap-1">
				{#each tabs as t}
					<button
						class="tw-px-2 tw-py-1 tw-text-[10px] tw-font-bold tw-border tw-transition-colors {view === t ? 'tw-border-[#14b8a6] tw-text-[#14b8a6] tw-bg-[#14b8a6]/15' : 'tw-border-[#334155] tw-text-slate-400 hover:tw-text-white'}"
						onclick={() => view = t}
					>
						{t}D
					</button>
				{/each}
			</div>
		</div>

		<div class="tw-flex tw-gap-2 tw-overflow-x-auto tw-pb-2 tw-scrollbar-thin">
			{#each forecastDays as day}
				<div class="tw-flex-1 tw-min-w-[60px] tw-border {day.isSevere ? 'tw-border-[#f59e0b] tw-bg-[#f59e0b]/10' : 'tw-border-[#334155] tw-bg-black'} tw-p-2 tw-flex tw-flex-col tw-items-center tw-text-center">
					<span class="tw-text-[10px] tw-font-bold tw-text-slate-400">{day.date}</span>
					<span class="tw-text-sm tw-font-bold tw-font-mono tw-text-white tw-mt-1">{day.temp}°</span>
					<span class="tw-text-[9px] tw-font-bold tw-font-mono tw-mt-1 {day.isSevere ? 'tw-text-[#f59e0b]' : 'tw-text-[#14b8a6]'}">
						{day.precip}% RAIN
					</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Controls (Dev mode) -->
	<div class="tw-pt-4 tw-border-t tw-border-[#334155] tw-mt-2">
		<button
			class="tw-w-full tw-py-2 tw-text-xs tw-uppercase tw-tracking-widest tw-bg-[#fbbf24] tw-text-black tw-font-bold hover:tw-bg-white tw-transition-colors"
			onclick={() => engine.simulateStrike(Math.random() * 20)}
		>
			Inject Test Strike
		</button>
	</div>
</div>
