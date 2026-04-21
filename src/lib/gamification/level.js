/**
 * Elite Player Portal — polynomial RPG-style XP curve (multi-sport).
 * Advance L → L+1: floor(100 × L^1.5). Level 1→2 is exactly 100 XP.
 * Max display level: 99 (aligned with Ultimate Team / sports-game conventions).
 *
 * COPPA: this module is pure math — only numeric totalXp / level in; no user identity.
 */

/** Absolute max level (inclusive). Beyond this, no further advancement. */
export const MAX_PLAYER_LEVEL = 99;

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
