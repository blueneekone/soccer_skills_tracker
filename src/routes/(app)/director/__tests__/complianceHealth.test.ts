/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
	computeComplianceHealthScore,
	getComplianceStatusColor,
	getComplianceStatusLabel
} from '$lib/types/compliance';

vi.mock('$lib/firebase.js', () => ({
	db: {}
}));

describe('Director OS Compliance Health Scoring Matrix', () => {
	it('should compute overall compliance score as average of coach clearance and player VPC rates', () => {
		// Mock dataset details:
		// SafeSport Clearance: 80% (e.g. 4 cleared out of 5 active coaches)
		// VPC completion: 50% (e.g. 5 verified out of 10 active players)
		const activeCoaches = 5;
		const verifiedCoaches = 4;
		const activePlayers = 10;
		const verifiedVpc = 5;

		const overallScore = computeComplianceHealthScore(
			activeCoaches,
			verifiedCoaches,
			activePlayers,
			verifiedVpc
		);

		// 80% and 50% average to 65%
		expect(overallScore).toBe(65);

		// Assert status translates to Amber
		const statusLabel = getComplianceStatusLabel(overallScore);
		expect(statusLabel).toBe('Amber');

		const statusColor = getComplianceStatusColor(overallScore);
		expect(statusColor).toBe('#f59e0b');
	});

	it('should handle green status zone correctly (>= 90%)', () => {
		// 100% and 90% average to 95% (Green)
		const score95 = computeComplianceHealthScore(1, 1, 10, 9);
		expect(score95).toBe(95);
		expect(getComplianceStatusLabel(score95)).toBe('Green');
		expect(getComplianceStatusColor(score95)).toBe('#14b8a6');

		// exactly 90%
		const score90 = computeComplianceHealthScore(10, 9, 10, 9);
		expect(score90).toBe(90);
		expect(getComplianceStatusLabel(score90)).toBe('Green');
		expect(getComplianceStatusColor(score90)).toBe('#14b8a6');
	});

	it('should handle red status zone correctly (< 60%)', () => {
		// 50% and 60% average to 55% (Red)
		const score55 = computeComplianceHealthScore(2, 1, 10, 6);
		expect(score55).toBe(55);
		expect(getComplianceStatusLabel(score55)).toBe('Red');
		expect(getComplianceStatusColor(score55)).toBe('#f43f5e');

		// exactly 59% (Red)
		const score59 = computeComplianceHealthScore(100, 59, 0, 0);
		expect(score59).toBe(59);
		expect(getComplianceStatusLabel(score59)).toBe('Red');
		expect(getComplianceStatusColor(score59)).toBe('#f43f5e');
	});

	it('should prevent div-by-zero errors when counts are zero, defaulting rates to 100%', () => {
		// If there are no coaches and no players, both rates default to 100%, and score is 100%
		const scoreAllZero = computeComplianceHealthScore(0, 0, 0, 0);
		expect(scoreAllZero).toBe(100);
		expect(getComplianceStatusLabel(scoreAllZero)).toBe('Green');

		// Only coaches are zero
		const scoreCoachesZero = computeComplianceHealthScore(0, 0, 10, 8); // player rate 80%, coaches excluded
		expect(scoreCoachesZero).toBe(80);
		expect(getComplianceStatusLabel(scoreCoachesZero)).toBe('Amber');

		// Only players are zero
		const scorePlayersZero = computeComplianceHealthScore(10, 8, 0, 0); // coach rate 80%, players excluded
		expect(scorePlayersZero).toBe(80);
	});
});
