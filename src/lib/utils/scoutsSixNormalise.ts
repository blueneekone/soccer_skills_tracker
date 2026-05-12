/**
 * scoutsSixNormalise.ts
 * ─────────────────────
 * Shared normalisation helper for ScoutsSix string values → [0, 1].
 *
 * Extracted from VanguardPrism.svelte so the same formula is shared by:
 *   • VanguardPrism.svelte  — hexagonal stat radar
 *   • SkillTreeEngine.svelte.ts — Composite Snowflake progression fill
 *
 * Normalisation windows (calibrated to real athletic performance ranges):
 *
 *   PAC  "n MPH"     → n / 35           (0–35 mph; higher = better)
 *   ACC  "n.nns"     → (3.5 − n) / 3    (0–3.5s; lower = faster = better)
 *   POW  "n in"      → n / 55           (0–55 inches; higher = better)
 *   VAN  "n"         → n / 99           (0–99 composite; direct)
 *   STM  "Lvl n"     → n / 99           (0–99 RPG level; direct)
 *   AGI  "n.nns"     → (9 − n) / 7     (0–9s; lower = faster = better)
 *
 * Returns a value clamped to [0, 1].  Unparseable / missing input → 0.
 */

import type { ScoutsSix } from '$lib/states/ArmoryEngine.svelte.js';

/**
 * Normalise a single ScoutsSix string value to [0, 1].
 *
 * @param key  The ScoutsSix attribute key.
 * @param raw  The raw string value stored by ArmoryEngine (e.g. "21.4 MPH").
 * @returns    Normalised float in [0, 1].  Returns 0 for missing/invalid input.
 */
export function normaliseScoutsSix(
	key: keyof ScoutsSix,
	raw: string | undefined,
): number {
	if (!raw) return 0;
	const n = parseFloat(raw.replace(/[^\d.]/g, ''));
	if (isNaN(n) || n < 0) return 0;

	let v: number;
	switch (key) {
		case 'PAC': v = n / 35;          break; // mph, higher is better
		case 'ACC': v = (3.5 - n) / 3;   break; // seconds, lower is better
		case 'POW': v = n / 55;           break; // inches, higher is better
		case 'VAN': v = n / 99;           break; // composite rating 0–99
		case 'STM': v = n / 99;           break; // RPG level 0–99
		case 'AGI': v = (9 - n) / 7;     break; // seconds, lower is better
		default:    v = n / 99;
	}
	return Math.max(0, Math.min(1, v));
}

/**
 * Normalise all six ScoutsSix values at once.
 * Useful when the engine needs a full attribute map for the snowflake.
 */
export function normaliseAllScoutsSix(
	stats: Partial<ScoutsSix>,
): Record<keyof ScoutsSix, number> {
	return {
		PAC: normaliseScoutsSix('PAC', stats.PAC),
		ACC: normaliseScoutsSix('ACC', stats.ACC),
		POW: normaliseScoutsSix('POW', stats.POW),
		VAN: normaliseScoutsSix('VAN', stats.VAN),
		STM: normaliseScoutsSix('STM', stats.STM),
		AGI: normaliseScoutsSix('AGI', stats.AGI),
	};
}
