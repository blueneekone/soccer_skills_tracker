import { auth, db } from '$lib/firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { resolveUserProfile, isProfileComplete as computeIsProfileComplete } from '$lib/auth/profile.js';
import { isAccountSuspendedProfile, SYNTHETIC_SUSPENDED_ROLE } from '$lib/auth/roles.js';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

/**
 * Defensive `sessionStorage.getItem` (private mode / SSR / denied).
 * @param {string} key
 * @returns {string | null}
 */
export function getSessionItemSafe(key) {
	try {
		if (typeof sessionStorage === 'undefined' || !sessionStorage) return null;
		return sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Reactive auth state (Svelte 5 class-based runes pattern)
// ---------------------------------------------------------------------------
function createAuthStore() {
	let user = $state(null);
	let userProfile = $state(null);
	let role = $state('guest');
	let isAuthenticated = $state(false);
	let isProfileComplete = $state(false);
	let isLoading = $state(true);

	function setProfile(profile) {
		userProfile = profile;
		isProfileComplete = computeIsProfileComplete(profile);
	}

	const ACCESS_REVOKED_KEY = 'sstrack_access_revoked';

	/** @type {null | (() => void)} */
	let userStatusUnsub = null;

	/** @param {import('firebase/auth').User} u */
	function attachUserStatusListener(u) {
		if (userStatusUnsub) {
			userStatusUnsub();
			userStatusUnsub = null;
		}
		const em = u.email;
		if (!em) return;
		const r = doc(db, 'users', em.toLowerCase());
		userStatusUnsub = onSnapshot(
			r,
			(snap) => {
				if (!snap.exists()) return;
				const d = snap.data();
				if (isAccountSuspendedProfile(/** @type {Record<string, unknown>} */ (d))) {
					try {
						if (typeof sessionStorage !== 'undefined') {
							sessionStorage.setItem(ACCESS_REVOKED_KEY, '1');
						}
					} catch {
						/* ignore */
					}
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
	async function signOutIfSuspended(resolved) {
		if (resolved.role === SYNTHETIC_SUSPENDED_ROLE) {
			try {
				if (typeof sessionStorage !== 'undefined') {
					sessionStorage.setItem(ACCESS_REVOKED_KEY, '1');
				}
			} catch {
				/* ignore */
			}
			await signOut(auth);
			return true;
		}
		return false;
	}

	// Single source: Firebase `onAuthStateChanged` (fires on cache clear → null, token refresh, sign-in).
	onAuthStateChanged(auth, async (firebaseUser) => {
		if (userStatusUnsub) {
			userStatusUnsub();
			userStatusUnsub = null;
		}
		if (!firebaseUser) {
			user = null;
			userProfile = null;
			role = 'guest';
			isAuthenticated = false;
			isProfileComplete = false;
			isLoading = false;
			workspaceContextStore.clear();
			return;
		}

		// Do not let protected UI render until Firestore profile + role are resolved.
		isLoading = true;
		user = firebaseUser;
		isAuthenticated = true;

		try {
			const resolved = await resolveUserProfile(db, firebaseUser, true);
			if (await signOutIfSuspended(resolved)) {
				isLoading = false;
				return;
			}
			role = resolved.role;
			setProfile(resolved.profile);
			workspaceContextStore.hydrateFromUserProfileIfEmpty(resolved.profile, resolved.role);
			attachUserStatusListener(firebaseUser);
		} catch (err) {
			console.error('[auth store] init error:', err);
		} finally {
			isLoading = false;
		}
	});

	return {
		get user() {
			return user;
		},
		get userProfile() {
			return userProfile;
		},
		get role() {
			return role;
		},
		get isAuthenticated() {
			return isAuthenticated;
		},
		get isProfileComplete() {
			return isProfileComplete;
		},
		get isLoading() {
			return isLoading;
		},
		setProfile,
		/**
		 * Re-resolve profile from Firestore + token (e.g. after setup or settings save).
		 * @param {{ silent?: boolean }} [opts] Pass `silent: true` to avoid full-app splash (see +layout).
		 */
		async refresh(opts = {}) {
			if (!auth.currentUser) return;
			const { silent = false } = opts;
			if (!silent) isLoading = true;
			try {
				const resolved = await resolveUserProfile(db, auth.currentUser, true);
				if (await signOutIfSuspended(resolved)) {
					return;
				}
				role = resolved.role;
				setProfile(resolved.profile);
				workspaceContextStore.hydrateFromUserProfileIfEmpty(resolved.profile, resolved.role);
			} catch (err) {
				console.error('[auth store] refresh error:', err);
			} finally {
				if (!silent) isLoading = false;
			}
		}
	};
}

export const authStore = createAuthStore();
