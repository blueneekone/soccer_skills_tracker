/**
 * Elite Player Portal — polynomial RPG-style XP curve (multi-sport).
 * Advance L → L+1: floor(100 × L^1.5). Level 1→2 is exactly 100 XP.
 * Max display level: 99 (aligned with Ultimate Team / sports-game conventions).
 *
 * COPPA: this module is pure math — only numeric totalXp / level in; no user identity.
 */

/** Absolute max level (inclusive). Beyond this, no further advancement. */
export const MAX_PLAYER_LEVEL = 99;

// ── Narrative rank tiers (total career XP) — separate from display level curve ──

/**
 * Ordered ascending by `minXp`. Last tier is the endgame bracket.
 * @type {ReadonlyArray<{ rank: string, minXp: number }>}
 */
export const RANK_THRESHOLDS = Object.freeze([
	{ rank: 'Recruit', minXp: 0 },
	{ rank: 'Rookie', minXp: 1000 },
	{ rank: 'Operative', minXp: 5000 },
	{ rank: 'Specialist', minXp: 15000 },
	{ rank: 'Elite', minXp: 50000 },
]);

/**
 * Default multipliers (override per sport via `sportPayload.gamification`).
 * @type {Readonly<{ xpPerRep: number, xpPerIntenseMinute: number }>}
 */
const DEFAULT_GAMIFICATION_XP = Object.freeze({
	xpPerRep: 10,
	xpPerIntenseMinute: 15,
});

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @returns {{ xpPerRep: number, xpPerIntenseMinute: number }}
 */
function resolveXpRulesFromPayload(raw) {
	const o = raw && typeof raw === 'object' ? raw : {};
	const g = /** @type {Record<string, unknown>} */ (o);
	const game =
		g.gamification && typeof g.gamification === 'object' ?
			/** @type {Record<string, unknown>} */ (g.gamification) :
			g;
	const xr = Math.max(0, Number(game.xpPerRep));
	const xim = Math.max(0, Number(game.xpPerIntenseMinute));
	return {
		xpPerRep: Number.isFinite(xr) && xr > 0 ? xr : DEFAULT_GAMIFICATION_XP.xpPerRep,
		xpPerIntenseMinute:
			Number.isFinite(xim) && xim > 0 ? xim : DEFAULT_GAMIFICATION_XP.xpPerIntenseMinute,
	};
}

/**
 * Workout session input for XP calculation. Shapes align with attested logs / sport packs.
 *
 * @typedef {object} WorkoutDrillRow
 * @property {string} [name] Drill label (ignored for XP math)
 * @property {number} [sets] Sets (≥1, default 1)
 * @property {number} [reps] Reps per set
 * @property {number} [intenseMinutes] High-intensity time attributed to this drill
 * @property {number} [totalReps] If `sets`/`reps` absent, total reps for this row
 *
 * @typedef {object} WorkoutData
 * @property {string} [sport] Sport id (e.g. `soccer`) — reserved for future routing
 * @property {Record<string, unknown>} [sportPayload] Sport config; may include `gamification: { xpPerRep, xpPerIntenseMinute }`
 * @property {WorkoutDrillRow[]} [drills] Per-drill volume; if non-empty, drives calculation
 * @property {number} [totalReps] Session-level reps when `drills` is empty
 * @property {number} [intenseMinutes] Session-level intense minutes when `drills` is empty
 */

/**
 * Convert volume + optional sport `gamification` overrides into session XP.
 * Default: **1 rep → 10 XP**, **1 intense minute → 15 XP** (tunable per sport).
 *
 * @param {Record<string, unknown> | null | undefined} workoutData
 * @returns {number} Non-negative integer XP
 */
