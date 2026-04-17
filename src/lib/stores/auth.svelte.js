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
				// Check coach_lookup first (coaches are never in player_lookup)
				const coachRef = doc(db, 'coach_lookup', firebaseUser.email.toLowerCase());
				const coachSnap = await getDoc(coachRef);
				if (coachSnap.exists()) {
					const data = coachSnap.data();
					const coachRole = data.role || 'coach';
					const newProfile = {
						teamId: data.teamId,
						...(data.clubId ? { clubId: data.clubId } : {}),
						role: coachRole,
						playerName: data.playerName || firebaseUser.displayName || fallbackName,
						joinedAt: new Date()
					};
					await setDoc(userRef, newProfile);
					// syncUserClaims fires async; force-refresh token so role is correct
					const refreshed = await getIdTokenResult(firebaseUser, true);
					role = refreshed.claims.role || coachRole;
					setProfile({ ...newProfile, role });
				} else {
					// Check player_lookup invite
					const inviteRef = doc(db, 'player_lookup', firebaseUser.email.toLowerCase());
					const inviteSnap = await getDoc(inviteRef);
					if (inviteSnap.exists()) {
						const data = inviteSnap.data();
					// player_lookup only stores {teamId, playerName}; clubId is absent.
					// Omit it rather than writing undefined (Firestore rejects undefined values).
					const newProfile = {
						teamId: data.teamId,
						playerName: data.playerName,
						joinedAt: new Date(),
						...(data.clubId != null ? { clubId: data.clubId } : {})
					};
					await setDoc(userRef, newProfile);
						setProfile({ ...newProfile, role });
					} else {
						// New user with no profile yet — send to setup
						setProfile({ role, playerName: fallbackName });
					}
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
