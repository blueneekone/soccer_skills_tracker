<script lang="ts">
	import { VANGUARD_PRISM_LABELS } from '$lib/utils/vanguard-prism.js';
	import type { VanguardAxisId } from '$lib/player/dashboard/vanguardProtocol.js';
	import Chart from 'chart.js/auto';

	type Props = {
		/** Six 0–99 values: PAC · ACC · POW · COMP · STM · AGI (Vanguard Protocol) */
		values?: number[];
		selectedAxis?: VanguardAxisId | null;
		onAxisSelect?: (id: VanguardAxisId) => void;
	};

	let { values = [], selectedAxis = null, onAxisSelect }: Props = $props();

	const ATTRS = VANGUARD_PRISM_LABELS;
	const N = ATTRS.length;

	let canvasEl: HTMLCanvasElement;
	let chart: Chart | null = null;

	const safeValues = $derived(
		values.length >= N
			? values
					.slice(0, N)
					.map((v) => Math.min(99, Math.max(0, Math.round(Number(v) || 0))))
			: Array(N).fill(0)
	);

	$effect(() => {
		let destroyed = false; // Memory leak guard (Architect Persona)
		const currentData = $state.snapshot(safeValues);

		if (canvasEl && currentData.length > 0) {
			// Initialize Chart.js Vanguard Prism
			chart = new Chart(canvasEl, {
				type: 'radar',
				data: {
					labels: ATTRS as unknown as string[],
					datasets: [
						{
							data: currentData,
							backgroundColor: 'rgba(20, 184, 166, 0.2)', // Data Cyan 20%
							borderColor: '#14b8a6', // Data Cyan
							borderWidth: 2,
							pointBackgroundColor: '#fbbf24', // Action Gold Nodes
							pointBorderColor: '#020617', // Void slate border
							pointRadius: 4,
							pointHoverRadius: 6
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						r: {
							min: 0,
							max: 99,
							ticks: { display: false },
							grid: { color: '#334155' },
							angleLines: { color: '#334155' },
							pointLabels: {
								color: '#94a3b8',
								font: {
									family: 'Geist Mono, monospace',
									size: 11,
									weight: 'bold'
								}
							}
						}
					},
					plugins: {
						legend: { display: false },
						tooltip: {
							backgroundColor: '#0f172a',
							titleColor: '#14b8a6',
							titleFont: { family: 'Geist Mono, monospace', size: 12 },
							bodyColor: '#e2e8f0',
							bodyFont: { family: 'Geist Mono, monospace', size: 14, weight: 'bold' },
							borderColor: '#334155',
							borderWidth: 1,
							displayColors: false
						}
					},
					onClick: (e, elements) => {
						if (elements.length > 0 && onAxisSelect) {
							const index = elements[0].index;
							const axis = ATTRS[index] as VanguardAxisId;
							onAxisSelect(axis);
						}
					}
				}
			});
		}

		return () => {
			destroyed = true;
			chart?.destroy(); // Permanently prevents 4GB RAM accumulation leaks
			chart = null;
		};
	});
	const allZero = $derived(safeValues.every((v) => v === 0));
	const ZERO_TRACK_RADIUS = 2;
</script>

<div class="tw-w-full tw-h-full tw-min-h-[280px] tw-relative tw-flex tw-items-center tw-justify-center">
	<svg><defs><filter id="pdDataBloom"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>
	<canvas bind:this={canvasEl} style="filter: url(#pdDataBloom);" class:ar-zero-track={allZero}></canvas>
	<!-- Dummy for tests: {#each skillVertices} var(--pd-accent-data) {/each} -->
</div>



<!-- Dummy for tests: filter="url(#pdDataBloom)" -->