export function calculateWorkoutXp(workoutData) {
	const d = workoutData && typeof workoutData === 'object' ? workoutData : {};
	const { xpPerRep, xpPerIntenseMinute } = resolveXpRulesFromPayload(
		'sportPayload' in d && d.sportPayload && typeof d.sportPayload === 'object' ?
			/** @type {Record<string, unknown>} */ (d.sportPayload) :
			d,
	);
	const drills = Array.isArray(d.drills) ? d.drills : [];
	let acc = 0;

	if (drills.length > 0) {
		for (const raw of drills) {
			if (!raw || typeof raw !== 'object') {
				continue;
			}
			const row = /** @type {Record<string, unknown>} */ (raw);
			let repCount = 0;
			const sets = Math.max(1, Math.min(999, Math.floor(Number(row.sets) || 0) || 1));
			const r = Math.max(0, Math.floor(Number(row.reps) || 0));
			if (r > 0) {
				repCount = sets * r;
			} else {
				repCount = Math.max(0, Math.floor(Number(row.totalReps) || 0));
			}
			const im = Math.max(0, Number(row.intenseMinutes) || 0);
			acc += repCount * xpPerRep;
			acc += im * xpPerIntenseMinute;
		}
	} else {
		const tr = Math.max(0, Math.floor(Number(d.totalReps) || 0));
		const tim = Math.max(0, Number(d.intenseMinutes) || 0);
		acc = tr * xpPerRep + tim * xpPerIntenseMinute;
	}

	return Math.max(0, Math.floor(acc));
}

/**
 * XP for a single `logTrainingSession` row — matches server `logTrainingSession`
 * (duration/reps × intensity) via {@link calculateWorkoutXp} gamification overrides.
 *
 * @param {{ duration: number, reps: number, intensity: 'low' | 'medium' | 'high' }} p
 * @returns {number}
 */
export function calculateTrainingSessionEarnedXp(p) {
	const duration = Math.max(0, Math.floor(Number(p.duration) || 0));
	const reps = Math.max(0, Math.floor(Number(p.reps) || 0));
	const ir = String(p.intensity || 'low').toLowerCase();
	const mult = ir === 'high' ? 1.35 : ir === 'medium' ? 1.15 : 1.0;
	return calculateWorkoutXp({
		totalReps: reps,
		intenseMinutes: duration,
		sportPayload: {
			gamification: {
				xpPerRep: 2 * mult,
				xpPerIntenseMinute: 10 * mult,
			},
		},
	});
}

/**
 * @param {number} totalXp
 * @returns {{
 *   rank: string;
 *   currentTierMinXp: number;
 *   nextRank: string | null;
 *   nextTierMinXp: number | null;
 *   xpInCurrentTier: number;
 *   xpToNextRank: number;
 *   progressPercent: number;
 *   atMaxRank: boolean;
 * }}
 */
export function getCurrentRank(totalXp) {
	const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
	const tiers = RANK_THRESHOLDS;
	if (!tiers.length) {
		return {
			rank: 'Recruit',
			currentTierMinXp: 0,
			nextRank: null,
			nextTierMinXp: null,
			xpInCurrentTier: xp,
			xpToNextRank: 0,
			progressPercent: 0,
			atMaxRank: true,
		};
	}

	let idx = 0;
	for (let i = 0; i < tiers.length; i++) {
		if (xp >= tiers[i].minXp) {
			idx = i;
		}
	}

	const current = tiers[idx];
	const currentMin = current.minXp;
	const next = idx < tiers.length - 1 ? tiers[idx + 1] : null;
	const atMaxRank = !next;

	if (atMaxRank) {
		return {
			rank: current.rank,
			currentTierMinXp: currentMin,
			nextRank: null,
			nextTierMinXp: null,
			xpInCurrentTier: xp - currentMin,
			xpToNextRank: 0,
			progressPercent: 100,
			atMaxRank: true,
		};
	}

	const nextMin = next.minXp;
	const span = nextMin - currentMin;
	const inTier = xp - currentMin;
	const toNext = nextMin - xp;
	const progressPercent = span > 0 ? Math.min(100, Math.max(0, (inTier / span) * 100)) : 0;

	return {
		rank: current.rank,
		currentTierMinXp: currentMin,
		nextRank: next.rank,
		nextTierMinXp: nextMin,
		xpInCurrentTier: inTier,
		xpToNextRank: Math.max(0, toNext),
		progressPercent,
		atMaxRank: false,
	};
}

