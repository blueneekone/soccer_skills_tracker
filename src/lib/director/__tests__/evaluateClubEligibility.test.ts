import { describe, it, expect } from 'vitest';
import {
	DEFAULT_ELIGIBILITY_MATRIX,
	normalizeEligibilityMatrix,
	evaluateClubEligibility,
	blockerLabel
} from '../evaluateClubEligibility';

describe('evaluateClubEligibility', () => {
	describe('DEFAULT_ELIGIBILITY_MATRIX', () => {
		it('should have correct default boolean values', () => {
			expect(DEFAULT_ELIGIBILITY_MATRIX).toEqual({
				requireWaiver: true,
				requirePassportVerified: true,
				requireVpcForMinors: true,
				requireGuardianLinked: false,
				requireSafeSportClearance: true,
			});
		});
	});

	describe('normalizeEligibilityMatrix', () => {
		it('should return default matrix if raw is null or undefined', () => {
			expect(normalizeEligibilityMatrix(null)).toEqual(DEFAULT_ELIGIBILITY_MATRIX);
			expect(normalizeEligibilityMatrix(undefined)).toEqual(DEFAULT_ELIGIBILITY_MATRIX);
		});

		it('should return default matrix if raw is not an object', () => {
			// @ts-expect-error testing invalid input
			expect(normalizeEligibilityMatrix('invalid')).toEqual(DEFAULT_ELIGIBILITY_MATRIX);
		});

		it('should return default matrix if raw is an empty object', () => {
			expect(normalizeEligibilityMatrix({})).toEqual(DEFAULT_ELIGIBILITY_MATRIX);
		});

		it('should override boolean properties correctly', () => {
			const result = normalizeEligibilityMatrix({
				requireWaiver: false,
				requireGuardianLinked: true,
			});
			expect(result).toEqual({
				requireWaiver: false,
				requirePassportVerified: true,
				requireVpcForMinors: true,
				requireGuardianLinked: true,
				requireSafeSportClearance: true,
			});
		});

		it('should ignore non-boolean or unknown properties', () => {
			const result = normalizeEligibilityMatrix({
				requireWaiver: 'true', // not a boolean
				unknownProperty: true,
			});
			expect(result).toEqual(DEFAULT_ELIGIBILITY_MATRIX);
		});
	});

	describe('evaluateClubEligibility', () => {
		const baseInput = {
			hasSignedWaiver: true,
			passportKind: 'ok' as const,
			guardianLinked: true,
			clearanceStatus: 'CLEARED',
			isMinor: false,
			vpcStatus: 'verified',
		};

		it('should return eligible with no blockers when all criteria are met', () => {
			const result = evaluateClubEligibility(baseInput, DEFAULT_ELIGIBILITY_MATRIX);
			expect(result).toEqual({ eligible: true, blockers: [] });
		});

		it('should return guardian_not_linked blocker when required and not linked', () => {
			const matrix = { ...DEFAULT_ELIGIBILITY_MATRIX, requireGuardianLinked: true };
			const result = evaluateClubEligibility({ ...baseInput, guardianLinked: false }, matrix);
			expect(result).toEqual({ eligible: false, blockers: ['guardian_not_linked'] });
		});

		it('should return waiver_missing blocker when required and not signed', () => {
			const result = evaluateClubEligibility({ ...baseInput, hasSignedWaiver: false }, DEFAULT_ELIGIBILITY_MATRIX);
			expect(result).toEqual({ eligible: false, blockers: ['waiver_missing'] });
		});

		it('should return passport_not_verified blocker when required and not ok', () => {
			const result = evaluateClubEligibility({ ...baseInput, passportKind: 'bad' }, DEFAULT_ELIGIBILITY_MATRIX);
			expect(result).toEqual({ eligible: false, blockers: ['passport_not_verified'] });
		});

		it('should return suspended blocker for RED_CARD safesport clearance', () => {
			const result = evaluateClubEligibility({ ...baseInput, clearanceStatus: 'RED_CARD' }, DEFAULT_ELIGIBILITY_MATRIX);
			expect(result).toEqual({ eligible: false, blockers: ['suspended'] });
		});

		it('should return safesport_pending blocker for PENDING_SAFESPORT clearance', () => {
			const result = evaluateClubEligibility({ ...baseInput, clearanceStatus: 'PENDING_SAFESPORT' }, DEFAULT_ELIGIBILITY_MATRIX);
			expect(result).toEqual({ eligible: false, blockers: ['safesport_pending'] });
		});

		it('should return vpc_not_verified blocker for minors without verified vpc', () => {
			const result = evaluateClubEligibility({ ...baseInput, isMinor: true, vpcStatus: 'pending' }, DEFAULT_ELIGIBILITY_MATRIX);
			expect(result).toEqual({ eligible: false, blockers: ['vpc_not_verified'] });
		});

		it('should return eligible for minor with verified vpc', () => {
			const result = evaluateClubEligibility({ ...baseInput, isMinor: true, vpcStatus: 'verified' }, DEFAULT_ELIGIBILITY_MATRIX);
			expect(result).toEqual({ eligible: true, blockers: [] });
		});

		it('should return multiple blockers when several criteria fail', () => {
			const result = evaluateClubEligibility(
				{
					hasSignedWaiver: false,
					passportKind: 'bad',
					guardianLinked: true,
					clearanceStatus: 'RED_CARD',
					isMinor: true,
					vpcStatus: 'pending',
				},
				DEFAULT_ELIGIBILITY_MATRIX
			);
			expect(result.eligible).toBe(false);
			expect(result.blockers).toContain('waiver_missing');
			expect(result.blockers).toContain('passport_not_verified');
			expect(result.blockers).toContain('suspended');
			expect(result.blockers).toContain('vpc_not_verified');
		});

		it('should return eligible when matrix requires nothing', () => {
			const noReqsMatrix = {
				requireWaiver: false,
				requirePassportVerified: false,
				requireVpcForMinors: false,
				requireGuardianLinked: false,
				requireSafeSportClearance: false,
			};
			const badInput = {
				hasSignedWaiver: false,
				passportKind: 'bad' as const,
				guardianLinked: false,
				clearanceStatus: 'RED_CARD',
				isMinor: true,
				vpcStatus: 'pending',
			};
			const result = evaluateClubEligibility(badInput, noReqsMatrix);
			expect(result).toEqual({ eligible: true, blockers: [] });
		});
	});

	describe('blockerLabel', () => {
		it('should map known codes to labels correctly', () => {
			expect(blockerLabel('guardian_not_linked')).toBe('No guardian account');
			expect(blockerLabel('waiver_missing')).toBe('Waiver missing');
			expect(blockerLabel('passport_not_verified')).toBe('Passport not verified');
			expect(blockerLabel('suspended')).toBe('Suspended');
			expect(blockerLabel('safesport_pending')).toBe('SafeSport pending');
			expect(blockerLabel('vpc_not_verified')).toBe('VPC not verified');
		});

		it('should return a formatted string for unknown codes', () => {
			expect(blockerLabel('unknown_error_code')).toBe('unknown error code');
			expect(blockerLabel('simplecode')).toBe('simplecode');
		});
	});
});
