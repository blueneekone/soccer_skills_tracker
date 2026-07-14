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
import { resolveCellId } from '$lib/types/cells';

/**
 * Extract the Firestore cell ID from a token result's custom claims.
 *
 * Phase 1, Epic 1 — Cell-Based Routing.
 *
 * `tokenResult.claims.cellId` is written by the `syncUserClaims`
 * Cloud Function trigger after reading `organizations/{tenantId}.cellId`.
 * For users provisioned before Session B was deployed, the claim is
 * absent — `resolveCellId` returns the reserved '(default)' string in
 * that case, which correctly routes them to the shared cell.
 *
 * Never returns an empty string — every caller can use the result
 * directly with `getFirestore(app, cellId)`.
 *
 * @param {import('firebase/auth').IdTokenResult | null | undefined} tokenResult
 * @returns {string}
 */
function cellIdFromClaims(tokenResult) {
	return resolveCellId(tokenResult?.claims?.cellId);
}

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
 * Player / operative completeness: team linked OR VPC verified for teamless training.
 * @param {Record<string, unknown>} profile
 */
function isPlayerProfileComplete(profile) {
	const isPlayer =
		profile.role === 'player' || userDocHasPlayerRole(profile);
	if (!isPlayer) return false;
	const name =
		(typeof profile.playerName === 'string' && profile.playerName.trim()) ||
		(typeof profile.name === 'string' && profile.name.trim()) ||
		'';
	if (!name) return false;
	const tid = typeof profile.teamId === 'string' ? profile.teamId.trim() : '';
	if (tid && tid !== 'admin') return true;
	const vpc = profile.vpcStatus;
	return vpc === 'verified' || vpc === 'not_required';
}

/**
 * Parent completeness: club linked OR provisioned household (returning QA parent).
 * @param {Record<string, unknown>} profile
 */
function isParentProfileComplete(profile) {
	if (profile.role !== 'parent') return false;
	const clubId = typeof profile.clubId === 'string' ? profile.clubId.trim() : '';
	if (clubId) return true;
	const householdId =
		typeof profile.householdId === 'string' ? profile.householdId.trim() : '';
	return householdId.length > 0;
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 */
export function isProfileComplete(profile) {
	if (!profile) return false;
	if (isAccountSuspendedProfile(/** @type {Record<string, unknown>} */ (profile))) return false;
	if (isPlayerProfileComplete(/** @type {Record<string, unknown>} */ (profile))) return true;
	if (profile.role === 'super_admin' || profile.role === 'global_admin') return true;
	if (profile.role === 'director') return true;
	if (profile.role === 'registrar' && profile.clubId) return true;
	if (profile.role === 'coach' && profile.teamId) return true;
	if (isParentProfileComplete(/** @type {Record<string, unknown>} */ (profile))) return true;
	// Bypass setup for test accounts (e.g. +parent)
	if (profile.email && typeof profile.email === "string" && profile.email.includes("+")) return true;
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
	/**
	 * Cell-Based Routing — Firestore Multi-Database cell ID.
	 * Defaults to '(default)' for tenants on the shared cell or for
	 * users whose JWT was minted before Session B's syncUserClaims update.
	 */
	let cellId = cellIdFromClaims(tokenResult);
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
			cellId,
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
			cellId,
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
		return { role, tenantId: resolvedTenantId, cellId, profile: merged };
	}

	if (userSnap.exists()) {
		let merged = { ...baseProfile, role, playerName: fbName };
		if (!merged.teamId || String(merged.teamId).trim() === '') {
			const plSnap = await getDoc(doc(db, 'player_lookup', emailKey));
			if (plSnap.exists()) {
				const pl = plSnap.data() || {};
				if (typeof pl.teamId === 'string' && pl.teamId.trim()) {
					merged = { ...merged, teamId: pl.teamId.trim() };
				}
				if (!merged.clubId && typeof pl.clubId === 'string' && pl.clubId.trim()) {
					merged = { ...merged, clubId: pl.clubId.trim() };
				}
			}
		}
		// Parent re-entry: heal clubId from household when provisioned without club on users doc.
		const effectiveRole = typeof merged.role === 'string' ? merged.role : role;
		if (effectiveRole === 'parent') {
			const hid =
				typeof merged.householdId === 'string' ? merged.householdId.trim() : '';
			const hasClub =
				typeof merged.clubId === 'string' && merged.clubId.trim().length > 0;
			if (hid && !hasClub) {
				try {
					const hhSnap = await getDoc(doc(db, 'households', hid));
					if (hhSnap.exists()) {
						const hhClub =
							typeof hhSnap.data()?.clubId === 'string' ?
								hhSnap.data().clubId.trim() :
								'';
						if (hhClub) merged = { ...merged, clubId: hhClub };
					}
				} catch {
					/* non-fatal — householdId alone still satisfies isProfileComplete */
				}
			}
		}
		return {
			role,
			tenantId: resolvedTenantId,
			cellId,
			profile: merged,
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
		cellId = cellIdFromClaims(refreshed);
		return { role, tenantId: coachTenantId, cellId, profile: { ...newProfile, role } };
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
		cellId = cellIdFromClaims(refreshed);
		return { role, tenantId: registrarTenantId, cellId, profile: { ...newProfile, role } };
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
			cellId,
			profile: { ...newProfile, role },
		};
	}

	return {
		role,
		tenantId: claimedTenantId,
		cellId,
		profile: { role, playerName: fbName }
	};
}
