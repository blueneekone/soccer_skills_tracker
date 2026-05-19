/**
 * Vanguard Protocol — six-axis player dashboard model (EPIC 5 / Sprint 1.4).
 * Single source of truth for HUD bars, radar labels, and armory key mapping.
 *
 * Axis order matches `deriveVanguardPrism()` return indices in vanguard-prism.js:
 *   [PAC, ACC, POW, COMP, STM, AGI]
 */

export type VanguardAxisId = 'PAC' | 'ACC' | 'POW' | 'COMP' | 'STM' | 'AGI';

export type VanguardAxisRow = {
	id: VanguardAxisId;
	label: VanguardAxisId;
	fullName: string;
	value: number;
	display: string;
	pct: number;
	prismIndex: number;
};

export const VANGUARD_PROTOCOL_AXES: ReadonlyArray<{
	id: VanguardAxisId;
	label: VanguardAxisId;
	fullName: string;
	prismIndex: number;
}> = Object.freeze([
	{ id: 'PAC', label: 'PAC', fullName: 'Pace', prismIndex: 0 },
	{ id: 'ACC', label: 'ACC', fullName: 'Acceleration', prismIndex: 1 },
	{ id: 'POW', label: 'POW', fullName: 'Power', prismIndex: 2 },
	{ id: 'COMP', label: 'COMP', fullName: 'Composure', prismIndex: 3 },
	{ id: 'STM', label: 'STM', fullName: 'Stamina', prismIndex: 4 },
	{ id: 'AGI', label: 'AGI', fullName: 'Agility', prismIndex: 5 },
]);

export type PowerMetric = {
	key: string;
	label: string;
	display: string;
};

function clampRating(n: number): number {
	return Math.min(99, Math.max(0, Math.floor(n)));
}

function formatRating(n: number): string {
	return String(clampRating(n)).padStart(2, '0');
}

/**
 * Map six prism values (0–99) to scannable Vanguard Protocol rows.
 */
export function buildVanguardProtocolRows(prismValues: readonly number[]): VanguardAxisRow[] {
	return VANGUARD_PROTOCOL_AXES.map((axis) => {
		const raw = prismValues[axis.prismIndex];
		const value = clampRating(Number(raw) || 0);
		return {
			...axis,
			value,
			display: formatRating(value),
			pct: Math.round((value / 99) * 1000) / 10,
		};
	});
}

function pickDisplay(
	raw: Record<string, unknown> | null,
	keys: string[],
	suffix = '',
): string | null {
	if (!raw) return null;
	for (const k of keys) {
		const v = raw[k];
		if (v === undefined || v === null || v === '') continue;
		if (typeof v === 'number' && Number.isFinite(v)) {
			return `${v}${suffix}`;
		}
		const s = String(v).trim();
		if (s) return suffix ? `${s}${suffix}` : s;
	}
	return null;
}

/**
 * Secondary power-user metrics (xG, passing) — hidden until card expand / hover detail.
 */
export function extractPowerMetrics(
	statsRaw: Record<string, unknown> | null,
): PowerMetric[] {
	if (!statsRaw || typeof statsRaw !== 'object') return [];

	const technical =
		statsRaw.technical && typeof statsRaw.technical === 'object' && !Array.isArray(statsRaw.technical)
			? (statsRaw.technical as Record<string, unknown>)
			: statsRaw;

	const metrics: Array<PowerMetric | null> = [
		pickDisplay(technical, ['xg', 'xG', 'expected_goals', 'expectedGoals'])
			? {
					key: 'xg',
					label: 'xG',
					display: pickDisplay(technical, ['xg', 'xG', 'expected_goals', 'expectedGoals'])!,
				}
			: null,
		pickDisplay(technical, ['pass_accuracy', 'passAccuracy', 'pass_completion'])
			? {
					key: 'pass_accuracy',
					label: 'Pass %',
					display: pickDisplay(technical, ['pass_accuracy', 'passAccuracy', 'pass_completion'])!,
				}
			: null,
		pickDisplay(technical, ['passing', 'passes_completed'])
			? {
					key: 'passing',
					label: 'Passing',
					display: pickDisplay(technical, ['passing', 'passes_completed'])!,
				}
			: null,
		pickDisplay(technical, ['assists', 'assist'])
			? {
					key: 'assists',
					label: 'Assists',
					display: pickDisplay(technical, ['assists', 'assist'])!,
				}
			: null,
		pickDisplay(technical, ['shots_on_target', 'shotsOnTarget', 'sot'])
			? {
					key: 'sot',
					label: 'Shots on target',
					display: pickDisplay(technical, ['shots_on_target', 'shotsOnTarget', 'sot'])!,
				}
			: null,
	];

	return metrics.filter((m): m is PowerMetric => m !== null);
}

/**
 * True when any prism axis has coach-entered non-zero telemetry (not armory-only zeros).
 */
export function hasVanguardTelemetry(prismValues: readonly number[]): boolean {
	return prismValues.some((v) => clampRating(Number(v) || 0) > 0);
}
