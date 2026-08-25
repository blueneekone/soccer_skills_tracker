import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	userDocHasPlayerRole,
	getLoginWaterfallDestination,
	applyLoginWaterfall,
	getContextFromHref
} from '../loginRouting';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

vi.mock('$lib/stores/workspaceContext.svelte.js', () => ({
	workspaceContextStore: {
		setActiveContext: vi.fn(),
		setPivot: vi.fn()
	}
}));

describe('loginRouting', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('userDocHasPlayerRole', () => {
		it('returns false for null or undefined profile', () => {
			expect(userDocHasPlayerRole(null)).toBe(false);
			expect(userDocHasPlayerRole(undefined)).toBe(false);
		});

		it('returns false if profile has no roles array', () => {
			expect(userDocHasPlayerRole({})).toBe(false);
			expect(userDocHasPlayerRole({ roles: 'player' })).toBe(false);
		});

		it('returns true if profile roles includes player', () => {
			expect(userDocHasPlayerRole({ roles: ['player'] })).toBe(true);
			expect(userDocHasPlayerRole({ roles: ['admin', 'player'] })).toBe(true);
		});

		it('returns false if profile roles does not include player', () => {
			expect(userDocHasPlayerRole({ roles: ['parent'] })).toBe(false);
			expect(userDocHasPlayerRole({ roles: [] })).toBe(false);
		});
	});

	describe('getLoginWaterfallDestination', () => {
		it('routes admin roles to admin overview', () => {
			const expected = {
				path: '/admin/overview',
				context: 'admin',
				pivotKey: 'ctx-platform-admin',
			};
			expect(getLoginWaterfallDestination('admin', null)).toEqual(expected);
			expect(getLoginWaterfallDestination('super_admin', null)).toEqual(expected);
			expect(getLoginWaterfallDestination('global_admin', null)).toEqual(expected);
		});

		it('routes parent-linked player to player dashboard', () => {
			const profile = { roles: ['player'] };
			const expected = {
				path: '/player/dashboard',
				context: 'household',
				pivotKey: 'ctx-player-home',
			};
			// Even with a different role string, if profile has player role, it should take precedence
			// Wait, the logic is: if userDocHasPlayerRole(profile) returns true.
			// Let's test this with an arbitrary role first.
			expect(getLoginWaterfallDestination('some_role', profile)).toEqual(expected);
		});

		it('routes director with clubId', () => {
			const profile = { clubId: 'club-123' };
			const expected = {
				path: '/director/dashboard?tab=home',
				context: 'director',
				pivotKey: 'ctx-director-club-123',
			};
			expect(getLoginWaterfallDestination('director', profile)).toEqual(expected);
		});

		it('routes director without clubId to fallback', () => {
			const profile = { clubId: '' };
			const expected = {
				path: '/director/dashboard?tab=home',
				context: 'director',
				pivotKey: 'ctx-director-fallback',
			};
			expect(getLoginWaterfallDestination('director', profile)).toEqual(expected);
			expect(getLoginWaterfallDestination('director', null)).toEqual(expected);
		});

		it('routes registrar with clubId', () => {
			const profile = { clubId: 'club-456' };
			const expected = {
				path: '/director/dashboard?tab=compliance',
				context: 'director',
				pivotKey: 'ctx-director-club-456',
			};
			expect(getLoginWaterfallDestination('registrar', profile)).toEqual(expected);
		});

		it('routes registrar without clubId to fallback', () => {
			const expected = {
				path: '/director/dashboard?tab=compliance',
				context: 'director',
				pivotKey: 'ctx-director-fallback',
			};
			expect(getLoginWaterfallDestination('registrar', null)).toEqual(expected);
		});

		it('routes coach', () => {
			const expected = {
				path: '/coach/dashboard',
				context: 'coach',
				pivotKey: 'ctx-coach-default',
			};
			expect(getLoginWaterfallDestination('coach', null)).toEqual(expected);
		});

		it('routes parent', () => {
			const expected = {
				path: '/parent/household',
				context: 'household',
				pivotKey: 'ctx-parent-portal',
			};
			expect(getLoginWaterfallDestination('parent', null)).toEqual(expected);
		});

		it('routes player (without parent link in profile)', () => {
			const expected = {
				path: '/player/dashboard',
				context: 'household',
				pivotKey: 'ctx-player-home',
			};
			expect(getLoginWaterfallDestination('player', null)).toEqual(expected);
		});

		it('routes tutor', () => {
			const expected = {
				path: '/tutor',
				context: 'household',
				pivotKey: 'ctx-tutor-portal',
			};
			expect(getLoginWaterfallDestination('tutor', null)).toEqual(expected);
		});

		it('routes recruiter', () => {
			const expected = {
				path: '/recruiter',
				context: 'recruiter',
				pivotKey: 'ctx-recruiter-portal',
			};
			expect(getLoginWaterfallDestination('recruiter', null)).toEqual(expected);
		});

		it('routes unrecognized role to onboarding', () => {
			const expected = {
				path: '/onboarding',
				context: 'household',
				pivotKey: 'ctx-onboarding',
			};
			expect(getLoginWaterfallDestination('unknown', null)).toEqual(expected);
			expect(getLoginWaterfallDestination('', null)).toEqual(expected);
			expect(getLoginWaterfallDestination(null, null)).toEqual(expected);
			expect(getLoginWaterfallDestination(undefined, null)).toEqual(expected);
		});
	});

	describe('applyLoginWaterfall', () => {
		it('updates workspaceContextStore and returns path', () => {
			const path = applyLoginWaterfall('coach', null);
			expect(path).toBe('/coach/dashboard');
			expect(workspaceContextStore.setActiveContext).toHaveBeenCalledWith('coach');
			expect(workspaceContextStore.setPivot).toHaveBeenCalledWith('ctx-coach-default');
		});
	});

	describe('getContextFromHref', () => {
		it('returns admin for /admin routes', () => {
			expect(getContextFromHref('/admin/overview')).toBe('admin');
			expect(getContextFromHref('/admin')).toBe('admin');
		});

		it('returns director for /director and /registrar routes', () => {
			expect(getContextFromHref('/director/dashboard')).toBe('director');
			expect(getContextFromHref('/registrar/overview')).toBe('director');
		});

		it('returns coach for /coach routes', () => {
			expect(getContextFromHref('/coach/dashboard')).toBe('coach');
		});

		it('returns recruiter for /recruiter routes', () => {
			expect(getContextFromHref('/recruiter/dashboard')).toBe('recruiter');
		});

		it('returns household for parent, home, stats, trophies, settings routes', () => {
			expect(getContextFromHref('/parent/household')).toBe('household');
			expect(getContextFromHref('/home')).toBe('household');
			expect(getContextFromHref('/home/dashboard')).toBe('household');
			expect(getContextFromHref('/stats')).toBe('household');
			expect(getContextFromHref('/trophies')).toBe('household');
			expect(getContextFromHref('/settings/profile')).toBe('household');
			expect(getContextFromHref('/player/settings')).toBe('household');
		});

		it('returns empty string for unrecognized or invalid paths', () => {
			expect(getContextFromHref('/unknown')).toBe('');
			expect(getContextFromHref('')).toBe('');
			expect(getContextFromHref('/')).toBe('');
			expect(getContextFromHref('/player/dashboard')).toBe(''); // Not in the explicitly mapped paths for household unless it matches /player/settings
		});

		it('handles malformed URLs gracefully', () => {
			// Actually URL parsing handles a lot, let's just make sure it doesn't crash on weird inputs
			expect(getContextFromHref('http://[::1]')).toBe(''); // valid url, unrecognized path
		});
	});
});
