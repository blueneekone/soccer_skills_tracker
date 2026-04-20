/**
 * Strict B2B Chart.js defaults — monochromatic + single brand accent.
 * Gridlines: rgba(0,0,0,0.04) per Epic 19 spec.
 */

const GRID = 'rgba(0, 0, 0, 0.04)';
const BORDER_SOFT = 'rgba(0, 0, 0, 0.08)';
const TEXT = '#52525b';
const TEXT_MUTED = '#a1a1aa';

/** Brand accent (amber) — single highlight color */
export const EC_ACCENT = 'var(--brand-primary, #f59e0b)';
export const EC_INK = '#3f3f46';
export const EC_INK_LIGHT = '#a1a1aa';
export const EC_SURFACE = '#fafafa';

/**
 * @param {boolean} [isDark]
 */
export function enterpriseChartOptions(isDark = false) {
	const grid = isDark ? 'rgba(255,255,255,0.06)' : GRID;
	const tick = isDark ? '#a1a1aa' : TEXT;
	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'bottom',
				labels: {
					color: tick,
					boxWidth: 10,
					font: { size: 11, weight: '500' },
				},
			},
			tooltip: {
				backgroundColor: isDark ? '#18181b' : '#ffffff',
				titleColor: tick,
				bodyColor: tick,
				borderColor: BORDER_SOFT,
				borderWidth: 1,
				padding: 10,
				displayColors: true,
				cornerRadius: 8,
			},
		},
		scales:
			isDark ?
				{}
			:	{
					x: {
						grid: { color: grid, drawBorder: false },
						ticks: { color: TEXT_MUTED, font: { size: 11 } },
						border: { color: BORDER_SOFT },
					},
					y: {
						grid: { color: grid, drawBorder: false },
						ticks: { color: TEXT_MUTED, font: { size: 11 } },
						border: { color: BORDER_SOFT },
					},
				},
	};
}

/** Doughnut / pie — no category scale */
export function enterpriseRadialOptions(isDark = false) {
	const tick = isDark ? '#a1a1aa' : TEXT;
	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'bottom',
				labels: {
					color: tick,
					boxWidth: 10,
					font: { size: 11, weight: '500' },
				},
			},
			tooltip: {
				backgroundColor: isDark ? '#18181b' : '#ffffff',
				titleColor: tick,
				bodyColor: tick,
				borderColor: 'rgba(0,0,0,0.08)',
				borderWidth: 1,
				padding: 10,
				cornerRadius: 8,
			},
		},
	};
}
