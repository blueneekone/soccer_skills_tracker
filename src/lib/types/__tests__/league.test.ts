import { describe, it, expect, vi } from 'vitest';
import { toTimestampMs, computeThreatAssessment, formatFixtureDate } from '../league.js';
import * as timeUtils from '../../utils/time.js';
import type { FirestoreTimestamp } from '../tenant.js';
import type { OpponentStats } from '../league.js';

// Mock the time utilities to isolate the formatFixtureDate test
vi.mock('../../utils/time.js', () => ({
	formatFixtureDate: vi.fn((val, tz) => `MOCKED_DATE_${val}_${tz}`),
}));

describe('league utility functions', () => {
	describe('toTimestampMs', () => {
		it('returns 0 for falsy values', () => {
			expect(toTimestampMs(undefined)).toBe(0);
			expect(toTimestampMs(null)).toBe(0);
			expect(toTimestampMs('') as any).toBe(0);
			expect(toTimestampMs(NaN)).toBe(0);
		});

		it('returns getTime() for Date objects', () => {
			const date = new Date('2024-01-01T12:00:00Z');
			expect(toTimestampMs(date)).toBe(date.getTime());
		});

		it('returns the same number if input is a number', () => {
			const ms = 1704110400000;
			expect(toTimestampMs(ms)).toBe(ms);
		});

		it('parses strings into timestamps', () => {
			const str = '2024-01-01T12:00:00Z';
			expect(toTimestampMs(str)).toBe(new Date(str).getTime());
		});

		it('returns NaN for invalid date strings', () => {
			const str = 'invalid-date';
			expect(toTimestampMs(str)).toBeNaN();
		});

		it('returns NaN for invalid Date objects', () => {
			const date = new Date('invalid');
			expect(toTimestampMs(date)).toBeNaN();
		});

		it('handles FirestoreTimestamp-like objects', () => {
			const date = new Date('2024-01-01T12:00:00Z');
			const mockFirestoreTimestamp = {
				toDate: () => date,
				seconds: Math.floor(date.getTime() / 1000),
				nanoseconds: (date.getTime() % 1000) * 1000000
			} as FirestoreTimestamp;
			expect(toTimestampMs(mockFirestoreTimestamp)).toBe(date.getTime());
		});

		it('returns 0 for arbitrary unsupported objects', () => {
			expect(toTimestampMs({ foo: 'bar' } as any)).toBe(0);
		});
	});

	describe('computeThreatAssessment', () => {
		it('returns UNKNOWN if stats are undefined', () => {
			const result = computeThreatAssessment(undefined);
			expect(result).toEqual({ level: 'UNKNOWN', score: 50, color: '#475569', winRate: 0 });
		});

		it('returns UNKNOWN if totalGames is 0', () => {
			const stats: OpponentStats = {
				totalGames: 0,
				wins: 0,
				draws: 0,
				losses: 0,
				goalsFor: 0,
				goalsAgainst: 0
			};
			const result = computeThreatAssessment(stats);
			expect(result).toEqual({ level: 'UNKNOWN', score: 50, color: '#475569', winRate: 0 });
		});

		it('returns HIGH threat for win rate of 0% (0 wins)', () => {
			const stats: OpponentStats = {
				totalGames: 10,
				wins: 0, // 0% win rate
				draws: 0,
				losses: 10,
				goalsFor: 0,
				goalsAgainst: 20
			};
			const result = computeThreatAssessment(stats);
			expect(result).toEqual({ level: 'HIGH', score: 100, color: '#ef4444', winRate: 0 });
		});

		it('returns LOW threat for win rate >= 60%', () => {
			const stats: OpponentStats = {
				totalGames: 10,
				wins: 6,
				draws: 2,
				losses: 2,
				goalsFor: 15,
				goalsAgainst: 5
			};
			const result = computeThreatAssessment(stats);
			expect(result).toEqual({ level: 'LOW', score: 40, color: '#22c55e', winRate: 0.6 });
		});

		it('returns MEDIUM threat for win rate >= 40% and < 60%', () => {
			const stats: OpponentStats = {
				totalGames: 10,
				wins: 4, // 40% win rate
				draws: 2,
				losses: 4,
				goalsFor: 10,
				goalsAgainst: 10
			};
			const result = computeThreatAssessment(stats);
			expect(result).toEqual({ level: 'MEDIUM', score: 60, color: '#f59e0b', winRate: 0.4 });
		});

		it('returns HIGH threat for win rate < 40%', () => {
			const stats: OpponentStats = {
				totalGames: 10,
				wins: 3, // 30% win rate
				draws: 2,
				losses: 5,
				goalsFor: 5,
				goalsAgainst: 15
			};
			const result = computeThreatAssessment(stats);
			expect(result).toEqual({ level: 'HIGH', score: 70, color: '#ef4444', winRate: 0.3 });
		});

		it('correctly rounds the threat score', () => {
			const stats: OpponentStats = {
				totalGames: 3,
				wins: 1, // 33.33...% win rate
				draws: 0,
				losses: 2,
				goalsFor: 1,
				goalsAgainst: 3
			};
			const result = computeThreatAssessment(stats);
			// Win rate is 1/3 (0.333...)
			// Threat score is round((1 - 1/3) * 100) = round(66.66...) = 67
			expect(result).toEqual({ level: 'HIGH', score: 67, color: '#ef4444', winRate: 1/3 });
		});
	});

	describe('formatFixtureDate', () => {
		it('delegates to _fmtFixtureDate from time utils', () => {
			const date = new Date('2024-01-01T12:00:00Z');
			const tz = 'America/New_York';

			const result = formatFixtureDate(date, tz);

			expect(timeUtils.formatFixtureDate).toHaveBeenCalledWith(date, tz);
			expect(result).toBe(`MOCKED_DATE_${date}_${tz}`);
		});
	});
});
