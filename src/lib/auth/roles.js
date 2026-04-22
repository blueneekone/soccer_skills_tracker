/**
 * Centralized role helpers.
 *
 * "Platform Admin" is the canonical name for the highest-privilege role. During
 * the Sprint 2.7 migration we accept both `global_admin` (new canonical token)
 * and `super_admin` (legacy, still present on un-refreshed JWTs and older
 * `users/{email}` docs). Both resolve to identical authority until the legacy
 * value is fully decommissioned.
 */

/**
 * @param {string | null | undefined} role
 * @returns {boolean}
 */
export function isPlatformAdmin(role) {
	return role === 'global_admin' || role === 'super_admin';
}

/**
 * List of role tokens that should be treated as platform admin anywhere a
 * caller expects an explicit enumeration (e.g. Firestore `where('role','in', …)`).
 */
export const PLATFORM_ADMIN_ROLES = Object.freeze(['global_admin', 'super_admin']);

/**
 * Human-readable label for a role token.
 * @param {string | null | undefined} role
 */
export function roleLabel(role) {
	if (isPlatformAdmin(role)) return 'Global Admin';
	switch (role) {
		case 'director':
			return 'Director';
		case 'coach':
			return 'Coach';
		case 'registrar':
			return 'Registrar';
		case 'recruiter':
			return 'Recruiter';
		case 'parent':
			return 'Parent';
		case 'player':
			return 'Player';
		default:
			return 'User';
	}
}
