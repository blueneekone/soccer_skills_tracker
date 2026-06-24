/** Max minutes for self-directed player workout logs (realistic session cap). */
export const FREE_LOG_DURATION_MAX_MINUTES = 120;

export const SESSION_NOTES_MAX_LENGTH = 500;

export function clampFreeLogDurationMinutes(raw: number): number {
	return Math.max(1, Math.min(FREE_LOG_DURATION_MAX_MINUTES, Math.floor(Number(raw) || 1)));
}

export function isCoachDirectedHandoff(
	source: 'coach_intent' | 'coach_homework' | undefined | null,
): boolean {
	return source === 'coach_intent' || source === 'coach_homework';
}

/** Post-log diegetic suffix when a cadence coach intent session was credited. */
export function coachCadenceLogSuccessSuffix(
	source: 'coach_intent' | 'coach_homework' | undefined | null,
	cadence: { sessionsPerWindow: number; windowDays: number } | undefined | null,
): string {
	return source === 'coach_intent' && cadence ? " · Counts toward this week's assignment." : '';
}
