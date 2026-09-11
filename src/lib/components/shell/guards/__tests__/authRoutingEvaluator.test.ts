import { describe, it, expect } from 'vitest';
import {
	evaluateAuthRedirect,
	shouldBypassAuth,
	type AuthRoutingContext
} from '../authRoutingEvaluator.js';

describe('Auth Routing Evaluator (Sprint 1.1)', () => {
	it('bypasses public match views', () => {
		expect(shouldBypassAuth('/public/match/123')).toBe(true);
		expect(shouldBypassAuth('/coach/dashboard', 'matchToken=abc')).toBe(true);
		expect(shouldBypassAuth('/coach/dashboard')).toBe(false);
	});

	it('redirects unauthenticated users to /login', () => {
		const context: AuthRoutingContext = {
			currentPath: '/coach/dashboard',
			isAuthenticated: false
		};
		expect(evaluateAuthRedirect(context)).toBe('/login');
	});

	it('does not redirect unauthenticated users if already on /login or /register', () => {
		expect(evaluateAuthRedirect({ currentPath: '/login', isAuthenticated: false })).toBeNull();
		expect(evaluateAuthRedirect({ currentPath: '/register', isAuthenticated: false })).toBeNull();
	});

	it('redirects users without a valid role to /onboarding/role-select', () => {
		const context: AuthRoutingContext = {
			currentPath: '/some-view',
			isAuthenticated: true,
			role: null
		};
		expect(evaluateAuthRedirect(context)).toBe('/onboarding/role-select');
	});

	it('redirects uncleared coaches to /onboarding/clearance/coach unless in sandbox', () => {
		const unclearedCoach: AuthRoutingContext = {
			currentPath: '/coach/dashboard',
			isAuthenticated: true,
			role: 'coach',
			isCleared: false,
			isProfileComplete: true
		};
		expect(evaluateAuthRedirect(unclearedCoach)).toBe('/onboarding/clearance/coach');

		const coachInSandbox: AuthRoutingContext = {
			currentPath: '/coach/sandbox',
			isAuthenticated: true,
			role: 'coach',
			isCleared: false,
			isProfileComplete: true
		};
		expect(evaluateAuthRedirect(coachInSandbox)).toBeNull();
	});

	it('redirects players with unverified VPC to /vpc-pending', () => {
		const minorPlayer: AuthRoutingContext = {
			currentPath: '/player/dashboard',
			isAuthenticated: true,
			role: 'player',
			isCleared: true,
			isProfileComplete: true,
			isMinor: true,
			vpcStatus: 'pending'
		};
		expect(evaluateAuthRedirect(minorPlayer)).toBe('/vpc-pending');
	});

	it('redirects players violating role boundary to their waterfall target', () => {
		const playerOnAdminRoute: AuthRoutingContext = {
			currentPath: '/admin/overview',
			isAuthenticated: true,
			role: 'player',
			isCleared: true,
			isProfileComplete: true,
			isMinor: false,
			isConsented: true
		};
		expect(evaluateAuthRedirect(playerOnAdminRoute)).toBe('/player/dashboard');
	});

	it('allows valid authenticated coach on coach dashboard', () => {
		const validCoach: AuthRoutingContext = {
			currentPath: '/coach/dashboard',
			isAuthenticated: true,
			role: 'coach',
			isCleared: true,
			isProfileComplete: true
		};
		expect(evaluateAuthRedirect(validCoach)).toBeNull();
	});
});
