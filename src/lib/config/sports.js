/**
 * DEFAULT_SPORT_CONFIG
 * ────────────────────
 * Canonical 5-attribute RPG schema for soccer — used by the Player OS
 * AttributeRadar and the Read-Repair hook on the Player Dashboard.
 *
 * Each attribute maps to a `player_stats` sub-key (see sport-attributes.js
 * for the 6-axis Ultimate-Team schema used elsewhere — these are intentionally
 * distinct to support the RPG-flavoured Vanguard Manifesto branding).
 *
 * hexColor: per-attribute neon accent used for radar vertex dots + labels.
 */

/** @typedef {{ id: string; name: string; hexColor: string }} SportAttribute */

/** @typedef {{ sportId: string; displayName: string; attributes: SportAttribute[] }} SportConfig */

/** @type {SportConfig} */
export const DEFAULT_SPORT_CONFIG = {
	sportId: 'soccer',
	displayName: 'Vanguard Soccer',
	attributes: [
		{ id: 'ball_mastery', name: 'Ball Mastery',         hexColor: '#00f0ff' }, // Neon Cyan
		{ id: 'striking',     name: 'Striking & Finishing', hexColor: '#ff0055' }, // Neon Pink
		{ id: 'pace',         name: 'Pace & Agility',       hexColor: '#00ff66' }, // Neon Green
		{ id: 'scanning',     name: 'Vision & Scanning',    hexColor: '#ffcc00' }, // Neon Yellow
		{ id: 'grit',         name: 'Crucible Grit',        hexColor: '#9d00ff' }, // Neon Purple
	],
};

/**
 * Map the player_stats / deriveSkillValuesForSchema results (pace, shooting,
 * passing, dribbling, defending, physical) onto the 5 DEFAULT_SPORT_CONFIG
 * attributes for AttributeRadar display.
 *
 * Priority order per attribute:
 *   ball_mastery → dribbling → passing → (xp mock index 0)
 *   striking     → shooting             → (xp mock index 1)
 *   pace         → pace                 → (xp mock index 2)
 *   scanning     → passing → vision     → (xp mock index 3)
 *   grit         → physical → defending  → (xp mock index 4)
 *
 * @param {Record<string, unknown> | null} statsRaw player_stats doc data
 * @param {number[]} derivedValues  output of deriveSkillValuesForSchema (len 6)
 * @returns {number[]} 5 values 0-99 aligned to DEFAULT_SPORT_CONFIG.attributes
 */
export function mapToDefaultAttributes(statsRaw, derivedValues) {
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

	// Indices in the soccer schema: pace=0 shooting=1 passing=2 dribbling=3 defending=4 physical=5
	const v = derivedValues;
	return [
		pick(['dribbling', 'ball_mastery']) ?? v[3] ?? 45, // ball_mastery
		pick(['shooting', 'striking'])      ?? v[1] ?? 45, // striking
		pick(['pace'])                      ?? v[0] ?? 45, // pace
		pick(['passing', 'scanning', 'vision']) ?? v[2] ?? 45, // scanning
		pick(['physical', 'grit', 'defending']) ?? v[5] ?? v[4] ?? 45, // grit
	];
}
