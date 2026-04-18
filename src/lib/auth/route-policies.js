/**
 * Phase 0 RBAC: single source of truth for role-gated route prefixes under (app).
 * Keep in sync with Firestore rules / custom claims.
 */
export const ROLE_ROUTE_POLICIES = {
	'/admin': ['super_admin'],
	'/director': ['super_admin', 'director'],
	'/coach': ['super_admin', 'director', 'coach'],
	'/registrar': ['super_admin', 'director', 'registrar']
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
