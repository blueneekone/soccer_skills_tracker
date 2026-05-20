import { describe, expect, it } from 'vitest';
import { getLoginWaterfallDestination } from '$lib/auth/loginRouting.js';
import { deriveNeedsOnboarding, deriveRoleFlags } from '$lib/stores/auth/roleDerivations.js';

/**
 * Login → dashboard state-machine regression guards (Phase C).
 * Pure routing + onboarding gates — no Firebase I/O.
 */
describe('login-to-dashboard workflow (Phase C regression guards)', () => {
	it('routes coaches to /coach after profile is complete', () => {
		const dest = getLoginWaterfallDestination('coach', { clubId: 'fc-demo' });
		expect(dest.path).toBe('/coach');
		expect(dest.context).toBe('coach');
	});

	it('routes global admins to admin overview', () => {
		const dest = getLoginWaterfallDestination('global_admin', {});
		expect(dest.path).toBe('/admin/overview');
	});

	it('routes players to player dashboard', () => {
		const dest = getLoginWaterfallDestination('player', { clubId: 'fc-demo' });
		expect(dest.path).toBe('/player/dashboard');
	});

	it('needsOnboarding blocks dashboard until tenant claim exists (coach path)', () => {
		const flags = deriveRoleFlags('coach');
		expect(flags.isCoach).toBe(true);
		expect(
			deriveNeedsOnboarding({
				isAuthenticated: true,
				isLoading: false,
				tenantId: '',
				role: 'coach',
			}),
		).toBe(true);
	});

	it('directors with tenantId skip onboarding gate', () => {
		expect(
			deriveNeedsOnboarding({
				isAuthenticated: true,
				isLoading: false,
				tenantId: 'fc-demo',
				role: 'director',
			}),
		).toBe(false);
	});
});
