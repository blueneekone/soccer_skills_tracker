/**
 * Vanguard Prism — shared normalizer for the 6-axis attribute hexagon.
 *
 * Used by both AttributeRadar (dashboard chart) and any future VanguardPrism
 * stat-hex so they share one source of truth for value derivation.
 *
 * Axis order (ALWAYS maintained): PACE · ACCEL · AGILITY · STAMINA · POWER · COMP
 * (Sixth axis is composite / armory `VAN` — labeled COMP in UI to avoid clashing with product name.)
 *
 * Hybrid strategy (in priority order per axis):
 *   1. Prefer numeric value from player_stats doc (coach-entered telemetry).
 *   2. Fall back to parsed armory.stats string (PAC / ACC / AGI / STM / POW / VAN).
 *   3. Final fallback: 0 — renders a near-collapsed shape so missing data is obvious.
 */

/** @typedef {{ PAC?: string; ACC?: string; AGI?: string; STM?: string; POW?: string; VAN?: string }} ArmoryStats */

/**
 * Normalize a raw numeric value to 0-99 range.
 * @param {unknown} raw
 * @returns {number | null}
 */
function asRating(raw) {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0) return null;
	return Math.min(99, Math.max(0, Math.round(n)));
}

/**
 * Parse PAC armory string, e.g. "23 MPH" → 0-99.
 * Scale: 0 MPH = 0, 30+ MPH = 99.
 * @param {string | undefined} s
 * @returns {number}
 */
function parsePace(s) {
	if (!s) return 0;
	const mph = parseFloat(s);
	if (!Number.isFinite(mph)) return 0;
	return Math.min(99, Math.max(0, Math.round((mph / 30) * 99)));
}

/**
 * Parse ACC armory string, e.g. "3.5s" → 0-99.
 * Scale: faster (lower seconds) = higher score. 2.0s = 99, 5.5s+ = 0.
 * @param {string | undefined} s
 * @returns {number}
 */
function parseAccel(s) {
	if (!s) return 0;
	const sec = parseFloat(s);
	if (!Number.isFinite(sec) || sec <= 0) return 0;
	const normalized = (5.5 - Math.min(5.5, Math.max(2.0, sec))) / (5.5 - 2.0);
	return Math.min(99, Math.max(0, Math.round(normalized * 99)));
}

/**
 * Parse AGI armory string, e.g. "5.0s" → 0-99.
 * Scale: faster (lower seconds) = higher score. 3.5s = 99, 7.0s+ = 0.
 * @param {string | undefined} s
 * @returns {number}
 */
function parseAgility(s) {
	if (!s) return 0;
	const sec = parseFloat(s);
	if (!Number.isFinite(sec) || sec <= 0) return 0;
	const normalized = (7.0 - Math.min(7.0, Math.max(3.5, sec))) / (7.0 - 3.5);
	return Math.min(99, Math.max(0, Math.round(normalized * 99)));
}

/**
 * Parse STM armory string, e.g. "Lvl 3" → 0-99.
 * Scale: Lvl 0 = 0, Lvl 10 = 99.
 * @param {string | undefined} s
 * @returns {number}
 */
function parseStamina(s) {
	if (!s) return 0;
	const match = s.match(/(\d+(?:\.\d+)?)/);
	if (!match) return 0;
	const lvl = parseFloat(match[1]);
	return Math.min(99, Math.max(0, Math.round((lvl / 10) * 99)));
}

/**
 * Parse POW armory string, e.g. "42 in" → 0-99.
 * Scale: vertical in inches. 0 in = 0, 50+ in = 99.
 * @param {string | undefined} s
 * @returns {number}
 */
function parsePower(s) {
	if (!s) return 0;
	const inches = parseFloat(s);
	if (!Number.isFinite(inches)) return 0;
	return Math.min(99, Math.max(0, Math.round((inches / 50) * 99)));
}

/**
 * Parse VAN armory string, e.g. "7" → 0-99.
 * Treated as a direct 0-99 score (clamped).
 * @param {string | undefined} s
 * @returns {number}
 */
function parseVanguard(s) {
	if (!s) return 0;
	const n = parseFloat(s);
	if (!Number.isFinite(n)) return 0;
	return Math.min(99, Math.max(0, Math.round(n)));
}

/**
 * Derive 6 normalized 0-99 values for the Vanguard Prism axes.
 *
 * Axis order (matches VanguardPrism.svelte SLOTS, clockwise from top):
 *   [PACE, ACCEL, POWER, COMP, STAMINA, AGILITY]
 *
 * Sprint 9.4: order realigned from [PACE,ACCEL,AGILITY,STAMINA,POWER,COMP] so
 * the dashboard AttributeRadar shares one vertex layout with the Armory widget.
 *
 * @param {Record<string, unknown> | null} statsRaw  player_stats doc (coach telemetry)
 * @param {ArmoryStats} armoryStats  activePlayer.armory.stats strings
 * @returns {number[]} 6 values 0-99
 */
export function deriveVanguardPrism(statsRaw, armoryStats) {
	/** @param {string[]} keys @returns {number | null} */
	function pickStat(keys) {
		if (!statsRaw) return null;
		for (const k of keys) {
			const v = asRating(statsRaw[k]);
			if (v !== null) return v;
		}
		return null;
	}

	const pace     = pickStat(['pace', 'speed', 'pac'])            ?? parsePace(armoryStats?.PAC)     ?? 0;
	const accel    = pickStat(['acceleration', 'accel', 'acc'])    ?? parseAccel(armoryStats?.ACC)    ?? 0;
	const power    = pickStat(['power', 'strength', 'physical', 'pow']) ?? parsePower(armoryStats?.POW) ?? 0;
	const vanguard = pickStat(['vanguard', 'van', 'grit', 'composure', 'comp']) ?? parseVanguard(armoryStats?.VAN) ?? 0;
	const stamina  = pickStat(['stamina', 'endurance', 'fitness', 'stm']) ?? parseStamina(armoryStats?.STM) ?? 0;
	const agility  = pickStat(['agility', 'agi'])                  ?? parseAgility(armoryStats?.AGI)  ?? 0;

	return [pace, accel, power, vanguard, stamina, agility];
}

/**
 * Canonical axis labels — clockwise from top, matching VanguardPrism.svelte SLOTS.
 * Sprint 9.4: realigned from PACE/ACCEL/AGILITY/STAMINA/POWER/COMP.
 */
/** Short Vanguard Protocol codes — aligned with ROADMAP EPIC 5 axes. */
export const VANGUARD_PRISM_LABELS = /** @type {const} */ ([
	'PAC', 'ACC', 'POW', 'COMP', 'STM', 'AGI',
]);
