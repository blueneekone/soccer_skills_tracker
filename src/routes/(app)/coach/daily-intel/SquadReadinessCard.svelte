<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db } from '$lib/firebase.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';

	let canvasEl = $state<HTMLCanvasElement | undefined>(undefined);
	let chart: any = null;

	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated || !workspaceContextStore.activeTeamId) return;
		if (!db || !browser || !canvasEl) return;
		let destroyed = false;
		void (async () => {
			await tick();
			const mod = await import('chart.js/auto');
			if (destroyed) return;
			const Chart = mod.default || (mod as any).Chart;
			const ctx = canvasEl!.getContext('2d');
			if (!ctx || destroyed) return;
			chart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
					datasets: [{
						label: 'ACWR Load Spike',
						data: [0.8, 0.9, 0.85, 1.2, 1.5, 1.8, 1.1],
						borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)',
						borderWidth: 2, tension: 0.4, fill: true,
						pointBackgroundColor: '#f59e0b', pointRadius: 4, pointHoverRadius: 6
					}]
				},
				options: {
					responsive: true, maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
						tooltip: { backgroundColor: '#0f172a', titleColor: '#d4d4d8', bodyColor: '#fafafa', borderColor: '#334155', borderWidth: 1 }
					},
					scales: {
						x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a1a1aa', font: { family: 'monospace' } } },
						y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a1a1aa', font: { family: 'monospace' } } }
					}
				}
			});
		})();
		return () => { destroyed = true; chart?.destroy(); chart = null; };
	});
</script>

<section class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col tw-shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] tw-relative" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
	<h2 class="tw-font-sans tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-text-[#d4d4d8] tw-mb-5">SQUAD READINESS & ACWR</h2>
	<div style="width:100%; height:300px; flex-shrink:0; background:#020617; border:1px solid #334155; border-radius:12px; box-shadow:inset 0 2px 8px rgba(0,0,0,0.5); overflow:hidden;">
		<div style="position:relative; width:100%; height:100%; padding:16px; box-sizing:border-box;">
			<canvas bind:this={canvasEl} style="width:100% !important; height:100% !important;"></canvas>
		</div>
	</div>
	<button
		onclick={() => goto('/coach/forge')}
		class="tw-mt-5 tw-w-full tw-bg-gradient-to-b tw-from-[#fbbf24] tw-to-[#d97706] tw-text-black tw-font-mono tw-text-sm tw-font-bold tw-h-[44px] tw-px-6 tw-flex tw-items-center tw-justify-center hover:tw-scale-[0.98] tw-shadow-[0_4px_14px_rgba(251,191,36,0.25)] tw-border tw-border-[#fcd34d] tw-tracking-widest tw-transition-all tw-duration-200"
	>[ DEPLOY ADJUSTED TRAINING INTENT ]</button>
</section>
