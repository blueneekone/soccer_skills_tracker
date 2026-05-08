/**
 * Single source of truth for client-side user profile shape, completeness,
 * and Firestore hydration (users + coach_lookup + player_lookup).
 *
 * Firestore `users/{emailKey}` — gamification (Sprint 3.3, server-written only):
 * - `xp` (number, int): total experience; default 0.
 * - `currentStreak` (number, int): consecutive active days; default 0.
 * - `longestStreak` (number, int): best streak; optional until first award.
 * - `lastActivityDate` (string `YYYY-MM-DD` UTC or Timestamp): last day daily
 *   XP was granted via `logPlayerActivity`.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getIdTokenResult } from 'firebase/auth';
import { isAccountSuspendedProfile, SYNTHETIC_SUSPENDED_ROLE } from '$lib/auth/roles.js';
import { userDocHasPlayerRole } from '$lib/auth/loginRouting.js';

/**
 * @param {Record<string, unknown> | null | undefined} baseProfile
 * @param {string} email
 */
export function fallbackPlayerName(baseProfile, email) {
	const local = email.split('@')[0];
	return (
		(baseProfile &&
			(baseProfile.playerName || baseProfile.name || baseProfile.player)) ||
		local
	);
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 */
export function isProfileComplete(profile) {
	if (!profile) return false;
	if (isAccountSuspendedProfile(/** @type {Record<string, unknown>} */ (profile))) return false;
	if (userDocHasPlayerRole(/** @type {Record<string, unknown>} */ (profile))) return true;
	if (profile.role === 'super_admin' || profile.role === 'global_admin') return true;
	if (profile.role === 'director') return true;
	if (profile.role === 'registrar' && profile.clubId) return true;
	if (profile.role === 'coach' && profile.teamId) return true;
	if (profile.role === 'parent' && profile.clubId) return true;
	if (profile.playerName && profile.teamId) return true;
	return false;
}

/**
 * Load JWT role + users doc; auto-provision from coach_lookup / player_lookup when missing.
 *
 * @param {import('firebase/firestore').Firestore} db
 * @param {import('firebase/auth').User} firebaseUser
 * @param {boolean} [forceTokenRefresh]
 * @returns {Promise<{ role: string, profile: Record<string, unknown> }>}
 */
export async function resolveUserProfile(db, firebaseUser, forceTokenRefresh = true) {
	const tokenResult = await getIdTokenResult(firebaseUser, forceTokenRefresh);
	let role = tokenResult.claims.role || 'player';
	/**
	 * Tenant ID sourced from JWT custom claims — set by `syncUserClaims`
	 * Cloud Function trigger.  `clubId` is the legacy claim name (backward compat);
	 * `tenantId` is the canonical name going forward.  Both are accepted.
	 * Empty string '' means the user has no club scope yet.
	 */
	const claimedTenantId = String(
		tokenResult.claims.clubId || tokenResult.claims.tenantId || '',
	);
	/** @see Firebase custom claims — global admin must bypass setup even if users/{email} is missing */
	if (tokenResult.claims.isGlobalAdmin === true || tokenResult.claims.isSuperAdmin === true) {
		role = role === 'global_admin' ? 'global_admin' : 'super_admin';
	}

	const emailKey = firebaseUser.email.toLowerCase();
	const userRef = doc(db, 'users', emailKey);
	const userSnap = await getDoc(userRef);
	const baseProfile = userSnap.exists() ? userSnap.data() : null;
	const fbName = fallbackPlayerName(baseProfile, firebaseUser.email);
	// Claims are authoritative; fall back to Firestore `clubId` for users
	// who existed before the syncUserClaims trigger was deployed.
	const resolvedTenantId =
		claimedTenantId || String((baseProfile && baseProfile.clubId) ? baseProfile.clubId : '');

	const isJwtPlatformAdmin =
		tokenResult.claims.isGlobalAdmin === true ||
		tokenResult.claims.isSuperAdmin === true ||
		role === 'global_admin' ||
		role === 'super_admin';

	// Enterprise soft-delete: never trust stale JWT if Firestore says suspended.
	// (Platform admins in-token are protected — operator cannot soft-delete a Global Admin account.)
	if (baseProfile && isAccountSuspendedProfile(/** @type {Record<string, unknown>} */ (baseProfile)) && !isJwtPlatformAdmin) {
		return {
			role: SYNTHETIC_SUSPENDED_ROLE,
			tenantId: resolvedTenantId,
			profile: {
				...(baseProfile || {}),
				status: 'suspended',
				role: typeof baseProfile.role === 'string' ? baseProfile.role : 'guest',
				playerName: fbName,
			},
		};
	}

	if (role === 'super_admin' || role === 'global_admin' || role === 'director') {
		return {
			role,
			tenantId: resolvedTenantId,
			profile: {
				...(baseProfile || {}),
				playerName: fbName,
				teamId: 'admin',
				role
			}
		};
	}

	// Registrars: club-scoped staff only (no player team / no teamId).
	if (role === 'registrar' && userSnap.exists()) {
		const merged = { ...baseProfile, role, playerName: fbName };
		delete merged.teamId;
		return { role, tenantId: resolvedTenantId, profile: merged };
	}

	if (userSnap.exists()) {
		return {
			role,
			tenantId: resolvedTenantId,
			profile: { ...baseProfile, role, playerName: fbName }
		};
	}

	const coachRef = doc(db, 'coach_lookup', emailKey);
	const coachSnap = await getDoc(coachRef);
	if (coachSnap.exists()) {
		const data = coachSnap.data();
		const coachRole = data.role || 'coach';
		const newProfile = {
			teamId: data.teamId,
			...(data.clubId ? { clubId: data.clubId } : {}),
			role: coachRole,
			playerName: data.playerName || firebaseUser.displayName || fbName,
			joinedAt: new Date()
		};
		await setDoc(userRef, newProfile);
		const refreshed = await getIdTokenResult(firebaseUser, true);
		role = refreshed.claims.role || coachRole;
		const coachTenantId =
			String(refreshed.claims.clubId || refreshed.claims.tenantId || '') ||
			String(data.clubId ?? '');
		return { role, tenantId: coachTenantId, profile: { ...newProfile, role } };
	}

	const registrarRef = doc(db, 'registrar_lookup', emailKey);
	const registrarSnap = await getDoc(registrarRef);
	if (registrarSnap.exists()) {
		const data = registrarSnap.data();
		const newProfile = {
			clubId: data.clubId,
			role: 'registrar',
			playerName: data.playerName || firebaseUser.displayName || fbName,
			joinedAt: new Date()
		};
		await setDoc(userRef, newProfile);
		const refreshed = await getIdTokenResult(firebaseUser, true);
		role = refreshed.claims.role || 'registrar';
		const registrarTenantId =
			String(refreshed.claims.clubId || refreshed.claims.tenantId || '') ||
			String(data.clubId ?? '');
		return { role, tenantId: registrarTenantId, profile: { ...newProfile, role } };
	}

	const inviteRef = doc(db, 'player_lookup', emailKey);
	const inviteSnap = await getDoc(inviteRef);
	if (inviteSnap.exists()) {
		const data = inviteSnap.data();
		const newProfile = {
			teamId: data.teamId,
			playerName: data.playerName,
			joinedAt: new Date(),
			...(data.clubId != null ? { clubId: data.clubId } : {})
		};
		await setDoc(userRef, newProfile);
		return {
			role,
			tenantId: claimedTenantId || String(data.clubId != null ? data.clubId : ''),
			profile: { ...newProfile, role },
		};
	}

	return {
		role,
		tenantId: claimedTenantId,
		profile: { role, playerName: fbName }
	};
}
