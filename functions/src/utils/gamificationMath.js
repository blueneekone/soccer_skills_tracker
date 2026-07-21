/**
 * gamificationMath.js
 * ───────────────────
 * Extracted mathematical logic for gamification and progression systems
 * to ensure functions stay within the 80-line cap limit and are easily testable.
 */

/**
 * Apply a percentage decay to the Scout's Six metrics.
 *
 * "Higher is better" metrics (PAC, POW, VAN, STM) are multiplied by (1 - decayPct).
 * "Lower is better" metrics (ACC, AGI) are mathematically tricky, but to maintain
 * the loss-avoidance mechanic, we degrade performance by increasing their time values
 * by (1 + decayPct).
 *
 * @param {Record<string, string>} stats Current Scout's Six string values (e.g. "21.4 MPH")
 * @param {number} decayPct Percentage to decay (e.g. 0.02 for 2%)
 * @returns {Record<string, string>} A new object with the degraded Scout's Six string values.
 */
function applyScoutsSixDecay(stats, decayPct) {
	if (decayPct <= 0 || !stats) return { ...stats };

	const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
	const degraded = { ...stats };

	if (stats.PAC) {
		const n = parseFloat(stats.PAC.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.PAC = `${(clamp(n * (1 - decayPct), 0, 35)).toFixed(1)} MPH`;
	}
	if (stats.ACC) {
		const n = parseFloat(stats.ACC.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.ACC = `${(clamp(n * (1 + decayPct), 0, 3.5)).toFixed(2)}s`;
	}
	if (stats.POW) {
		const n = parseFloat(stats.POW.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.POW = `${Math.floor(clamp(n * (1 - decayPct), 0, 55))} in`;
	}
	if (stats.VAN) {
		const n = parseFloat(stats.VAN.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.VAN = `${Math.floor(clamp(n * (1 - decayPct), 0, 99))}`;
	}
	if (stats.STM) {
		const n = parseFloat(stats.STM.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.STM = `Lvl ${Math.floor(clamp(n * (1 - decayPct), 0, 99))}`;
	}
	if (stats.AGI) {
		const n = parseFloat(stats.AGI.replace(/[^\d.]/g, ''));
		if (!isNaN(n)) degraded.AGI = `${(clamp(n * (1 + decayPct), 0, 9)).toFixed(2)}s`;
	}

	return degraded;
}

module.exports = {
	applyScoutsSixDecay
};
