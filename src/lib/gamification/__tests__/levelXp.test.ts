/**
 * levelXp.test.ts — Sprint XP-verify
 * Authority: src/lib/gamification/level.js
 */

import { describe, it, expect } from 'vitest';
import {
	calculateTrainingSessionEarnedXp,
	xpToAdvanceFromLevel,
	getLevelProgressFromTotalXp,
	getCurrentRank,
} from '../level.js';
import { computeWorkoutTotalReps } from '$lib/player/workout/workoutPrescription.js';

/** Known numeric fixtures — keep aligned with functions/__tests__/gamificationWorkoutXp.test.js */
const TRAINING_SESSION_FIXTURES = [
	{ duration: 30, reps: 50, intensity: 'low' as const, expected: 400 },
	{ duration: 45, reps: 100, intensity: 'medium' as const, expected: 747 },
	{ duration: 60, reps: 200, intensity: 'high' as const, expected: 1350 },
];

describe('calculateTrainingSessionEarnedXp', () => {
	for (const { duration, reps, intensity, expected } of TRAINING_SESSION_FIXTURES) {
		it(`${intensity} intensity — duration=${duration}, reps=${reps} → ${expected} XP`, () => {
			expect(
				calculateTrainingSessionEarnedXp({ duration, reps, intensity }),
			).toBe(expected);
		});
	}

	it('bilateral prescription volume matches unilateral at half the reps', () => {
		const bilateralReps = computeWorkoutTotalReps(3, 10, true);
		const unilateralReps = computeWorkoutTotalReps(3, 10, false);
		expect(bilateralReps).toBe(60);
		expect(unilateralReps).toBe(30);
		expect(
			calculateTrainingSessionEarnedXp({
				duration: 30,
				reps: bilateralReps,
				intensity: 'low',
			}),
		).toBe(
			calculateTrainingSessionEarnedXp({
				duration: 30,
				reps: unilateralReps * 2,
				intensity: 'low',
			}),
		);
	});
});

describe('xpToAdvanceFromLevel', () => {
	it('L1→2 requires exactly 100 XP', () => {
		expect(xpToAdvanceFromLevel(1)).toBe(100);
	});

	it('L2→3 requires floor(100 × 2^1.5) = 282 XP', () => {
		expect(xpToAdvanceFromLevel(2)).toBe(Math.floor(100 * 2 ** 1.5));
		expect(xpToAdvanceFromLevel(2)).toBe(282);
	});
});

describe('getLevelProgressFromTotalXp — level-up boundaries', () => {
	it('0 XP — level 1, empty bar', () => {
		expect(getLevelProgressFromTotalXp(0)).toEqual({
			level: 1,
			xpIntoLevel: 0,
			xpToNext: 100,
			progress: 0,
		});
	});

	it('99 XP — still level 1, bar nearly full', () => {
		const p = getLevelProgressFromTotalXp(99);
		expect(p.level).toBe(1);
		expect(p.xpIntoLevel).toBe(99);
		expect(p.xpToNext).toBe(100);
		expect(p.progress).toBeCloseTo(0.99);
	});

	it('100 XP — level 2 starts at 0 into-level', () => {
		expect(getLevelProgressFromTotalXp(100)).toEqual({
			level: 2,
			xpIntoLevel: 0,
			xpToNext: 282,
			progress: 0,
		});
	});

	it('381 XP — level 2, one XP short of level 3', () => {
		const p = getLevelProgressFromTotalXp(381);
		expect(p.level).toBe(2);
		expect(p.xpIntoLevel).toBe(281);
		expect(p.xpToNext).toBe(282);
	});

	it('382 XP — level 3 starts at 0 into-level', () => {
		expect(getLevelProgressFromTotalXp(382)).toEqual({
			level: 3,
			xpIntoLevel: 0,
			xpToNext: 519,
			progress: 0,
		});
	});
});

describe('getCurrentRank — tier boundaries', () => {
	it('0 XP — Recruit tier', () => {
		const r = getCurrentRank(0);
		expect(r.rank).toBe('Recruit');
		expect(r.currentTierMinXp).toBe(0);
		expect(r.nextRank).toBe('Operative');
		expect(r.atMaxRank).toBe(false);
	});

	it('4999 XP — still Recruit', () => {
		expect(getCurrentRank(4999).rank).toBe('Recruit');
	});

	it('5000 XP — Operative tier', () => {
		const r = getCurrentRank(5000);
		expect(r.rank).toBe('Operative');
		expect(r.currentTierMinXp).toBe(5000);
		expect(r.nextRank).toBe('Specialist');
	});

	it('14999 XP — still Operative', () => {
		expect(getCurrentRank(14999).rank).toBe('Operative');
	});

	it('15000 XP — Specialist tier', () => {
		expect(getCurrentRank(15000).rank).toBe('Specialist');
		expect(getCurrentRank(15000).nextRank).toBe('Elite');
	});

	it('49999 XP — still Specialist', () => {
		expect(getCurrentRank(49999).rank).toBe('Specialist');
	});

	it('50000 XP — Elite tier (max rank)', () => {
		const r = getCurrentRank(50000);
		expect(r.rank).toBe('Elite');
		expect(r.currentTierMinXp).toBe(50000);
		expect(r.atMaxRank).toBe(true);
		expect(r.progressPercent).toBe(100);
	});
});
