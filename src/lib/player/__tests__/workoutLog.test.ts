import { describe, expect, it } from 'vitest';
import {
	buildWorkoutDrillType,
	expectedWorkoutXp,
	intensityApiFromStep,
	validatePlayerWorkoutLog,
	workoutLogErrorMessage,
} from '$lib/player/workoutLog.js';

describe('workoutLog', () => {
	it('intensityApiFromStep maps RPE steps to API bands', () => {
		expect(intensityApiFromStep(2)).toBe('low');
		expect(intensityApiFromStep(5)).toBe('medium');
		expect(intensityApiFromStep(9)).toBe('high');
	});

	it('buildWorkoutDrillType caps drill label length', () => {
		const long = 'x'.repeat(300);
		expect(buildWorkoutDrillType('Technical', long)).toHaveLength(200);
	});

	it('validatePlayerWorkoutLog blocks non-players', () => {
		const result = validatePlayerWorkoutLog({
			selectedFocus: 'technical',
			selectedDrill: 'Juggling',
			logSubmitting: false,
			role: 'parent',
			profile: { teamId: 't1', playerName: 'Ace' },
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.title).toBe('Players only');
		}
	});

	it('expectedWorkoutXp returns a non-negative integer', () => {
		expect(expectedWorkoutXp(30, 5)).toBeGreaterThanOrEqual(0);
	});

	it('workoutLogErrorMessage extracts Error.message', () => {
		expect(workoutLogErrorMessage(new Error('boom'))).toBe('boom');
		expect(workoutLogErrorMessage('nope')).toBe('Could not log workout.');
	});
});
