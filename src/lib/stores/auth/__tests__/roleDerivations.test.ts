import { describe, expect, it } from 'vitest';
import {
	deriveIsCleared,
	deriveNeedsOnboarding,
	deriveRequiresConsent,
	deriveRoleFlags,
	canAccess,
	type AccessGate,
} from '$lib/stores/auth/roleDerivations.js';

describe('auth/roleDerivations', () => {
	it('deriveRoleFlags maps platform and tenant roles', () => {
		expect(deriveRoleFlags('coach')).toMatchObject({ isCoach: true, isAdmin: false });
		expect(deriveRoleFlags('global_admin')).toMatchObject({ isAdmin: true, isDirector: false });
		expect(deriveRoleFlags('director')).toMatchObject({ isDirector: true, isAdmin: false });
		expect(deriveRoleFlags('player')).toMatchObject({ isPlayer: true });
	});

	it('deriveNeedsOnboarding is true for authenticated users without tenant (non-admin)', () => {
		expect(
			deriveNeedsOnboarding({
				isAuthenticated: true,
				isLoading: false,
				tenantId: '',
				role: 'coach',
			}),
		).toBe(true);
		expect(
			deriveNeedsOnboarding({
				isAuthenticated: true,
				isLoading: false,
				tenantId: 'club-1',
				role: 'coach',
			}),
		).toBe(false);
	});

	it('deriveRequiresConsent gates minor players without granted coppaStatus', () => {
		expect(
			deriveRequiresConsent({
				isAuthenticated: true,
				isLoading: false,
				role: 'player',
				userProfile: { isMinor: true, coppaStatus: 'pending' },
			}),
		).toBe(true);
		expect(
			deriveRequiresConsent({
				isAuthenticated: true,
				isLoading: false,
				role: 'player',
				userProfile: { isMinor: true, coppaStatus: 'granted' },
			}),
		).toBe(false);
	});

	it('deriveIsCleared exempts non-coach roles and validates clearance expiry', () => {
		expect(deriveIsCleared('director', null)).toBe(true);
		expect(deriveIsCleared('coach', { clearance: { status: 'cleared' } })).toBe(true);
		expect(deriveIsCleared('coach', { clearance: { status: 'pending' } })).toBe(false);
	});

	it('canAccess is the UI permission matrix (Sprint 1.3)', () => {
		expect(canAccess('global_admin', 'admin')).toBe(true);
		expect(canAccess('coach', 'admin')).toBe(false);
		expect(canAccess('director', 'director')).toBe(true);
		expect(canAccess('coach', 'coach')).toBe(true);
		expect(canAccess('player', 'coach')).toBe(false);
		expect(canAccess('parent', 'parent')).toBe(true);
	});
});
