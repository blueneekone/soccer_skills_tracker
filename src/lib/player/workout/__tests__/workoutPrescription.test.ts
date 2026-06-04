/**
 * workoutPrescription.test.ts — Sprint PRESCRIPTION-coach-train
 */

import { describe, it, expect } from 'vitest';
import {
	computeWorkoutTotalReps,
	formatPrescriptionVolumeLine,
} from '../workoutPrescription.js';

describe('computeWorkoutTotalReps — bilateral', () => {
	it('returns 0 for time-only (repsPerSet omitted or 0)', () => {
		expect(computeWorkoutTotalReps(3, 0, true)).toBe(0);
		expect(computeWorkoutTotalReps(3, undefined, false)).toBe(0);
	});

	it('computes sets × reps when bilateral is false', () => {
		expect(computeWorkoutTotalReps(3, 10, false)).toBe(30);
	});

	it('doubles rep count when bilateral is true', () => {
		expect(computeWorkoutTotalReps(3, 10, true)).toBe(60);
	});
});

describe('formatPrescriptionVolumeLine', () => {
	it('describes bilateral volume', () => {
		expect(formatPrescriptionVolumeLine(2, 15, true)).toContain('both sides');
		expect(formatPrescriptionVolumeLine(2, 15, true)).toContain('60 total reps');
	});
});
