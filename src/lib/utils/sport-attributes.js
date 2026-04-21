import { normalizeClubSport } from '$lib/utils/sport-icon.js';

/**
 * @typedef {{ keys: string[], labels: string[] }} SportAttributeSchema
 */

/**
 * Six core Ultimate Team attributes per sport (keys = Firestore `player_stats` / `skills` fields).
 * @type {Record<string, SportAttributeSchema>}
 */
export const SPORT_ATTRIBUTE_SCHEMAS = {
	soccer: {
		keys: ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'],
		labels: ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defending', 'Physical'],
	},
	basketball: {
		keys: ['shooting', 'playmaking', 'rebounding', 'defense', 'athletics', 'finishing'],
		labels: ['Shooting', 'Playmaking', 'Rebounding', 'Defense', 'Athletics', 'Finishing'],
	},
	baseball: {
		keys: ['hitting', 'power', 'fielding', 'arm', 'speed', 'vision'],
		labels: ['Hitting', 'Power', 'Fielding', 'Arm', 'Speed', 'Vision'],
	},
	football: {
		keys: ['speed', 'strength', 'agility', 'awareness', 'tackling', 'catching'],
		labels: ['Speed', 'Strength', 'Agility', 'Awareness', 'Tackling', 'Catching'],
	},
	volleyball: {
		keys: ['serving', 'spiking', 'blocking', 'setting', 'passing', 'agility'],
		labels: ['Serving', 'Spiking', 'Blocking', 'Setting', 'Passing', 'Agility'],
	},
	generic: {
		keys: ['speed', 'power', 'technique', 'iq', 'defense', 'physical'],
		labels: ['Speed', 'Power', 'Technique', 'IQ', 'Defense', 'Physical'],
	},
};

/**
 * Resolve the attribute schema for UI + `player_stats` field keys from a raw sport string
 * (club `sport`, team `sport`, etc.). Unknown sports (e.g. hockey) use `generic`.
 *
 * @param {string} [sportRaw]
 * @returns {SportAttributeSchema & { canonicalKey: string }}
 */
export function getAttributeSchemaForSport(sportRaw) {
	const key = normalizeClubSport(sportRaw);
	const mapKey = key in SPORT_ATTRIBUTE_SCHEMAS ? key : 'generic';
	const schema = SPORT_ATTRIBUTE_SCHEMAS[mapKey] || SPORT_ATTRIBUTE_SCHEMAS.generic;
	return { ...schema, canonicalKey: mapKey };
}

/**
 * @param {Record<string, unknown> | null} d
 * @param {string} k
 */
function pickNum(d, k) {
	if (!d || !(k in d)) return null;
	const v = Number(/** @type {Record<string, unknown>} */ (d)[k]);
	return Number.isFinite(v) ? Math.min(99, Math.max(0, Math.floor(v))) : null;
}

/**
 * Prefer a slight boost on the first "speed / pace / athletics" slot when streaking (sport-agnostic).
 *
 * @param {string[]} keys
 * @returns {number}
 */
function streakBoostIndex(keys) {
	const speedLike = new Set(['pace', 'speed', 'athletics']);
	const i = keys.findIndex((k) => speedLike.has(k));
	return i >= 0 ? i : 0;
}

/**
 * Build six 0–99 ratings for the radar: use flat `player_stats` keys, then `skills`, then XP-derived mock.
 *
 * @param {Record<string, unknown> | null} d
 * @param {SportAttributeSchema} schema
 * @param {number} totalXp
 * @param {number} streakDays
 * @returns {{ values: number[], labels: string[] }}
 */
export function deriveSkillValuesForSchema(d, schema, totalXp, streakDays) {
	const keys = schema.keys;
	const labels = schema.labels;
	const fromFlat = keys.map((k) => pickNum(d, k));
	if (fromFlat.every((x) => x !== null)) {
		return { values: /** @type {number[]} */ (fromFlat), labels };
	}

	const sk =
		d && typeof d.skills === 'object' && d.skills ?
			/** @type {Record<string, unknown>} */ (d.skills)
		:	null;
	if (sk) {
		const fromSkills = keys.map((k) => pickNum(sk, k));
		if (fromSkills.every((x) => x !== null)) {
			return { values: /** @type {number[]} */ (fromSkills), labels };
		}
	}

	const xp = Math.max(0, Math.floor(totalXp));
	const st = Math.max(0, Math.floor(streakDays));
	const boostIdx = streakBoostIndex(keys);
	const h = (i) => {
		const v = 40 + ((xp * (i + 1) * 17 + st * 31) % 60);
		return Math.min(99, v);
	};
	const values = keys.map((_, i) => {
		let v = h(i);
		if (i === boostIdx) v = Math.min(99, v + Math.min(6, Math.floor(st / 4)));
		return v;
	});
	return { values, labels };
}
