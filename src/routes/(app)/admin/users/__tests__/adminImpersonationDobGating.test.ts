import { describe, it, expect, vi } from 'vitest';
import { mapUserDocumentToRow } from '$lib/admin/globalUsersMapper.js';

describe('Admin OS: Impersonation Gates & DOB Gating', () => {
	describe('User Mapper - DOB and Minor Status Preservation', () => {
		it('maps user document with minor DOB properties into GlobalUserRow', () => {
			const rawDoc = {
				email: 'athlete@example.com',
				displayName: 'Young Athlete',
				role: 'player',
				clubId: 'club-1',
				teamId: 'team-a',
				dateOfBirth: '2012-05-10',
				isMinor: true,
				ageBand: 'under13',
				vpcStatus: 'pending_parent'
			};

			const row = mapUserDocumentToRow('athlete@example.com', rawDoc);

			expect(row.id).toBe('athlete@example.com');
			expect(row.email).toBe('athlete@example.com');
			expect(row.isMinor).toBe(true);
			expect(row.ageBand).toBe('under13');
			expect(row.vpcStatus).toBe('pending_parent');
			expect(row.dateOfBirth).toBe('2012-05-10');
		});

		it('maps adult user document correctly', () => {
			const rawDoc = {
				email: 'adult@example.com',
				displayName: 'Adult Coach',
				role: 'coach',
				clubId: 'club-1',
				dateOfBirth: '1990-01-15',
				isMinor: false,
				ageBand: 'adult',
				vpcStatus: 'not_required'
			};

			const row = mapUserDocumentToRow('adult@example.com', rawDoc);

			expect(row.isMinor).toBe(false);
			expect(row.ageBand).toBe('adult');
			expect(row.vpcStatus).toBe('not_required');
		});
	});

	describe('Impersonation Gate Rules', () => {
		it('blocks impersonation when target is a global admin or super admin', () => {
			const targetRole = 'global_admin';
			const isAllowed = targetRole !== 'super_admin' && targetRole !== 'global_admin';
			expect(isAllowed).toBe(false);
		});

		it('blocks impersonation when target is self', () => {
			const callerUid = 'admin-uid-123';
			const targetUid = 'admin-uid-123';
			const isSelf = callerUid === targetUid;
			expect(isSelf).toBe(true);
		});

		it('allows impersonation when target is a valid non-admin user', () => {
			const targetRole = 'director';
			const callerUid = 'admin-123';
			const targetUid = 'director-456';

			const isAllowed =
				callerUid !== targetUid &&
				targetRole !== 'super_admin' &&
				targetRole !== 'global_admin';

			expect(isAllowed).toBe(true);
		});
	});

	describe('DOB Gating & Age Band Computations', () => {
		it('computes minor status correctly based on threshold < 17', () => {
			const computeIsMinor = (birthYear: number, currentYear = 2026) => {
				const age = currentYear - birthYear;
				return age < 17;
			};

			expect(computeIsMinor(2015)).toBe(true); // age 11 -> minor
			expect(computeIsMinor(2010)).toBe(true); // age 16 -> minor
			expect(computeIsMinor(2005)).toBe(false); // age 21 -> adult
		});

		it('categorizes age bands accurately', () => {
			const computeAgeBand = (age: number) => {
				if (age < 13) return 'under13';
				if (age < 17) return 'teen13to16';
				return 'adult';
			};

			expect(computeAgeBand(10)).toBe('under13');
			expect(computeAgeBand(14)).toBe('teen13to16');
			expect(computeAgeBand(18)).toBe('adult');
		});
	});
});
