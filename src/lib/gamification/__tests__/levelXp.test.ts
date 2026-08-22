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
	getDisplayLevel,
	totalXpToReachLevel,
	getCardTierFromLevel,
	getNextCardTierProgress,
	MAX_PLAYER_LEVEL,
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

	it('level < 1 defaults to 100 XP required', () => {
		expect(xpToAdvanceFromLevel(0)).toBe(100);
		expect(xpToAdvanceFromLevel(-5)).toBe(100);
	});

	it('level >= MAX_PLAYER_LEVEL (99) requires 0 XP to advance', () => {
		expect(xpToAdvanceFromLevel(MAX_PLAYER_LEVEL)).toBe(0);
		expect(xpToAdvanceFromLevel(100)).toBe(0);
		expect(xpToAdvanceFromLevel(999)).toBe(0);
	});

	it('handles non-numeric or string representations gracefully', () => {
		expect(xpToAdvanceFromLevel('2' as unknown as number)).toBe(282);
		expect(xpToAdvanceFromLevel(NaN)).toBe(100);
		expect(xpToAdvanceFromLevel(1.8)).toBe(100); // Math.floor(1.8) = 1
	});
});

describe('totalXpToReachLevel', () => {
	it('level 1 or below requires 0 total XP', () => {
		expect(totalXpToReachLevel(1)).toBe(0);
		expect(totalXpToReachLevel(0)).toBe(0);
		expect(totalXpToReachLevel(-10)).toBe(0);
	});

	it('level 2 requires exactly 100 total XP', () => {
		expect(totalXpToReachLevel(2)).toBe(100);
	});

	it('level 3 requires 100 + 282 = 382 total XP', () => {
		expect(totalXpToReachLevel(3)).toBe(382);
	});

	it('clamps target level at MAX_PLAYER_LEVEL (99)', () => {
		const totalFor99 = totalXpToReachLevel(MAX_PLAYER_LEVEL);
		expect(totalXpToReachLevel(100)).toBe(totalFor99);
		expect(totalXpToReachLevel(150)).toBe(totalFor99);
		expect(totalFor99).toBeGreaterThan(0);
	});

	it('handles string, float, or invalid inputs correctly', () => {
		expect(totalXpToReachLevel('3' as unknown as number)).toBe(382);
		expect(totalXpToReachLevel(2.9)).toBe(100); // Math.floor(2.9) = 2
		expect(totalXpToReachLevel(NaN)).toBe(0);
	});
});

describe('getDisplayLevel', () => {
	it('returns level 1 for 0 or negative XP', () => {
		expect(getDisplayLevel(0)).toBe(1);
		expect(getDisplayLevel(-100)).toBe(1);
	});

	it('returns correct display level at exact level thresholds', () => {
		expect(getDisplayLevel(100)).toBe(2);
		expect(getDisplayLevel(382)).toBe(3);
	});

	it('returns correct display level 1 XP below threshold', () => {
		expect(getDisplayLevel(99)).toBe(1);
		expect(getDisplayLevel(381)).toBe(2);
	});

	it('caps display level at MAX_PLAYER_LEVEL (99) for extremely high XP', () => {
		const maxXp = totalXpToReachLevel(MAX_PLAYER_LEVEL);
		expect(getDisplayLevel(maxXp)).toBe(99);
		expect(getDisplayLevel(maxXp + 1000000)).toBe(99);
		expect(getDisplayLevel(999999999)).toBe(99);
	});

	it('handles non-numeric or string XP gracefully', () => {
		expect(getDisplayLevel('100' as unknown as number)).toBe(2);
		expect(getDisplayLevel(NaN)).toBe(1);
	});
});

