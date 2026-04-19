/**
 * Single source of truth for client-side user profile shape, completeness,
 * and Firestore hydration (users + coach_lookup + player_lookup).
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getIdTokenResult } from 'firebase/auth';

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
	if (profile.role === 'super_admin' || profile.role === 'director') return true;
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

	const emailKey = firebaseUser.email.toLowerCase();
	const userRef = doc(db, 'users', emailKey);
	const userSnap = await getDoc(userRef);
	const baseProfile = userSnap.exists() ? userSnap.data() : null;
	const fbName = fallbackPlayerName(baseProfile, firebaseUser.email);

	if (role === 'super_admin' || role === 'director') {
		return {
			role,
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
		return { role, profile: merged };
	}

	if (userSnap.exists()) {
		return {
			role,
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
		return { role, profile: { ...newProfile, role } };
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
		return { role, profile: { ...newProfile, role } };
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
		return { role, profile: { ...newProfile, role } };
	}

	return {
		role,
		profile: { role, playerName: fbName }
	};
}
