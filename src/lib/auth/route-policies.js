/**
 * Phase 0 RBAC: single source of truth for role-gated route prefixes under (app).
 * Keep in sync with Firestore rules / custom claims.
 *
 * Sprint 1.3/1.4: athlete dashboards default-deny for parent/registrar/coach/director
 * unless listed (super_admin may enter for troubleshooting).
 */
export const ROLE_ROUTE_POLICIES = {
	'/admin': ['super_admin'],
	'/director': ['super_admin', 'director'],
	'/recruiter': ['super_admin', 'director'],
	'/coach': ['super_admin', 'director', 'coach'],
	'/registrar': ['super_admin', 'director', 'registrar'],
	'/parent': ['parent'],
	'/tracker': ['player', 'super_admin'],
	'/stats': ['player', 'super_admin'],
	'/challenges': ['player', 'super_admin'],
	'/passport': ['player', 'super_admin'],
	'/trophies': ['player', 'super_admin']
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
