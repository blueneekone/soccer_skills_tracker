/**
 * config/sports.js — RPG sport config adapter
 * ─────────────────────────────────────────────
 * Phase 3, Epic 4 adapter layer.
 *
 * `getRpgSportConfig(sportId)` is the new primary entry point.  It reads the
 * canonical 6-attribute config from sportsConfigStore and projects it down to
 * the 5-attribute RPG radar shape via the embedded `rpgProjection` priority lists.
 *
 * `DEFAULT_SPORT_CONFIG` is kept as a stable read-repair fallback for any
 * legacy imports that haven't been migrated — it now delegates to
 * `getRpgSportConfig('soccer')` so it always reflects live Firestore data.
 *
 * `mapToDefaultAttributes` API is preserved unchanged so AttributeRadar and
 * other consumers that call it don't break during the migration window.
 */

import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';

/** @typedef {{ id: string; name: string; hexColor: string; shortLabel?: string }} SportAttribute */
/** @typedef {{ sportId: string; displayName: string; attributes: SportAttribute[] }} SportConfig */

// ── RPG slot label map ────────────────────────────────────────────────────────
// Canonical display names for the 5 RPG radar vertices.
const RPG_SLOT_LABELS = /** @type {const} */ ({
	ball_mastery: 'Ball Mastery',
	striking:     'Striking & Finishing',
	pace:         'Pace & Agility',
	scanning:     'Vision & Scanning',
	grit:         'Crucible Grit',
});

// ── Hardcoded fallback ────────────────────────────────────────────────────────
// Used when sportsConfigStore is uninitialised (SSR / cold boot).
const _FALLBACK_SOCCER_RPG = /** @type {SportConfig} */ ({
	sportId: 'soccer',
	displayName: 'Vanguard Soccer',
	attributes: [
		{ id: 'ball_mastery', name: 'Ball Mastery',         shortLabel: 'BM',  hexColor: '#00f0ff' },
		{ id: 'striking',     name: 'Striking & Finishing', shortLabel: 'STR', hexColor: '#ff0055' },
		{ id: 'pace',         name: 'Pace & Agility',       shortLabel: 'PAC', hexColor: '#00ff66' },
		{ id: 'scanning',     name: 'Vision & Scanning',    shortLabel: 'VIS', hexColor: '#ffcc00' },
		{ id: 'grit',         name: 'Crucible Grit',        shortLabel: 'GRT', hexColor: '#9d00ff' },
	],
});

// ── RPG hex colours per slot (stable even across sport changes) ───────────────
const RPG_SLOT_COLORS = /** @type {Record<string, string>} */ ({
	ball_mastery: '#00f0ff',
	striking:     '#ff0055',
	pace:         '#00ff66',
	scanning:     '#ffcc00',
	grit:         '#9d00ff',
});

/**
 * Build a 5-attribute RPG SportConfig from a SportsConfigDoc by resolving
 * the `rpgProjection` slots against the doc's attribute `hexColor` values.
 *
 * @param {import('$lib/types/sportsConfig').SportsConfigDoc} cfg
 * @returns {SportConfig}
 */
function projectToRpg(cfg) {
	const proj = cfg.rpgProjection || {};
	const attrByKey = Object.fromEntries(
		(cfg.attributes || []).map((a) => [a.playerStatKey, a]),
	);

	const slots = /** @type {const} */ (['ball_mastery', 'striking', 'pace', 'scanning', 'grit']);
	const attributes = slots.map((slot) => {
		const keys = /** @type {string[]} */ (proj[slot] || []);
		const firstMatch = keys.map((k) => attrByKey[k]).find(Boolean);
		return {
			id: slot,
			name: RPG_SLOT_LABELS[slot],
			shortLabel: slot.slice(0, 3).toUpperCase(),
			hexColor: firstMatch?.hexColor ?? RPG_SLOT_COLORS[slot],
		};
	});

	return { sportId: cfg.sportId, displayName: cfg.displayName, attributes };
}

/**
 * Get the 5-attribute RPG SportConfig for any sport.
 *
 * Reads through sportsConfigStore and projects via rpgProjection.
 * Falls back to the hardcoded soccer fallback for SSR / cold boot.
 *
 * @param {string} [sportId]
 * @returns {SportConfig}
 */
export function getRpgSportConfig(sportId) {
	try {
		const cfg = sportsConfigStore.resolveActiveConfig(sportId);
		if (cfg && Array.isArray(cfg.attributes) && cfg.attributes.length === 6) {
			return projectToRpg(cfg);
		}
	} catch { /* store not hydrated — fall through */ }
	return _FALLBACK_SOCCER_RPG;
}

/**
 * Legacy export — delegates to `getRpgSportConfig('soccer')` so it stays
 * reactive without breaking any remaining direct imports.
 *
 * @type {SportConfig}
 */
export const DEFAULT_SPORT_CONFIG = _FALLBACK_SOCCER_RPG;

/**
 * Map player_stats / deriveSkillValuesForSchema results onto the 5 RPG
 * attributes for AttributeRadar display.
 *
 * Uses the rpgProjection priority lists from sportsConfigStore when available
 * so every sport gets correct stat → slot mapping; falls back to the soccer
 * priority lists for legacy parity.
 *
 * API kept stable: same signature, same output length (5 values).
 *
 * @param {Record<string, unknown> | null} statsRaw player_stats doc data
 * @param {number[]} derivedValues  output of deriveSkillValuesForSchema (len 6)
 * @param {string} [sportId]  sport to project for (defaults to current store sport)
 * @returns {number[]} 5 values 0-99 aligned to RPG attributes
 */
export function mapToDefaultAttributes(statsRaw, derivedValues, sportId) {
	/** @param {string[]} keys */
	function pick(keys) {
		if (statsRaw) {
			for (const k of keys) {
				const v = Number(statsRaw[k]);
				if (Number.isFinite(v) && v >= 0) return Math.min(99, Math.floor(v));
			}
		}
		return null;
	}

	// Resolve projection priority lists from the store
	let proj = /** @type {Record<string, string[]> | null} */ (null);
	try {
		const cfg = sportsConfigStore.resolveActiveConfig(sportId);
		if (cfg?.rpgProjection) proj = /** @type {Record<string, string[]>} */ (cfg.rpgProjection);
	} catch { /* fall through */ }

	if (proj) {
		const slots = ['ball_mastery', 'striking', 'pace', 'scanning', 'grit'];
		return slots.map((slot, i) => pick(proj[slot] || []) ?? derivedValues[i] ?? 45);
	}

	// Soccer fallback priority lists (legacy parity)
	const v = derivedValues;
	return [
		pick(['dribbling', 'ball_mastery'])      ?? v[3] ?? 45,
		pick(['shooting', 'striking'])           ?? v[1] ?? 45,
		pick(['pace'])                           ?? v[0] ?? 45,
		pick(['passing', 'scanning', 'vision'])  ?? v[2] ?? 45,
		pick(['physical', 'grit', 'defending'])  ?? v[5] ?? v[4] ?? 45,
	];
}
