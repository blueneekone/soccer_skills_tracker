import { auth, db } from '$lib/firebase.js';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { isAccountSuspendedProfile, SYNTHETIC_SUSPENDED_ROLE } from '$lib/auth/roles.js';
import { markAccessRevokedInSession } from '$lib/stores/auth/storage.js';

/** @type {null | (() => void)} */
let userStatusUnsub = null;

export function detachUserStatusListener() {
	if (userStatusUnsub) {
		userStatusUnsub();
		userStatusUnsub = null;
	}
}

/** @param {import('firebase/auth').User} u */
export function attachUserStatusListener(u) {
	detachUserStatusListener();
	const em = u.email;
	if (!em) return;
	const r = doc(db, 'users', em.toLowerCase());
	userStatusUnsub = onSnapshot(
		r,
		(snap) => {
			if (!snap.exists()) return;
			const d = snap.data();
			if (isAccountSuspendedProfile(/** @type {Record<string, unknown>} */ (d))) {
				markAccessRevokedInSession();
				void signOut(auth);
			}
		},
		(e) => {
			console.warn('[auth store] users/{email} status listener', e);
		},
	);
}

/**
 * @param {{ role: string, profile: Record<string, unknown> }} resolved
 * @returns {Promise<boolean>} true = signed out, caller must skip setting store
 */
export async function signOutIfSuspended(resolved) {
	if (resolved.role === SYNTHETIC_SUSPENDED_ROLE) {
		markAccessRevokedInSession();
		await signOut(auth);
		return true;
	}
	return false;
}
