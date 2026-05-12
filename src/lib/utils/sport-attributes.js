import { normalizeClubSport } from '$lib/utils/sport-icon.js';
import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';

/**
 * @typedef {{ keys: string[], labels: string[] }} SportAttributeSchema
 */

/**
 * Hardcoded fallback — used when sportsConfigStore has no entry yet (cold
 * boot, offline, or before the Firestore snapshot arrives).  Never removed:
 * this is the read-repair source of truth per the plan invariants.
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
	hockey: {
		keys: ['skating', 'shooting', 'stickhandling', 'passing', 'defense', 'physicality'],
		labels: ['Skating', 'Shooting', 'Stickhandling', 'Passing', 'Defense', 'Physicality'],
	},
	lacrosse: {
		keys: ['stick_skills', 'shooting', 'speed', 'field_vision', 'defense', 'athleticism'],
		labels: ['Stick Skills', 'Shooting', 'Speed', 'Field Vision', 'Defense', 'Athleticism'],
	},
	generic: {
		keys: ['speed', 'power', 'technique', 'iq', 'defense', 'physical'],
		labels: ['Speed', 'Power', 'Technique', 'IQ', 'Defense', 'Physical'],
	},
};

/**
 * Resolve the attribute schema for UI + `player_stats` field keys from a raw sport string.
 *
 * Resolution order:
 *   1. sportsConfigStore.resolveActiveConfig(sportRaw) — Firestore-backed live config.
 *   2. Hardcoded SPORT_ATTRIBUTE_SCHEMAS — offline / cold-boot fallback.
 *
 * @param {string} [sportRaw]
 * @returns {SportAttributeSchema & { canonicalKey: string }}
 */
export function getAttributeSchemaForSport(sportRaw) {
	// 1. Live store path — preferred
	try {
		const cfg = sportsConfigStore.resolveActiveConfig(sportRaw);
		if (cfg && Array.isArray(cfg.attributes) && cfg.attributes.length === 6) {
			return {
				keys: cfg.attributes.map((a) => a.playerStatKey),
				labels: cfg.attributes.map((a) => a.name),
				canonicalKey: cfg.sportId,
			};
		}
	} catch {
		// store not yet hydrated — fall through
	}

	// 2. Hardcoded fallback
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

/**
 * True when every attribute in the sport schema has a stored 0–99 rating on the
 * `player_stats` document (top-level) or under `skills` — i.e. not XP-derived filler.
 *
 * @param {Record<string, unknown> | null} d
 * @param {SportAttributeSchema} schema
 * @returns {boolean}
 */
export function hasDocumentedSkillRatings(d, schema) {
	if (!d || typeof d !== 'object') return false;
	const keys = schema.keys;
	const fromFlat = keys.map((k) => pickNum(d, k));
	if (fromFlat.every((x) => x !== null)) return true;
	const sk =
		'skills' in d && d.skills && typeof d.skills === 'object' && !Array.isArray(d.skills) ?
			/** @type {Record<string, unknown>} */ (d.skills)
		:	null;
	if (!sk) return false;
	const fromSkills = keys.map((k) => pickNum(sk, k));
	return fromSkills.every((x) => x !== null);
}

/**
 * Single-attribute rating from flat `player_stats` or nested `skills`.
 *
 * @param {Record<string, unknown> | null} d
 * @param {string} k
 * @returns {number | null}
 */
export function pickSkillRatingForKey(d, k) {
	if (!d) return null;
	const flat = pickNum(d, k);
	if (flat !== null) return flat;
	const sk =
		'skills' in d && d.skills && typeof d.skills === 'object' && !Array.isArray(d.skills) ?
			/** @type {Record<string, unknown>} */ (d.skills)
		:	null;
	if (!sk) return null;
	return pickNum(sk, k);
}

/**
 * Parse coach-entered trial result strings into a 0–100 dossier score.
 * Mirrors analytics normalization used on `/stats`.
 *
 * @param {unknown} raw
 * @returns {number}
 */
export function parseCoachTrialResult(raw) {
	const s = String(raw ?? '').trim();
	const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
	if (frac) {
		const a = Number(frac[1]);
		const b = Number(frac[2]);
		if (b > 0 && Number.isFinite(a)) {
			return Math.min(100, Math.max(0, Math.round((100 * a) / b)));
		}
	}
	const n = parseFloat(s);
	if (Number.isFinite(n)) return Math.min(100, Math.max(0, Math.round(n)));
	const low = s.toLowerCase();
	if (low.includes('master')) return 92;
	if (low.includes('good')) return 72;
	if (low.includes('struggle')) return 45;
	return 55;
}

/**
 * Six-axis dossier radar: coach-verified `verified_trial_scores` keyed by sport attributes when possible,
 * with deriveSkillValuesForSchema filling gaps (parity with Elite/combine-style ratings).
 *
 * @param {Record<string, unknown> | null | undefined} psData `player_stats` snapshot
 * @param {Record<string, unknown>} verifiedTrialScores
 * @param {string | undefined} sportRaw team/club sport string
 * @returns {{ values: number[]; labels: string[]; radarTag: string }}
 */
export function dossierRadarFromPlayerStats(psData, verifiedTrialScores, sportRaw) {
	const schema = getAttributeSchemaForSport(sportRaw);
	const xp = typeof psData?.total_xp === 'number' && !Number.isNaN(psData.total_xp) ?
		Math.max(0, Math.floor(psData.total_xp))
	:	0;
	const streakRaw =
		typeof psData?.current_streak === 'number' && !Number.isNaN(psData.current_streak) ?
			psData.current_streak
		:	typeof psData?.currentStreak === 'number' && !Number.isNaN(psData.currentStreak) ?
				psData.currentStreak
			:	0;
	const st = Math.max(0, Math.floor(streakRaw));

	const base = deriveSkillValuesForSchema(psData, schema, xp, st);
	const vt = verifiedTrialScores && typeof verifiedTrialScores === 'object' ? verifiedTrialScores : {};

	const parsedPairs = Object.entries(vt).map(([k, raw]) => ({
		k: String(k).toLowerCase(),
		v: parseCoachTrialResult(raw),
	}));
	const avgTrial =
		parsedPairs.length ?
			Math.round(parsedPairs.reduce((a, p) => a + p.v, 0) / parsedPairs.length) :
			null;

	const values = schema.keys.map((key, i) => {
		const exact = vt[key];
		if (exact != null) return parseCoachTrialResult(exact);
		const fuzzy = parsedPairs.find((p) => p.k === key.toLowerCase());
		if (fuzzy) return fuzzy.v;
		if (avgTrial != null) return Math.min(99, Math.max(10, avgTrial));
		return base.values[i] ?? 45;
	});

	const labels = schema.labels.map((l) => String(l).toUpperCase());
	const radarTag = `RDR_S6_${schema.canonicalKey}`;
	return { values, labels, radarTag };
}
