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

const LAST_TRAINING_MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
] as const;

function parseLastTrainingUtcDate(lastTrainingUtc: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(lastTrainingUtc.trim());
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
	const d = new Date(Date.UTC(year, month, day));
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

function utcCalendarDayStart(d: Date): number {
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** True when last_training_utc is the same UTC calendar day as `now`. */
export function isTrainingToday(
	lastTrainingUtc: string | null | undefined,
	now: Date = new Date(),
): boolean {
	return formatLastTrainingLabel(lastTrainingUtc, now) === 'Today';
}

/** Format player_stats.last_training_utc (YYYY-MM-DD) for HUD. */
export function formatLastTrainingLabel(
	lastTrainingUtc: string | null | undefined,
	now: Date = new Date(),
): string {
	if (!lastTrainingUtc || typeof lastTrainingUtc !== 'string') {
		return 'No sessions logged yet';
	}

	const training = parseLastTrainingUtcDate(lastTrainingUtc);
	if (!training) return 'No sessions logged yet';

	const todayStart = utcCalendarDayStart(now);
	const trainingStart = utcCalendarDayStart(training);
	const diffDays = Math.floor((todayStart - trainingStart) / 86_400_000);

	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Yesterday';

	const month = training.getUTCMonth();
	const day = training.getUTCDate();
	return `${LAST_TRAINING_MONTHS[month]} ${day}`;
}