describe('getLevelProgressFromTotalXp — level-up boundaries & edge cases', () => {
	it('0 XP — level 1, empty bar', () => {
		expect(getLevelProgressFromTotalXp(0)).toEqual({
			level: 1,
			xpIntoLevel: 0,
			xpToNext: 100,
			progress: 0,
		});
	});

	it('negative XP — treated as 0 XP (level 1)', () => {
		expect(getLevelProgressFromTotalXp(-50)).toEqual({
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

	it('MAX_PLAYER_LEVEL (99) exact XP — level 99, 0 into-level, 0 xpToNext, progress 1', () => {
		const maxXp = totalXpToReachLevel(MAX_PLAYER_LEVEL);
		const p = getLevelProgressFromTotalXp(maxXp);
		expect(p.level).toBe(99);
		expect(p.xpIntoLevel).toBe(0);
		expect(p.xpToNext).toBe(0);
		expect(p.progress).toBe(1);
	});

	it('Beyond MAX_PLAYER_LEVEL XP — retains level 99, tracks surplus XP into level, 0 xpToNext, progress 1', () => {
		const maxXp = totalXpToReachLevel(MAX_PLAYER_LEVEL);
		const p = getLevelProgressFromTotalXp(maxXp + 5000);
		expect(p.level).toBe(99);
		expect(p.xpIntoLevel).toBe(5000);
		expect(p.xpToNext).toBe(0);
		expect(p.progress).toBe(1);
	});
});

describe('getCardTierFromLevel', () => {
	it('level < 10 returns bronze', () => {
		expect(getCardTierFromLevel(1)).toBe('bronze');
		expect(getCardTierFromLevel(9)).toBe('bronze');
		expect(getCardTierFromLevel(0)).toBe('bronze');
		expect(getCardTierFromLevel(-5)).toBe('bronze');
	});

	it('level 10-24 returns silver', () => {
		expect(getCardTierFromLevel(10)).toBe('silver');
		expect(getCardTierFromLevel(24)).toBe('silver');
	});

	it('level 25-49 returns gold', () => {
		expect(getCardTierFromLevel(25)).toBe('gold');
		expect(getCardTierFromLevel(49)).toBe('gold');
	});

	it('level 50+ returns elite', () => {
		expect(getCardTierFromLevel(50)).toBe('elite');
		expect(getCardTierFromLevel(99)).toBe('elite');
		expect(getCardTierFromLevel(120)).toBe('elite');
	});

	it('handles non-numeric inputs', () => {
		expect(getCardTierFromLevel('25' as unknown as number)).toBe('gold');
		expect(getCardTierFromLevel(NaN)).toBe('bronze');
	});
});

describe('getNextCardTierProgress', () => {
	it('0 XP (Level 1) — progress toward Silver tier (Level 10)', () => {
		const xpForL10 = totalXpToReachLevel(10);
		const res = getNextCardTierProgress(0);
		expect(res.nextTierName).toBe('Silver');
		expect(res.xpNeeded).toBe(xpForL10);
		expect(res.atMaxCardTier).toBe(false);
	});

	it('XP at Level 10 — progress toward Gold tier (Level 25)', () => {
		const xpForL10 = totalXpToReachLevel(10);
		const xpForL25 = totalXpToReachLevel(25);
		const res = getNextCardTierProgress(xpForL10);
		expect(res.nextTierName).toBe('Gold');
		expect(res.xpNeeded).toBe(xpForL25 - xpForL10);
		expect(res.atMaxCardTier).toBe(false);
	});

	it('XP at Level 25 — progress toward Elite tier (Level 50)', () => {
		const xpForL25 = totalXpToReachLevel(25);
		const xpForL50 = totalXpToReachLevel(50);
		const res = getNextCardTierProgress(xpForL25);
		expect(res.nextTierName).toBe('Elite');
		expect(res.xpNeeded).toBe(xpForL50 - xpForL25);
		expect(res.atMaxCardTier).toBe(false);
	});

	it('XP at Level 50+ — at max card tier', () => {
		const xpForL50 = totalXpToReachLevel(50);
		const res = getNextCardTierProgress(xpForL50);
		expect(res).toEqual({
			nextTierName: null,
			xpNeeded: 0,
			atMaxCardTier: true,
		});

		const resOver = getNextCardTierProgress(xpForL50 + 100000);
		expect(resOver.atMaxCardTier).toBe(true);
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
