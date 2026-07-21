/**
 * gamificationMath.ts
 * ───────────────────
 * Extracted mathematical logic for gamification and progression systems
 * to ensure functions stay within the 80-line cap limit and are easily testable.
 */

import type { ScoutsSix } from '$lib/states/ArmoryEngine.svelte.js';

/**
 * Apply a percentage decay to the Scout's Six metrics.
 *
 * "Higher is better" metrics (PAC, POW, VAN, STM) are multiplied by (1 - decayPct).
 * "Lower is better" metrics (ACC, AGI) are mathematically tricky, but to maintain
 * the loss-avoidance mechanic, we degrade performance by increasing their time values
 * by (1 + decayPct).
 *
 * @param stats Current Scout's Six string values (e.g. "21.4 MPH")
 * @param decayPct Percentage to decay (e.g. 0.02 for 2%)
 * @returns A new object with the degraded Scout's Six string values.
 */
export function applyScoutsSixDecay(
	stats: Partial<ScoutsSix>,
	decayPct: number
): Partial<ScoutsSix> {
	if (decayPct <= 0) return { ...stats };

	const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

	const degraded: Partial<ScoutsSix> = { ...stats };

	// PAC: mph, higher is better, max ~35
	if (stats.PAC) {
		const n = parseFloat(stats.PAC.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.PAC = `${(clamp(n * (1 - decayPct), 0, 35)).toFixed(1)} MPH`;
	}

	// ACC: seconds, lower is better (0 to ~3.5s)
	if (stats.ACC) {
		const n = parseFloat(stats.ACC.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.ACC = `${(clamp(n * (1 + decayPct), 0, 3.5)).toFixed(2)}s`;
	}

	// POW: inches, higher is better
	if (stats.POW) {
		const n = parseFloat(stats.POW.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.POW = `${Math.floor(clamp(n * (1 - decayPct), 0, 55))} in`;
	}

	// VAN: composite rating 0-99, higher is better
	if (stats.VAN) {
		const n = parseFloat(stats.VAN.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.VAN = `${Math.floor(clamp(n * (1 - decayPct), 0, 99))}`;
	}

	// STM: RPG level 0-99, higher is better
	if (stats.STM) {
		const n = parseFloat(stats.STM.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.STM = `Lvl ${Math.floor(clamp(n * (1 - decayPct), 0, 99))}`;
	}

	// AGI: seconds, lower is better (0 to 9s)
	if (stats.AGI) {
		const n = parseFloat(stats.AGI.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.AGI = `${(clamp(n * (1 + decayPct), 0, 9)).toFixed(2)}s`;
	}

	return degraded;
}
