import { describe, it, expect } from 'vitest';
import {
	applySkillDecay,
	hasActiveStreakFreeze,
	consumeStreakFreeze
} from '../gamificationMath';
import type { ScoutsSix } from '$lib/types/tenant';

describe('gamificationMath utility', () => {
	describe('applySkillDecay', () => {
		it('should correctly reduce each axis by 2%', () => {
			const stats: ScoutsSix = { PAC: '100', ACC: '50', AGI: '10', STM: '200', POW: '0', VAN: '—' };
			const decayed = applySkillDecay(stats);

			expect(decayed.PAC).toBe('98');
			expect(decayed.ACC).toBe('49'); // 50 * 0.98 = 49
			expect(decayed.AGI).toBe('9.8'); // 10 * 0.98 = 9.8
			expect(decayed.STM).toBe('196');
			expect(decayed.POW).toBe('0');
			expect(decayed.VAN).toBe('—');
		});

		it('never allows a value below 0', () => {
			const stats: ScoutsSix = { PAC: '-10' } as any; // Cast as any for test case where value is negative
			const decayed = applySkillDecay(stats);
			expect(decayed.PAC).toBe('0');
		});
	});

	describe('hasActiveStreakFreeze', () => {
		it('returns false on empty or invalid objects', () => {
			expect(hasActiveStreakFreeze(null)).toBe(false);
			expect(hasActiveStreakFreeze(undefined)).toBe(false);
			expect(hasActiveStreakFreeze({ available: 0, weekKey: '' })).toBe(false);
		});

		it('returns true if available > 0', () => {
			expect(hasActiveStreakFreeze({ available: 1, weekKey: '' })).toBe(true);
			expect(hasActiveStreakFreeze({ available: 5, weekKey: '' })).toBe(true);
		});
	});

	describe('consumeStreakFreeze', () => {
		it('is immutable (returns new object, does not mutate original)', () => {
			const original = { available: 2, weekKey: 'W01', consumedAt: 'old' };
			const result = consumeStreakFreeze(original);

			expect(result).not.toBe(original);
			expect(result?.available).toBe(1);
			expect(original.available).toBe(2);
		});

		it('returns the same input (or null) if none available', () => {
			const original = { available: 0, weekKey: 'W01' };
			const result = consumeStreakFreeze(original);

			expect(result).toBe(original);
		});
	});
});
