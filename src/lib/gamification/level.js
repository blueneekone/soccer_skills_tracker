/**
 * Elite Player Portal — exponential level curve (mirrors Cloud Functions).
 * Level 1→2: 100 XP in that band; 2→3: 250; 3→4: 500; then ×2 per tier.
 */

/**
 * @param {number} level Current level (1-based).
 * @returns {number} XP needed to advance from this level to the next.
 */
export function xpToAdvanceFromLevel(level) {
	const L = Math.floor(level);
	if (L < 1) return 100;
	if (L === 1) return 100;
	if (L === 2) return 250;
	if (L === 3) return 500;
	return Math.floor(500 * Math.pow(2, L - 3));
}

/**
 * @param {number} totalXp
 * @returns {{ level: number, xpIntoLevel: number, xpToNext: number, progress: number }}
 */
export function getLevelProgressFromTotalXp(totalXp) {
	const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
	let level = 1;
	let at = 0;
	for (let guard = 0; guard < 5000; guard++) {
		const need = xpToAdvanceFromLevel(level);
		if (xp < at + need) {
			const into = xp - at;
			const progress = need > 0 ? into / need : 0;
			return {
				level,
				xpIntoLevel: into,
				xpToNext: need,
				progress: Math.min(1, Math.max(0, progress))
			};
		}
		at += need;
		level++;
	}
	return { level, xpIntoLevel: 0, xpToNext: xpToAdvanceFromLevel(level), progress: 0 };
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
 * Level 1 begins at 0 XP.
 *
 * @param {number} level
 * @returns {number}
 */
export function totalXpToReachLevel(level) {
	const L = Math.floor(Number(level) || 0);
	if (L <= 1) return 0;
	let sum = 0;
	for (let l = 1; l < L; l++) {
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
	const L = Math.floor(Number(level) || 1);
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
