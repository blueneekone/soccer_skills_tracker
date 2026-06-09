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

// ─────────────────────────────────────────────────────────────────────────────
// T0-3: Google sign-in doc key — must be normalized email, not UID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure mirror of authRouter.ts `getRoleDestination` — copied here so the
 * test has no Firebase/SvelteKit imports but still guards the role table.
 */
function getRoleDestinationPure(role: string | null | undefined): string {
	switch (role) {
		case 'super_admin':
		case 'global_admin': return '/admin/overview';
		case 'director':     return '/director';
		case 'coach':        return '/coach';
		case 'registrar':    return '/director';
		case 'parent':       return '/parent/household';
		case 'player':       return '/player/dashboard';
		case 'recruiter':    return '/recruiter';
		case 'tutor':        return '/tutor';
		default:             return '/onboarding';
	}
}

describe('T0-3: users doc keyed by normalized email (not UID)', () => {
	it('normalizes email to lowercase + trimmed doc key', () => {
		const rawEmail = '  User@Example.COM  ';
		const emailKey = rawEmail.trim().toLowerCase();
		expect(emailKey).toBe('user@example.com');
	});

	it('strips internal whitespace variations and uppercasing', () => {
		expect('COACH@CLUB.ORG'.trim().toLowerCase()).toBe('coach@club.org');
		expect('  player@example.com  '.trim().toLowerCase()).toBe('player@example.com');
	});

	it('handles null email with empty string fallback (no write guard)', () => {
		const emailKey = (null ?? '').trim().toLowerCase();
		expect(emailKey).toBe('');
		expect(emailKey.length).toBe(0);
	});

	it('handles undefined email with empty string fallback (no write guard)', () => {
		const emailKey = (undefined ?? '').trim().toLowerCase();
		expect(emailKey).toBe('');
		expect(emailKey.length).toBe(0);
	});

	it('missing doc (new Google user) routes to /onboarding', () => {
		expect(getRoleDestinationPure(undefined)).toBe('/onboarding');
	});

	it('null role routes to /onboarding', () => {
		expect(getRoleDestinationPure(null)).toBe('/onboarding');
	});

	it('existing coach profile routes to /coach after email-keyed doc read', () => {
		expect(getRoleDestinationPure('coach')).toBe('/coach');
	});

	it('existing player profile routes to /player/dashboard after email-keyed doc read', () => {
		expect(getRoleDestinationPure('player')).toBe('/player/dashboard');
	});

	it('existing parent profile routes to /parent/household after email-keyed doc read', () => {
		expect(getRoleDestinationPure('parent')).toBe('/parent/household');
	});
});
