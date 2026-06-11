/**
 * Phase 0 RBAC: single source of truth for role-gated route prefixes under (app).
 * Unauthenticated or anonymous sessions: `(app)/+layout.svelte` + `onAuthStateChanged` in
 * `auth.svelte.js` redirect to `/login` before shell UI is shown.
 * Keep in sync with Firestore rules / custom claims.
 *
 * Sprint 1.3/1.4: athlete dashboards default-deny for parent/registrar/coach/director
 * unless listed (super_admin may enter for troubleshooting).
 */
export const ROLE_ROUTE_POLICIES = {
	'/admin': ['super_admin', 'global_admin'],
	'/director': ['super_admin', 'global_admin', 'director', 'registrar'],
	'/registrar': ['super_admin', 'global_admin', 'director', 'registrar'],
	'/recruiter': ['super_admin', 'global_admin', 'director'],
	'/coach': ['super_admin', 'global_admin', 'director', 'coach'],
	'/parent': ['parent'],
	'/player': ['player', 'super_admin', 'global_admin'],
	'/operative': ['player', 'super_admin', 'global_admin'],
	'/tracker': ['player', 'super_admin', 'global_admin'],
	'/stats': ['player', 'super_admin', 'global_admin'],
	'/challenges': ['player', 'super_admin', 'global_admin'],
	'/passport': ['player', 'super_admin', 'global_admin'],
	'/trophies': ['player', 'super_admin', 'global_admin'],
	'/vpc-pending': ['player']
};

/**
 * @param {string} pathname
 * @param {string} role
 * @returns {boolean}
 */
export function isRouteAllowedForRole(pathname, role) {
	for (const [route, allowedRoles] of Object.entries(ROLE_ROUTE_POLICIES)) {
		if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
			return false;
		}
	}
	return true;
}

/** Sprint 2.1 — routes that collect or display player training / performance PII. */
export const DATA_COLLECTION_ROUTES = [
	'/tracker',
	'/stats',
	'/operative',
	'/challenges',
	'/passport',
	'/player/workout',
	'/player/proving-grounds',
	'/player/media',
	'/player/armory',
	'/player/skill-tree',
	'/player/tracker',
];

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isDataCollectionRoute(pathname) {
	return DATA_COLLECTION_ROUTES.some((route) => pathname.startsWith(route));
}
