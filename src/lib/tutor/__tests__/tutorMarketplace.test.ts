import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	computeEligibility,
	ScholarEngine,
	TutorRosterEngine
} from '$lib/services/scholar.svelte.js';

describe('Tutor & Scholar Engine', () => {
	describe('computeEligibility', () => {
		it('returns eligible when GPA >= 2.0', () => {
			expect(computeEligibility(4.0)).toBe('eligible');
			expect(computeEligibility(2.0)).toBe('eligible');
			expect(computeEligibility(3.25)).toBe('eligible');
		});

		it('returns probation when GPA is between 1.5 and 1.99', () => {
			expect(computeEligibility(1.99)).toBe('probation');
			expect(computeEligibility(1.5)).toBe('probation');
			expect(computeEligibility(1.75)).toBe('probation');
		});

		it('returns ineligible when GPA < 1.5', () => {
			expect(computeEligibility(1.49)).toBe('ineligible');
			expect(computeEligibility(0.0)).toBe('ineligible');
			expect(computeEligibility(1.0)).toBe('ineligible');
		});
	});

	describe('ScholarEngine', () => {
		it('initializes with default values and formats gpaLabel', () => {
			const engine = new ScholarEngine('player1@test.com');
			expect(engine.gpa).toBe(0);
			expect(engine.studyHours).toBe(0);
			expect(engine.eligibility).toBe('unknown');
			expect(engine.hasScholarBadge).toBe(false);
			expect(engine.gpaLabel).toBe('—');
		});

		it('calculates eligibility and scholar badge when record is populated', () => {
			const engine = new ScholarEngine('player2@test.com');
			engine.record = {
				playerEmail: 'player2@test.com',
				gpa: 3.8,
				studyHoursWeek: 12,
				eligibilityStatus: 'eligible',
				subjects: [],
				gpaTrend: [],
				updatedAt: new Date(),
				tenantId: 'tenant-1'
			};

			expect(engine.gpa).toBe(3.8);
			expect(engine.studyHours).toBe(12);
			expect(engine.eligibility).toBe('eligible');
			expect(engine.hasScholarBadge).toBe(true);
			expect(engine.gpaLabel).toBe('3.80');
		});
	});

	describe('TutorRosterEngine aggregates', () => {
		it('calculates correct aggregate counts across student engines', () => {
			const roster = new TutorRosterEngine();
			const e1 = new ScholarEngine('s1@test.com');
			e1.record = {
				playerEmail: 's1@test.com',
				gpa: 3.8,
				studyHoursWeek: 10,
				eligibilityStatus: 'eligible',
				subjects: [],
				gpaTrend: [],
				updatedAt: new Date(),
				tenantId: 'tenant-1'
			};

			const e2 = new ScholarEngine('s2@test.com');
			e2.record = {
				playerEmail: 's2@test.com',
				gpa: 1.8,
				studyHoursWeek: 5,
				eligibilityStatus: 'probation',
				subjects: [],
				gpaTrend: [],
				updatedAt: new Date(),
				tenantId: 'tenant-1'
			};

			const e3 = new ScholarEngine('s3@test.com');
			e3.record = {
				playerEmail: 's3@test.com',
				gpa: 1.2,
				studyHoursWeek: 2,
				eligibilityStatus: 'ineligible',
				subjects: [],
				gpaTrend: [],
				updatedAt: new Date(),
				tenantId: 'tenant-1'
			};

			roster.engines = [e1, e2, e3];

			expect(roster.eligibleCount).toBe(1);
			expect(roster.probationCount).toBe(1);
			expect(roster.ineligibleCount).toBe(1);
			expect(roster.scholarsCount).toBe(1); // e1 has GPA 3.8 >= 3.5
			expect(roster.avgGpa).toBeCloseTo((3.8 + 1.8 + 1.2) / 3, 2);
		});
	});
});