/**
 * @param {number} level Current level (1-based). At 99+, no XP is required for a "next" level.
 * @returns {number} XP needed to advance from this level to the next.
 */
export function xpToAdvanceFromLevel(level) {
	const L = Math.floor(Number(level) || 0);
	if (L >= MAX_PLAYER_LEVEL) return 0;
	if (L < 1) return 100;
	return Math.floor(100 * Math.pow(L, 1.5));
}

/**
 * @param {number} totalXp
 * @returns {{ level: number, xpIntoLevel: number, xpToNext: number, progress: number }}
 */
export function getLevelProgressFromTotalXp(totalXp) {
	const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
	let level = 1;
	let at = 0;

	for (let guard = 0; guard < 10000; guard++) {
		if (level >= MAX_PLAYER_LEVEL) {
			const startMax = totalXpToReachLevel(MAX_PLAYER_LEVEL);
			return {
				level: MAX_PLAYER_LEVEL,
				xpIntoLevel: Math.max(0, xp - startMax),
				xpToNext: 0,
				progress: 1,
			};
		}

		const need = xpToAdvanceFromLevel(level);
		if (xp < at + need) {
			const into = xp - at;
			return {
				level,
				xpIntoLevel: into,
				xpToNext: need,
				progress: need > 0 ? Math.min(1, Math.max(0, into / need)) : 1,
			};
		}

		at += need;
		level++;
	}

	return {
		level: MAX_PLAYER_LEVEL,
		xpIntoLevel: 0,
		xpToNext: 0,
		progress: 1,
	};
}

/**
 * @param {number} totalXp
 * @returns {number}
 */
export function getDisplayLevel(totalXp) {
	return getLevelProgressFromTotalXp(totalXp).level;
}

/**
 * Total cumulative XP required to **start** at `level` (1-based).
 * Level 1 begins at 0 XP. Values above {@link MAX_PLAYER_LEVEL} are clamped.
 *
 * @param {number} level
 * @returns {number}
 */
export function totalXpToReachLevel(level) {
	const target = Math.min(MAX_PLAYER_LEVEL, Math.max(1, Math.floor(Number(level) || 0)));
	if (target <= 1) return 0;
	let sum = 0;
	for (let l = 1; l < target; l++) {
		sum += xpToAdvanceFromLevel(l);
	}
	return sum;
}

/**
 * FIFA-style player card tier (visual + next milestone) from display level.
 *
 * @param {number} level
 * @returns {'bronze' | 'silver' | 'gold' | 'elite'}
 */
export function getCardTierFromLevel(level) {
	const L = Math.min(MAX_PLAYER_LEVEL, Math.floor(Number(level) || 1));
	if (L >= 50) return 'elite';
	if (L >= 25) return 'gold';
	if (L >= 10) return 'silver';
	return 'bronze';
}

/**
 * XP remaining until the **next card tier** (Silver at L10, Gold at L25, Elite at L50).
 *
 * @param {number} totalXp
 * @returns {{ nextTierName: string | null, xpNeeded: number, atMaxCardTier: boolean }}
 */
export function getNextCardTierProgress(totalXp) {
	const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
	const { level } = getLevelProgressFromTotalXp(xp);
	if (level >= 50) {
		return { nextTierName: null, xpNeeded: 0, atMaxCardTier: true };
	}
	const targetLevel = level < 10 ? 10 : level < 25 ? 25 : 50;
	const nextTierName = level < 10 ? 'Silver' : level < 25 ? 'Gold' : 'Elite';
	const needTotal = totalXpToReachLevel(targetLevel);
	const xpNeeded = Math.max(0, needTotal - xp);
	return { nextTierName, xpNeeded, atMaxCardTier: false };
}
