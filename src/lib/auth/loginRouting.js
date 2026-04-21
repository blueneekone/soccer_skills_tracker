/**
 * Post-login routing waterfall: highest privilege dashboard first.
 * Sync only — call after auth + profile are resolved to avoid layout thrash.
 */

import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

/**
 * @typedef {'admin' | 'director' | 'coach' | 'registrar' | 'household'} LoginActiveContext
 */

/**
 * @param {string} role
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {{ path: string; context: LoginActiveContext; pivotKey: string }}
 */
export function getLoginWaterfallDestination(role, profile) {
	if (role === 'super_admin') {
		return {
			path: '/admin',
			context: 'admin',
			pivotKey: 'ctx-platform-admin',
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
			path: '/coach?tab=roster',
			context: 'coach',
			pivotKey: 'ctx-coach-default',
		};
	}
	if (role === 'registrar') {
		return {
			path: '/registrar',
			context: 'registrar',
			pivotKey: 'ctx-registrar',
		};
	}
	if (role === 'parent') {
		return {
			path: '/parent/vpc',
			context: 'household',
			pivotKey: 'ctx-parent-portal',
		};
	}
	if (role === 'player') {
		return {
			path: '/home',
			context: 'household',
			pivotKey: 'ctx-player-home',
		};
	}
	return {
		path: '/home',
		context: 'household',
		pivotKey: 'ctx-fallback-home',
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
 * @returns {'' | 'admin' | 'director' | 'coach' | 'registrar' | 'household'}
 */
export function getContextFromHref(href) {
	try {
		const path = new URL(href, 'https://placeholder.local').pathname;
		if (path.startsWith('/admin')) return 'admin';
		if (path.startsWith('/director')) return 'director';
		if (path.startsWith('/coach')) return 'coach';
		if (path.startsWith('/registrar')) return 'registrar';
		if (path.startsWith('/parent')) return 'household';
		if (path === '/home' || path.startsWith('/home/')) return 'household';
		return '';
	} catch {
		return '';
	}
}
