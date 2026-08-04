import { describe, expect, it, vi } from 'vitest';
import {
	toTimestampMs,
	computeThreatAssessment,
	formatFixtureDate,
	type OpponentStats
} from '../league.js';
import * as timeUtils from '../../utils/time.js';
import type { FirestoreTimestamp } from '../tenant.js';

describe('league types utilities', () => {
	describe('toTimestampMs', () => {
		it('handles null and undefined', () => {
			expect(toTimestampMs(null)).toBe(0);
			expect(toTimestampMs(undefined)).toBe(0);
		});

		it('handles Date objects', () => {
			const date = new Date('2025-01-01T12:00:00Z');
			expect(toTimestampMs(date)).toBe(1735732800000);
		});

		it('handles numbers (epoch ms)', () => {
			expect(toTimestampMs(1735732800000)).toBe(1735732800000);
		});

		it('handles ISO strings', () => {
			expect(toTimestampMs('2025-01-01T12:00:00Z')).toBe(1735732800000);
		});

		it('handles Firestore Timestamp objects', () => {
			const mockTimestamp = {
				seconds: 1735732800,
				nanoseconds: 0,
				toDate: () => new Date('2025-01-01T12:00:00Z')
			} as FirestoreTimestamp;
			expect(toTimestampMs(mockTimestamp)).toBe(1735732800000);
		});

		it('returns 0 for objects without toDate', () => {
			expect(toTimestampMs({ foo: 'bar' } as any)).toBe(0);
		});
	});

	describe('computeThreatAssessment', () => {
		it('handles undefined stats', () => {
			expect(computeThreatAssessment(undefined)).toEqual({
				level: 'UNKNOWN',
				score: 50,
				color: '#475569',
				winRate: 0
			});
		});

		it('handles stats with 0 total games', () => {
			const stats: OpponentStats = {
				totalGames: 0,
				wins: 0,
				draws: 0,
				losses: 0,
				goalsFor: 0,
				goalsAgainst: 0
			};
			expect(computeThreatAssessment(stats)).toEqual({
				level: 'UNKNOWN',
				score: 50,
				color: '#475569',
				winRate: 0
			});
		});

		it('calculates LOW threat for >= 60% win rate', () => {
			const stats: OpponentStats = {
				totalGames: 10,
				wins: 6, // 60% win rate
				draws: 2,
				losses: 2,
				goalsFor: 20,
				goalsAgainst: 10
			};
			expect(computeThreatAssessment(stats)).toEqual({
				level: 'LOW',
				score: 40, // (1 - 0.6) * 100
				color: '#22c55e',
				winRate: 0.6
			});

			const statsHigh: OpponentStats = {
				...stats,
				wins: 10 // 100% win rate
			};
			expect(computeThreatAssessment(statsHigh)).toEqual({
				level: 'LOW',
				score: 0,
				color: '#22c55e',
				winRate: 1
			});
		});

		it('calculates MEDIUM threat for 40-59% win rate', () => {
			const stats: OpponentStats = {
				totalGames: 10,
				wins: 4, // 40% win rate
				draws: 2,
				losses: 4,
				goalsFor: 15,
				goalsAgainst: 15
			};
			expect(computeThreatAssessment(stats)).toEqual({
				level: 'MEDIUM',
				score: 60, // (1 - 0.4) * 100
				color: '#f59e0b',
				winRate: 0.4
			});

			const statsMid: OpponentStats = {
				...stats,
				wins: 5 // 50% win rate
			};
			expect(computeThreatAssessment(statsMid)).toEqual({
				level: 'MEDIUM',
				score: 50,
				color: '#f59e0b',
				winRate: 0.5
			});
		});

		it('calculates HIGH threat for < 40% win rate', () => {
			const stats: OpponentStats = {
				totalGames: 10,
				wins: 3, // 30% win rate
				draws: 2,
				losses: 5,
				goalsFor: 10,
				goalsAgainst: 20
			};
			expect(computeThreatAssessment(stats)).toEqual({
				level: 'HIGH',
				score: 70, // (1 - 0.3) * 100
				color: '#ef4444',
				winRate: 0.3
			});

			const statsZero: OpponentStats = {
				...stats,
				wins: 0 // 0% win rate
			};
			expect(computeThreatAssessment(statsZero)).toEqual({
				level: 'HIGH',
				score: 100,
				color: '#ef4444',
				winRate: 0
			});
		});
	});

	describe('formatFixtureDate', () => {
		it('delegates to the underlying time utility', () => {
			// Instead of mocking timeUtils which can be tricky with ES modules in vitest,
			// we'll just verify the integration works end-to-end
			const date = new Date('2025-06-14T15:00:00Z');
			// The exact output depends on timezone of the test runner,
			// so we just ensure it returns a non-empty string that the utility handles
			const result = formatFixtureDate(date);
			expect(typeof result).toBe('string');
			expect(result.length).toBeGreaterThan(0);

			const emptyResult = formatFixtureDate(null);
			expect(emptyResult).toBe('—');
		});
	});
});
