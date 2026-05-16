/**
 * Post-login routing waterfall: highest privilege dashboard first.
 * Sync only — call after auth + profile are resolved to avoid layout thrash.
 */

import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

/**
 * @typedef {'admin' | 'director' | 'coach' | 'registrar' | 'household'} LoginActiveContext
 */

/**
 * True when Firestore `users/{email}` has `roles` including `player` (child accounts
 * provisioned by a parent; onboarding can be skipped).
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {boolean}
 */
export function userDocHasPlayerRole(profile) {
	if (!profile || !Array.isArray(profile.roles)) return false;
	return profile.roles.includes('player');
}

/**
 * @param {string} role
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {{ path: string; context: LoginActiveContext; pivotKey: string }}
 */
export function getLoginWaterfallDestination(role, profile) {
	if (role === 'super_admin' || role === 'global_admin') {
		return {
			path: '/admin/overview',
			context: 'admin',
			pivotKey: 'ctx-platform-admin',
		};
	}
	/** Parent-linked player: skip profile completeness / setup; parent already onboarded. */
	if (userDocHasPlayerRole(profile)) {
		return {
			path: '/player/dashboard',
			context: 'household',
			pivotKey: 'ctx-player-home',
		};
	}
	if (role === 'director') {
		const cid = typeof profile?.clubId === 'string' ? profile.clubId.trim() : '';
		return {
			path: '/director?tab=home',
			context: 'director',
			pivotKey: cid ? `ctx-director-${cid}` : 'ctx-director-fallback',
		};
	}
	if (role === 'coach') {
		return {
			path: '/coach',
			context: 'coach',
			pivotKey: 'ctx-coach-default',
		};
	}
	if (role === 'registrar') {
		const cid = typeof profile?.clubId === 'string' ? profile.clubId.trim() : '';
		return {
			path: '/director?tab=registrars',
			context: 'director',
			pivotKey: cid ? `ctx-director-${cid}` : 'ctx-director-fallback',
		};
	}
	if (role === 'parent') {
		return {
			path: '/parent/household',
			context: 'household',
			pivotKey: 'ctx-parent-portal',
		};
	}
	if (role === 'player') {
		return {
			path: '/player/dashboard',
			context: 'household',
			pivotKey: 'ctx-player-home',
		};
	}
	if (role === 'tutor') {
		return {
			path: '/tutor',
			context: 'household',
			pivotKey: 'ctx-tutor-portal',
		};
	}
	if (role === 'recruiter') {
		return {
			path: '/recruiter',
			context: 'recruiter',
			pivotKey: 'ctx-recruiter-portal',
		};
	}
	// No recognized role — route to onboarding for invite-code / profile setup
	return {
		path: '/onboarding',
		context: 'household',
		pivotKey: 'ctx-onboarding',
	};
}

/**
 * Updates workspace context store and returns the path for `goto()`.
 * @param {string} role
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {string}
 */
export function applyLoginWaterfall(role, profile) {
	const { path, context, pivotKey } = getLoginWaterfallDestination(role, profile);
	workspaceContextStore.setActiveContext(context);
	workspaceContextStore.setPivot(pivotKey);
	return path;
}

/**
 * Map a navigation target to `activeContext` (sidebar switcher + store).
 * @param {string} href
 * @returns {'' | 'admin' | 'director' | 'coach' | 'registrar' | 'recruiter' | 'household'}
 */
export function getContextFromHref(href) {
	try {
		const path = new URL(href, 'https://placeholder.local').pathname;
		if (path.startsWith('/admin')) return 'admin';
		if (path.startsWith('/director')) return 'director';
		if (path.startsWith('/coach')) return 'coach';
		if (path.startsWith('/recruiter')) return 'recruiter';
		if (path.startsWith('/parent')) return 'household';
		if (path === '/home' || path.startsWith('/home/')) return 'household';
		if (path.startsWith('/stats')) return 'household';
		if (path.startsWith('/trophies')) return 'household';
		if (path.startsWith('/settings')) return 'household';
		return '';
	} catch {
		return '';
	}
}
