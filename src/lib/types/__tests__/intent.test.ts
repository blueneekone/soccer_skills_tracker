import { describe, it, expect } from 'vitest';
import {
	resolveCoachIntentDisplayCadence,
	DEFAULT_HIGH_XP_DISPLAY_CADENCE,
} from '$lib/types/intent.js';

describe('resolveCoachIntentDisplayCadence', () => {
	it('should return explicit prescription cadence if present', () => {
		const result = resolveCoachIntentDisplayCadence(100, {
			sets: 1,
			bilateral: false,
			cadence: { sessionsPerWindow: 3, windowDays: 7 },
		});
		expect(result).toEqual({ sessionsPerWindow: 3, windowDays: 7 });
	});

	it('should return default high XP cadence if requiredXp >= 300 and no explicit cadence', () => {
		const result = resolveCoachIntentDisplayCadence(300);
		expect(result).toEqual(DEFAULT_HIGH_XP_DISPLAY_CADENCE);
	});

	it('should return undefined if requiredXp < 300 and no explicit cadence', () => {
		const result = resolveCoachIntentDisplayCadence(299);
		expect(result).toBeUndefined();
	});

	it('should return default high XP cadence for higher XP values', () => {
		const result = resolveCoachIntentDisplayCadence(500);
		expect(result).toEqual(DEFAULT_HIGH_XP_DISPLAY_CADENCE);
	});

	it('should handle malformed prescription inputs gracefully', () => {
		const result1 = resolveCoachIntentDisplayCadence(300, null);
		expect(result1).toEqual(DEFAULT_HIGH_XP_DISPLAY_CADENCE);

		const result2 = resolveCoachIntentDisplayCadence(300, 'invalid-string');
		expect(result2).toEqual(DEFAULT_HIGH_XP_DISPLAY_CADENCE);

		const result3 = resolveCoachIntentDisplayCadence(100, { invalid: 'data' });
		expect(result3).toBeUndefined();
	});

	it('should handle malformed requiredXp inputs gracefully', () => {
		// Even if requiredXp is a string that parses to a number
		const result1 = resolveCoachIntentDisplayCadence('350' as any);
		expect(result1).toEqual(DEFAULT_HIGH_XP_DISPLAY_CADENCE);

		// If requiredXp is NaN or unparseable, defaults to 0
		const result2 = resolveCoachIntentDisplayCadence('not-a-number' as any);
		expect(result2).toBeUndefined();

		// Negative requiredXp -> Math.max(0, ...) -> 0
		const result3 = resolveCoachIntentDisplayCadence(-100);
		expect(result3).toBeUndefined();
	});
});
