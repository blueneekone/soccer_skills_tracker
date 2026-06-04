/**
 * Workout volume from coach prescription or player-confirmed sets/reps.
 */

import {
	effectivePrescriptionReps,
	type IntentPrescription,
} from '$lib/types/intent.js';

/** sets × repsPerSet × (bilateral ? 2 : 1); 0 when repsPerSet omitted (time-only). */
export function computeWorkoutTotalReps(
	sets: number,
	repsPerSet: number | undefined | null,
	bilateral: boolean,
): number {
	const setsN = Math.max(1, Math.floor(Number(sets) || 1));
	const repsN =
		repsPerSet != null && Number(repsPerSet) > 0 ?
			Math.floor(Number(repsPerSet))
		:	undefined;
	return effectivePrescriptionReps({
		sets: setsN,
		repsPerSet: repsN,
		bilateral: bilateral === true,
	});
}

export function formatPrescriptionVolumeLine(
	sets: number,
	repsPerSet: number | undefined | null,
	bilateral: boolean,
): string {
	const total = computeWorkoutTotalReps(sets, repsPerSet, bilateral);
	if (total <= 0) return 'Time-only (no rep count)';
	const sideNote = bilateral ? ' · both sides' : '';
	return `${sets}×${repsPerSet} reps${sideNote} · ${total} total reps`;
}

export function prescriptionFromHandoff(
	raw: IntentPrescription | undefined | null,
): IntentPrescription | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	return {
		sets: Math.max(1, Math.floor(Number(raw.sets) || 1)),
		bilateral: raw.bilateral === true,
		...(typeof raw.drillTitle === 'string' && raw.drillTitle.trim() ?
			{ drillTitle: raw.drillTitle.trim() }
		:	{}),
		...(raw.repsPerSet != null && Number(raw.repsPerSet) > 0 ?
			{ repsPerSet: Math.floor(Number(raw.repsPerSet)) }
		:	{}),
		...(raw.targetDurationMin != null && Number(raw.targetDurationMin) > 0 ?
			{ targetDurationMin: Math.floor(Number(raw.targetDurationMin)) }
		:	{}),
		...(raw.targetRpe != null && Number(raw.targetRpe) >= 1 && Number(raw.targetRpe) <= 10 ?
			{ targetRpe: Math.round(Number(raw.targetRpe)) }
		:	{}),
	};
}
