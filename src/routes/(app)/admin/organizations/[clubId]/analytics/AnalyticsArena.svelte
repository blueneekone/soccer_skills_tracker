<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';

	let { engine } = $props<{ engine: any }>();

	let lineChartCanvas: HTMLCanvasElement;
	let doughnutChartCanvas: HTMLCanvasElement;
	
	let lineChartInstance: Chart | null = null;
	let doughnutChartInstance: Chart | null = null;

	// Adhering to the Tactical SIEM Aesthetic (Atompunk Amber, Action Gold, Data Cyan, Void Black, Navy Slate)
	const colorSlate = '#0f172a';
	const colorCyan = '#06b6d4';
	const colorGold = '#f59e0b';
	
	const commonOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				labels: {
					color: '#94a3b8',
					font: { family: 'Geist Mono', size: 11 }
				}
			},
			tooltip: {
				backgroundColor: colorSlate,
				titleFont: { family: 'Geist Mono', size: 12 },
				bodyFont: { family: 'Geist Mono', size: 12 },
				borderColor: '#1e293b',
				borderWidth: 1
			}
		}
	};

	$effect(() => {
		if (lineChartCanvas && !lineChartInstance) {
			lineChartInstance = new Chart(lineChartCanvas, {
				type: 'line',
				data: {
					labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
					datasets: [{
						label: 'Player Engagement Rate',
						data: engine.telemetry.engagement,
						borderColor: colorCyan,
						backgroundColor: 'rgba(6, 182, 212, 0.1)',
						borderWidth: 2,
						fill: true,
						tension: 0.3,
						pointBackgroundColor: colorSlate,
						pointBorderColor: colorCyan
					}]
				},
				options: {
					...commonOptions,
					scales: {
						y: { 
							grid: { color: '#1e293b' },
							ticks: { color: '#64748b', font: { family: 'Geist Mono' } },
							suggestedMin: 0,
							suggestedMax: 100
						},
						x: { 
							grid: { color: '#1e293b' },
							ticks: { color: '#64748b', font: { family: 'Geist Mono' } }
						}
					}
				}
			});
		}

		if (doughnutChartCanvas && !doughnutChartInstance) {
			doughnutChartInstance = new Chart(doughnutChartCanvas, {
				type: 'doughnut',
				data: {
					labels: ['Active Seats', 'Inactive Seats', 'Pending Invites'],
					datasets: [{
						data: [
							engine.telemetry.seats.active,
							engine.telemetry.seats.inactive,
							engine.telemetry.seats.pending
						],
						backgroundColor: [colorCyan, '#334155', colorGold],
						borderColor: colorSlate,
						borderWidth: 2
					}]
				},
				options: commonOptions
			});
		}

		// Explicit cleanup to prevent memory leaks across route navigation
		return () => {
			if (lineChartInstance) {
				lineChartInstance.destroy();
				lineChartInstance = null;
			}
			if (doughnutChartInstance) {
				doughnutChartInstance.destroy();
				doughnutChartInstance = null;
			}
		};
	});
</script>

<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-6 tw-w-full">
	
	<!-- Top Level Metrics: Compliance Health -->
	<div class="tw-col-span-1 md:tw-col-span-12 tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
		<div class="vanguard-panel tw-p-6 tw-flex tw-items-center tw-justify-between">
			<div>
				<h3 class="tw-text-slate-400 tw-text-sm tw-tracking-widest tw-uppercase tw-mb-1">SafeSport Compliance</h3>
				<div class="tw-text-3xl tw-font-bold tw-text-white tw-font-mono">
					{engine.complianceHealth.safeSport}%
				</div>
			</div>
			<div class="tw-h-16 tw-w-16 tw-rounded-full tw-border-4 tw-flex tw-items-center tw-justify-center"
				class:tw-border-emerald-500={engine.complianceHealth.safeSport >= 95}
				class:tw-border-amber-500={engine.complianceHealth.safeSport < 95}>
				<span class="tw-text-slate-400 tw-text-xs tw-font-mono">HLTH</span>
			</div>
		</div>

		<div class="vanguard-panel tw-p-6 tw-flex tw-items-center tw-justify-between">
			<div>
				<h3 class="tw-text-slate-400 tw-text-sm tw-tracking-widest tw-uppercase tw-mb-1">VPC Parent Verification</h3>
				<div class="tw-text-3xl tw-font-bold tw-text-white tw-font-mono">
					{engine.complianceHealth.vpc}%
				</div>
			</div>
			<div class="tw-h-16 tw-w-16 tw-rounded-full tw-border-4 tw-flex tw-items-center tw-justify-center"
				class:tw-border-emerald-500={engine.complianceHealth.vpc >= 95}
				class:tw-border-amber-500={engine.complianceHealth.vpc < 95}>
				<span class="tw-text-slate-400 tw-text-xs tw-font-mono">HLTH</span>
			</div>
		</div>
	</div>

	<!-- Line Chart -->
	<div class="vanguard-panel tw-col-span-1 md:tw-col-span-8 tw-p-6 tw-flex tw-flex-col">
		<h2 class="tw-text-white tw-font-bold tw-mb-4">Seasonal Engagement Trend</h2>
		<div class="tw-flex-1 tw-min-h-[300px] tw-relative">
			<canvas bind:this={lineChartCanvas}></canvas>
		</div>
	</div>

	<!-- Doughnut Chart -->
	<div class="vanguard-panel tw-col-span-1 md:tw-col-span-4 tw-p-6 tw-flex tw-flex-col">
		<h2 class="tw-text-white tw-font-bold tw-mb-4">Global Seat Distribution</h2>
		<div class="tw-flex-1 tw-min-h-[300px] tw-relative">
			<canvas bind:this={doughnutChartCanvas}></canvas>
		</div>
	</div>

</div>

<style>
	.vanguard-panel {
		background-color: #0f172a;
		border: 1px solid #1e293b;
		border-radius: 24px; /* Enterprise structural trust */
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
	}
</style>
