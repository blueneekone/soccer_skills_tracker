<script lang="ts">
	import { proBenchmarkService } from '$lib/services/proBenchmarks.svelte';
	import type { VanguardAxisId } from '$lib/player/dashboard/vanguardProtocol';

	export let prismValues: readonly number[] = [];

	const AXES: { id: VanguardAxisId; label: string; index: number }[] = [
		{ id: 'PAC', label: 'Pace', index: 0 },
		{ id: 'ACC', label: 'Acceleration', index: 1 },
		{ id: 'POW', label: 'Power', index: 2 },
		{ id: 'COMP', label: 'Composure', index: 3 },
		{ id: 'STM', label: 'Stamina', index: 4 },
		{ id: 'AGI', label: 'Agility', index: 5 },
	];

	// Extract the reactive state
	$: benchmarks = proBenchmarkService.benchmarks;
</script>

{#if benchmarks}
<div class="mt-8 rounded-lg border border-slate-700/50 bg-[#0B0F19] p-4 text-slate-300 shadow-xl">
	<div class="mb-4 flex items-center justify-between border-b border-slate-700/50 pb-2">
		<h3 class="font-sans text-sm font-semibold tracking-wide text-white uppercase">
			Pro-League Benchmarks
		</h3>
		<span class="font-mono text-xs text-slate-500">Sportradar API</span>
	</div>

	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
		{#each AXES as axis}
			{@const proScore = benchmarks[axis.id] ?? 0}
			{@const myScore = Math.floor(prismValues[axis.index] ?? 0)}
			{@const diff = myScore - proScore}
			<div class="flex flex-col rounded bg-slate-800/40 p-3 shadow-inner">
				<span class="font-mono text-[10px] text-slate-400 uppercase tracking-widest">{axis.label}</span>
				<div class="mt-1 flex items-baseline justify-between">
					<div class="flex items-baseline space-x-1">
						<span class="font-mono text-lg font-bold text-white">{myScore}</span>
						<span class="font-mono text-xs text-slate-500">/ {proScore}</span>
					</div>
					{#if diff > 0}
						<span class="font-mono text-xs font-medium text-emerald-400">+{diff}</span>
					{:else if diff < 0}
						<span class="font-mono text-xs font-medium text-rose-400">{diff}</span>
					{:else}
						<span class="font-mono text-xs font-medium text-slate-500">0</span>
					{/if}
				</div>
				<!-- Progress bar comparison -->
				<div class="mt-2 h-1 w-full overflow-hidden rounded bg-slate-700/50">
					<div 
						class="h-full bg-blue-500 transition-all duration-500"
						style="width: {Math.min(100, Math.max(0, (myScore / Math.max(1, proScore)) * 100))}%;"
					></div>
				</div>
			</div>
		{/each}
	</div>
</div>
{/if}
