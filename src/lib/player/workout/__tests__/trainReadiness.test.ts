import { describe, expect, it } from 'vitest';
import {
	isValidTrainReadinessInput,
	normalizeTrainReadinessInput,
	TRAIN_READINESS_DEFAULTS,
} from '../trainReadiness.js';

describe('trainReadiness', () => {
	it('defaults are valid', () => {
		expect(isValidTrainReadinessInput(TRAIN_READINESS_DEFAULTS)).toBe(true);
	});

	it('normalizeTrainReadinessInput clamps out-of-range values', () => {
		expect(
			normalizeTrainReadinessInput({
				sleepHoursLastNight: 20,
				soreness: 0,
				mood: 9,
				restingFeel: -2,
			}),
		).toEqual({
			sleepHoursLastNight: 12,
			soreness: 1,
			mood: 5,
			restingFeel: 1,
		});
	});
});
