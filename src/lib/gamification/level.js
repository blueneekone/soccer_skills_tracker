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
