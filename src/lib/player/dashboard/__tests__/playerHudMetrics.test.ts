import { describe, it, expect } from 'vitest';
import {
	formatCompactXp,
	streakRingFill,
	STREAK_RING_GOAL_DAYS,
} from '../playerHudMetrics.js';

describe('playerHudMetrics — formatCompactXp', () => {
	it('formats sub-thousand XP with locale grouping', () => {
		expect(formatCompactXp(999)).toBe('999');
	});

	it('formats thousands with one decimal', () => {
		expect(formatCompactXp(1250)).toBe('1.3k');
	});

	it('formats hundred-thousands without decimal', () => {
		expect(formatCompactXp(240_000)).toBe('240k');
	});

	it('formats millions with one decimal', () => {
		expect(formatCompactXp(1_500_000)).toBe('1.5M');
	});
});

describe('playerHudMetrics — streakRingFill', () => {
	it('uses a 7-day goal by default', () => {
		expect(STREAK_RING_GOAL_DAYS).toBe(7);
		expect(streakRingFill(7)).toBe(1);
		expect(streakRingFill(14)).toBe(1);
	});

	it('returns proportional fill below the goal', () => {
		expect(streakRingFill(3)).toBeCloseTo(3 / 7, 5);
	});

	it('clamps negative streaks to zero fill', () => {
		expect(streakRingFill(-2)).toBe(0);
	});
});
