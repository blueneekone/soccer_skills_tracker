/**
 * Centralized role helpers.
 *
 * "Platform Admin" is the canonical name for the highest-privilege role. During
 * the Sprint 2.7 migration we accept both `global_admin` (new canonical token)
 * and `super_admin` (legacy, still present on un-refreshed JWTs and older
 * `users/{email}` docs). Both resolve to identical authority until the legacy
 * value is fully decommissioned.
 *
 * **Enterprise soft-delete:** `users/{email}.status === 'suspended'` revokes
 * Operative access; JWT may lag — Firestore + auth store `onSnapshot` are source
 * of truth for the session.
 */

/** Match `users/{email}.status` set by Global Admin "Revoke access". */
export const USER_ACCOUNT_STATUS = Object.freeze({
	suspended: 'suspended',
});

/**
 * Auth store / routing: reserved synthetic role when the account is soft-deleted.
 * @type {const}
 */
export const SYNTHETIC_SUSPENDED_ROLE = 'suspended';

/**
 * @param {string | null | undefined} r
 * @returns {boolean}
 */
export function isSyntheticSuspendedRole(r) {
	return r === SYNTHETIC_SUSPENDED_ROLE;
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {boolean}
 */
export function isAccountSuspendedProfile(profile) {
	if (!profile || typeof profile !== 'object') return false;
	return String(/** @type {Record<string, unknown>} */ (profile).status || '').toLowerCase() ===
		USER_ACCOUNT_STATUS.suspended;
}

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
