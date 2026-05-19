/**
 * Pure HUD formatters for Player OS dashboard (Sprint 1.4).
 * COPPA-safe: numeric inputs only — no PII.
 */

/** Weekly streak goal used for the mini ring fill (loss-aversion anchor). */
export const STREAK_RING_GOAL_DAYS = 7;

/**
 * Compact XP label for dense HUD tiles (e.g. 1.2k, 240k, 1.5M).
 */
export function formatCompactXp(totalXp: number): string {
	const x = Math.max(0, Math.floor(Number(totalXp) || 0));
	if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
	if (x >= 100_000) return `${Math.round(x / 1000)}k`;
	if (x >= 1000) return `${(x / 1000).toFixed(1)}k`;
	return x.toLocaleString();
}

/**
 * 0..1 fill for streak progress ring (capped at goal days).
 */
export function streakRingFill(currentStreak: number, goalDays = STREAK_RING_GOAL_DAYS): number {
	const goal = Math.max(1, Math.floor(goalDays));
	const streak = Math.max(0, Math.floor(Number(currentStreak) || 0));
	return Math.min(1, streak / goal);
}
