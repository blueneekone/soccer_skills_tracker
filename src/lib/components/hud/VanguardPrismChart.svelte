<script lang="ts">
	import { untrack } from 'svelte';
	import Chart from 'chart.js/auto';

	let { data = [50, 50, 50, 50, 50, 50] } = $props<{ data: number[] }>();

	let canvasRef: HTMLCanvasElement;
	let chartInstance: Chart | null = null;

	$effect(() => {
		// Memory Management: Observe data changes
		const currentData = data;

		untrack(() => {
			let destroyed = false;

			if (chartInstance) {
				chartInstance.data.datasets[0].data = currentData;
				chartInstance.update();
			} else if (canvasRef) {
				chartInstance = new Chart(canvasRef, {
					type: 'radar',
					data: {
						labels: ['POW', 'AGI', 'ACC', 'PAC', 'STM', 'COMP'],
						datasets: [
							{
								label: 'Athlete Metrics',
								data: currentData,
								backgroundColor: 'rgba(20, 184, 166, 0.2)', // Data Cyan 20%
								borderColor: '#14b8a6', // Data Cyan
								pointBackgroundColor: '#14b8a6',
								pointBorderColor: '#09090b',
								pointHoverBackgroundColor: '#09090b',
								pointHoverBorderColor: '#14b8a6',
								borderWidth: 2,
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							r: {
								min: 0,
								max: 100,
								angleLines: {
									color: 'rgba(148, 163, 184, 0.2)'
								},
								grid: {
									color: '#0f172a', // Radar grid
									circular: true
								},
								pointLabels: {
									font: {
										family: 'var(--font-mono, "Geist Mono", monospace)',
										size: 10,
										weight: 'bold'
									},
									color: '#94a3b8'
								},
								ticks: {
									display: false,
									stepSize: 20
								}
							}
						},
						plugins: {
							legend: {
								display: false
							},
							tooltip: {
								backgroundColor: 'rgba(15, 23, 42, 0.9)',
								titleFont: { family: 'var(--font-mono, "Geist Mono", monospace)' },
								bodyFont: { family: 'var(--font-mono, "Geist Mono", monospace)' },
								borderColor: '#14b8a6',
								borderWidth: 1
							}
						}
					}
				});
			}

			return () => {
				destroyed = true;
				if (destroyed && chartInstance) {
					chartInstance.destroy();
					chartInstance = null;
				}
			};
		});
	});
</script>

<!-- CRITICAL MEMORY MANAGEMENT: Wrapped in tw-min-w-0 to prevent flex/grid squishing -->
<div class="tw-min-w-0 vanguard-prism-well">
	<div class="vanguard-prism-container">
		<canvas bind:this={canvasRef}></canvas>
	</div>
</div>

<style>
	.vanguard-prism-well {
		/* Z1 recessed well */
		background: #0f172a;
		border-radius: 12px;
		padding: 16px;
		box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(20, 184, 166, 0.15);
	}

	.vanguard-prism-container {
		position: relative;
		width: 100%;
		height: 250px;
	}

	/* Negative tracking for labels handled globally for Geist Mono but can be forced here */
	:global(.vanguard-prism-well canvas) {
		letter-spacing: -0.05em;
	}
</style>
