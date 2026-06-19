/** Daily physio captured on Train before first transmit of the UTC day. */
export type TrainReadinessInput = {
	sleepHoursLastNight: number;
	soreness: number;
	mood: number;
	restingFeel: number;
};

export const TRAIN_READINESS_DEFAULTS: TrainReadinessInput = {
	sleepHoursLastNight: 7,
	soreness: 1,
	mood: 3,
	restingFeel: 3,
};

export const TRAIN_READINESS_MOOD_LABELS = ['', 'Very Low', 'Low', 'Okay', 'Good', 'Excellent'] as const;
export const TRAIN_READINESS_SORENESS_LABELS = ['', 'None', 'Mild', 'Moderate', 'High', 'Severe'] as const;
export const TRAIN_READINESS_RESTING_LABELS = ['', 'Fatigued', 'Tired', 'Average', 'Fresh', 'Peak'] as const;

export function todayUtcDateString(now = new Date()): string {
	return now.toISOString().slice(0, 10);
}

export function isValidTrainReadinessInput(input: TrainReadinessInput): boolean {
	const sleep = Number(input.sleepHoursLastNight);
	const soreness = Math.round(Number(input.soreness));
	const mood = Math.round(Number(input.mood));
	const restingFeel = Math.round(Number(input.restingFeel));
	return (
		Number.isFinite(sleep) &&
		sleep >= 0 &&
		sleep <= 12 &&
		soreness >= 1 &&
		soreness <= 5 &&
		mood >= 1 &&
		mood <= 5 &&
		restingFeel >= 1 &&
		restingFeel <= 5
	);
}

export function normalizeTrainReadinessInput(input: TrainReadinessInput): TrainReadinessInput {
	return {
		sleepHoursLastNight: Math.max(0, Math.min(12, Number(input.sleepHoursLastNight) || 0)),
		soreness: Math.max(1, Math.min(5, Math.round(Number(input.soreness) || 1))),
		mood: Math.max(1, Math.min(5, Math.round(Number(input.mood) || 3))),
		restingFeel: Math.max(1, Math.min(5, Math.round(Number(input.restingFeel) || 3))),
	};
}

/** Persist daily physio from HQ or Train — one doc per UTC day. */
export async function submitTrainReadinessReport(
	input: TrainReadinessInput,
	submitFn: (payload: {
		sleepHours: number;
		soreness: number;
		mood: number;
		restingFeel: number;
	}) => Promise<unknown>,
): Promise<void> {
	const normalized = normalizeTrainReadinessInput(input);
	if (!isValidTrainReadinessInput(normalized)) {
		throw new Error('Invalid readiness values.');
	}
	await submitFn({
		sleepHours: normalized.sleepHoursLastNight,
		soreness: normalized.soreness,
		mood: normalized.mood,
		restingFeel: normalized.restingFeel,
	});
}
