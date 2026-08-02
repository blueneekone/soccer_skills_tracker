import type { ScoutsSix, StreakFreezeDoc } from '$lib/types/tenant';

/**
 * applySkillDecay — reduces each of the 6 Scout's Six axis values by exactly 2%
 * (multiply by 0.98, floor to 2 decimal places). Must not drop below 0.
 */
export function applySkillDecay(stats: ScoutsSix): ScoutsSix {
	if (!stats) return stats;
	const decayedStats = { ...stats };
	const axes: (keyof ScoutsSix)[] = ['PAC', 'ACC', 'AGI', 'STM', 'POW', 'VAN'];

	for (const axis of axes) {
		const statValue = decayedStats[axis];
		if (statValue !== undefined && statValue !== null && statValue !== '—') {
			let val = parseFloat(String(statValue));
			if (!isNaN(val)) {
				val = Math.floor(val * 0.98 * 100) / 100;
				if (val < 0) val = 0;
				decayedStats[axis] = val.toString();
			}
		}
	}
	return decayedStats;
}

/**
 * hasActiveStreakFreeze — returns true if there is at least one streak freeze available.
 */
export function hasActiveStreakFreeze(freezeDoc: StreakFreezeDoc | null | undefined): boolean {
	if (!freezeDoc) return false;
	return typeof freezeDoc.available === 'number' && freezeDoc.available > 0;
}

/**
 * consumeStreakFreeze — decrements the available streak freezes by 1.
 * (immutable — returns new object).
 */
export function consumeStreakFreeze(freezeDoc: StreakFreezeDoc | null | undefined): StreakFreezeDoc | null {
	if (!freezeDoc || freezeDoc.available <= 0) return freezeDoc || null;

	return {
		...freezeDoc,
		available: freezeDoc.available - 1,
		consumedAt: new Date().toISOString()
	};
}
