import { auth, db } from '$lib/firebase.js';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import {
	doc,
	getDoc,
	setDoc,
	collection,
	getDocs,
	query,
	where
} from 'firebase/firestore';

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

	function computeIsProfileComplete(profile) {
		if (!profile) return false;
		if (profile.role === 'super_admin' || profile.role === 'director') return true;
		if (profile.role === 'coach' && profile.teamId) return true;
		if (profile.role === 'parent' && profile.teamId) return true;
		if (profile.playerName && profile.teamId) return true;
		return false;
	}

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
			const tokenResult = await getIdTokenResult(firebaseUser, true);
			role = tokenResult.claims.role || 'player';

			const userRef = doc(db, 'users', firebaseUser.email.toLowerCase());
			const userSnap = await getDoc(userRef);
			const baseProfile = userSnap.exists() ? userSnap.data() : null;

			const fallbackName =
				(baseProfile && (baseProfile.playerName || baseProfile.name || baseProfile.player)) ||
				firebaseUser.email.split('@')[0];

			if (role === 'super_admin' || role === 'director') {
				setProfile({
					...(baseProfile || {}),
					playerName: fallbackName,
					teamId: 'admin',
					role
				});
			} else if (userSnap.exists()) {
				setProfile({ ...baseProfile, role, playerName: fallbackName });
			} else {
				// Check player_lookup invite
				const inviteRef = doc(db, 'player_lookup', firebaseUser.email.toLowerCase());
				const inviteSnap = await getDoc(inviteRef);
				if (inviteSnap.exists()) {
					const data = inviteSnap.data();
					const newProfile = {
						teamId: data.teamId,
						clubId: data.clubId,
						playerName: data.playerName,
						joinedAt: new Date(),
						role
					};
					await setDoc(userRef, newProfile);
					setProfile(newProfile);
				} else {
					// New user with no profile yet
					setProfile({ role, playerName: fallbackName });
				}
			}
		} catch (err) {
			console.error('[auth store] init error:', err);
		} finally {
			isLoading = false;
		}
	});

	return {
		get user() { return user; },
		get userProfile() { return userProfile; },
		get role() { return role; },
		get isAuthenticated() { return isAuthenticated; },
		get isProfileComplete() { return isProfileComplete; },
		get isLoading() { return isLoading; },
		setProfile,
		/** Force refresh profile from Firestore (e.g. after setup completes) */
		async refresh() {
			if (!auth.currentUser) return;
			isLoading = true;
			try {
				const tokenResult = await getIdTokenResult(auth.currentUser, true);
				role = tokenResult.claims.role || 'player';
				const userRef = doc(db, 'users', auth.currentUser.email.toLowerCase());
				const userSnap = await getDoc(userRef);
				if (userSnap.exists()) {
					const data = userSnap.data();
					setProfile({ ...data, role });
				}
			} catch (err) {
				console.error('[auth store] refresh error:', err);
			} finally {
				isLoading = false;
			}
		}
	};
}

export const authStore = createAuthStore();
