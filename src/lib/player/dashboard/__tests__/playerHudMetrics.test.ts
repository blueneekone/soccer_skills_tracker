import { describe, it, expect } from 'vitest';
import {
	formatCompactXp,
	formatLastTrainingLabel,
	isTrainingToday,
	STREAK_RING_GOAL_DAYS,
	streakRingFill,
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

describe('playerHudMetrics — formatLastTrainingLabel', () => {
	const now = new Date(Date.UTC(2026, 4, 21, 15, 0, 0)); // 2026-05-21 UTC

	it('returns placeholder when missing or invalid', () => {
		expect(formatLastTrainingLabel(null, now)).toBe('No sessions logged yet');
		expect(formatLastTrainingLabel('', now)).toBe('No sessions logged yet');
		expect(formatLastTrainingLabel('not-a-date', now)).toBe('No sessions logged yet');
	});

	it('returns Today for same UTC calendar day', () => {
		expect(formatLastTrainingLabel('2026-05-21', now)).toBe('Today');
	});

	it('returns Yesterday for previous UTC calendar day', () => {
		expect(formatLastTrainingLabel('2026-05-20', now)).toBe('Yesterday');
	});

	it('returns compact month-day for older dates', () => {
		expect(formatLastTrainingLabel('2026-05-12', now)).toBe('May 12');
	});
});

describe('playerHudMetrics — isTrainingToday', () => {
	const now = new Date(Date.UTC(2026, 4, 21, 15, 0, 0)); // 2026-05-21 UTC

	it('returns true when last training is today', () => {
		expect(isTrainingToday('2026-05-21', now)).toBe(true);
	});

	it('returns false when last training is not today', () => {
		expect(isTrainingToday('2026-05-20', now)).toBe(false);
		expect(isTrainingToday('2026-05-12', now)).toBe(false);
	});

	it('returns false when missing or invalid', () => {
		expect(isTrainingToday(null, now)).toBe(false);
		expect(isTrainingToday(undefined, now)).toBe(false);
		expect(isTrainingToday('', now)).toBe(false);
		expect(isTrainingToday('not-a-date', now)).toBe(false);
	});
});
