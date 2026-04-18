import { auth, db } from '$lib/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { resolveUserProfile, isProfileComplete as computeIsProfileComplete } from '$lib/auth/profile.js';

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

	// Initialise listener once
	onAuthStateChanged(auth, async (firebaseUser) => {
		if (!firebaseUser) {
			user = null;
			userProfile = null;
			role = 'guest';
			isAuthenticated = false;
			isProfileComplete = false;
			isLoading = false;
			return;
		}

		user = firebaseUser;
		isAuthenticated = true;

		try {
			const resolved = await resolveUserProfile(db, firebaseUser, true);
			role = resolved.role;
			setProfile(resolved.profile);
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
				role = resolved.role;
				setProfile(resolved.profile);
			} catch (err) {
				console.error('[auth store] refresh error:', err);
			} finally {
				if (!silent) isLoading = false;
			}
		}
	};
}

export const authStore = createAuthStore();
