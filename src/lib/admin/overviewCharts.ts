import type { OverviewChartPoint } from '$lib/types/adminOverview.js';

export type CssVarReader = (name: string, fallback: string) => string;

/** Reads a CSS custom property from the document root (browser-only). */
export function readOverviewCssVar(name: string, fallback: string): string {
	if (typeof document === 'undefined') return fallback;
	const v = getComputedStyle(document.documentElement).getPropertyValue(name);
	return (v || '').trim() || fallback;
}

/** Mounts the MAU line chart; returns a destroy callback. */
export async function mountMauLineChart(
	target: HTMLCanvasElement,
	series: OverviewChartPoint[],
	cssVar: CssVarReader,
): Promise<any> {
	const mod = await import('chart.js');
	if (!target.isConnected) return () => {};
	mod.Chart.register(...mod.registerables);

	const text = cssVar('--text-primary', '#FAFAFA');
	const muted = cssVar('--text-secondary', '#A1A1AA');
	const grid = cssVar('--chart-grid', 'rgba(255,255,255,0.05)');

	const chart = new mod.Chart(target, {
		type: 'line',
		data: {
			labels: series.map((p) => p.label),
			datasets: [
				{
					label: 'Monthly active users',
					data: series.map((p) => p.value),
					borderColor: '#14b8a6',
					backgroundColor: 'rgba(20, 184, 166,0.14)',
					borderWidth: 2.5,
					tension: 0.35,
					fill: true,
					pointRadius: 3,
					pointHoverRadius: 5,
					pointBackgroundColor: '#14b8a6',
					pointBorderColor: '#ffffff',
					pointBorderWidth: 1.5,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: { duration: 420 },
			plugins: {
				legend: { display: false },
				tooltip: {
					titleFont: { family: 'Geist Mono, monospace' },
					bodyFont: { family: 'Geist Mono, monospace' },
					backgroundColor: 'rgba(9,9,11,0.92)',
					titleColor: '#fafafa',
					bodyColor: '#d4d4d8',
					padding: 10,
					cornerRadius: 8,
					displayColors: false,
				},
			},
			scales: {
				x: {
					ticks: { color: muted, font: { family: 'Geist Mono, monospace', size: 11, weight: 'bold' } },
					grid: { color: 'transparent' },
				},
				y: {
					beginAtZero: true,
					ticks: { color: muted, font: { family: 'Geist Mono, monospace', size: 11 }, precision: 0 },
					grid: { color: grid },
					border: { display: false },
				},
			},
		},
	});
	void text;

	return chart;
}

/** Mounts the revenue-by-tier doughnut chart; returns a destroy callback. */
export async function mountRevenueDoughnutChart(
	target: HTMLCanvasElement,
	series: OverviewChartPoint[],
	cssVar: CssVarReader,
): Promise<any> {
	const mod = await import('chart.js');
	if (!target.isConnected) return () => {};
	mod.Chart.register(...mod.registerables);

	const muted = cssVar('--text-secondary', '#A1A1AA');
	const palette = ['#14b8a6', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#38bdf8'];

	const chart = new mod.Chart(target, {
		type: 'doughnut',
		data: {
			labels: series.map((p) => p.label),
			datasets: [
				{
					data: series.map((p) => p.value),
					backgroundColor: series.map((_, i) => palette[i % palette.length]),
					borderColor: 'rgba(0,0,0,0)',
					borderWidth: 2,
					hoverOffset: 6,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			cutout: '64%',
			animation: { duration: 480 },
			plugins: {
				legend: {
					position: 'bottom',
					labels: {
						color: muted,
						font: { size: 10, weight: 600 },
						boxWidth: 10,
						boxHeight: 10,
						padding: 8,
						usePointStyle: true,
					},
				},
				tooltip: {
					titleFont: { family: 'Geist Mono, monospace' },
					bodyFont: { family: 'Geist Mono, monospace' },
					backgroundColor: 'rgba(9,9,11,0.92)',
					titleColor: '#fafafa',
					bodyColor: '#d4d4d8',
					padding: 10,
					cornerRadius: 8,
					callbacks: {
						label: (ctx) => {
							const total = ctx.dataset.data.reduce((a, b) => Number(a) + Number(b), 0);
							const pct = total > 0 ? Math.round((Number(ctx.parsed) / total) * 100) : 0;
							return ` $${Number(ctx.parsed).toLocaleString()} · ${pct}%`;
						},
					},
				},
			},
		},
	});

	return chart;
}

/** Mounts the players-by-sport bar chart; returns a destroy callback. */
export async function mountSportBarChart(
	target: HTMLCanvasElement,
	series: OverviewChartPoint[],
	cssVar: CssVarReader,
): Promise<any> {
	const mod = await import('chart.js');
	if (!target.isConnected) return () => {};
	mod.Chart.register(...mod.registerables);

	const text = cssVar('--text-primary', '#FAFAFA');
	const muted = cssVar('--text-secondary', '#A1A1AA');
	const grid = cssVar('--chart-grid', 'rgba(255,255,255,0.05)');

	const chart = new mod.Chart(target, {
		type: 'bar',
		data: {
			labels: series.map((p) => p.label),
			datasets: [
				{
					label: 'Players',
					data: series.map((p) => p.value),
					backgroundColor: 'rgba(20, 184, 166, 0.45)',
					borderColor: 'rgba(20, 184, 166, 0.9)',
					borderWidth: 1,
					borderRadius: 4,
					maxBarThickness: 28,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: { duration: 400 },
			plugins: {
				legend: { display: false },
				tooltip: {
					titleFont: { family: 'Geist Mono, monospace' },
					bodyFont: { family: 'Geist Mono, monospace' },
					backgroundColor: 'rgba(9,9,11,0.92)',
					titleColor: '#fafafa',
					bodyColor: '#d4d4d8',
					padding: 8,
					cornerRadius: 8,
					displayColors: false,
				},
			},
			scales: {
				x: {
					ticks: {
						color: muted,
						font: { size: 10, weight: 600 },
						maxRotation: 45,
						minRotation: 0,
					},
					grid: { color: 'transparent' },
					border: { display: false },
				},
				y: {
					beginAtZero: true,
					ticks: { color: muted, font: { size: 10 }, precision: 0 },
					grid: { color: grid },
					border: { display: false },
				},
			},
		},
	});
	void text;

	return chart;
}
