/**
 * Vanguard Prism Radar Config — Scout's Six Axes
 * Extracted per 80-line limit mandate from the Vanguard Trinity protocol.
 * Enforces Nuclear Americana Tech Noir aesthetic for all Chart.js radar instances.
 */
import type { ChartOptions, ChartData } from 'chart.js';

export const SCOUTS_SIX_LABELS = ['POW', 'AGI', 'ACC', 'PAC', 'STM', 'COMP'] as const;

export function buildVanguardPrismOptions(): ChartOptions<'radar'> {
	return {
		responsive: true,
		maintainAspectRatio: true,
		animation: { duration: 400, easing: 'easeOutQuart' },
		scales: {
			r: {
				min: 0,
				max: 100,
				ticks: {
					display: false,
					stepSize: 25,
				},
				grid: {
					color: '#334155',
					lineWidth: 1,
				},
				angleLines: {
					color: '#334155',
					lineWidth: 1,
				},
				pointLabels: {
					color: '#94a3b8',
					font: {
						family: "'Geist Mono', monospace",
						size: 9,
						weight: 'bold',
					},
				},
			},
		},
		plugins: {
			legend: { display: false },
			tooltip: {
				backgroundColor: '#0f172a',
				borderColor: '#334155',
				borderWidth: 1,
				titleColor: '#14b8a6',
				bodyColor: '#f8fafc',
				titleFont: { family: "'Geist Mono', monospace", size: 10 },
				bodyFont: { family: "'Geist Mono', monospace", size: 11 },
				callbacks: {
					title: (items) => SCOUTS_SIX_LABELS[items[0].dataIndex] ?? '',
					label: (item) => ` ${item.raw}`,
				},
			},
		},
	};
}

export function buildVanguardPrismData(stats: number[]): ChartData<'radar'> {
	return {
		labels: [...SCOUTS_SIX_LABELS],
		datasets: [
			{
				data: stats,
				backgroundColor: 'rgba(20, 184, 166, 0.18)',
				borderColor: '#14b8a6',
				borderWidth: 2,
				pointBackgroundColor: '#14b8a6',
				pointBorderColor: '#020617',
				pointHoverBackgroundColor: '#fbbf24',
				pointRadius: 3,
				pointHoverRadius: 5,
			},
		],
	};
}
