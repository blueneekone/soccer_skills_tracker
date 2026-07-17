import { auth, db, registerActiveCellResolver } from '$lib/firebase.js';
import { getIdTokenResult, onAuthStateChanged, signOut, getIdToken } from 'firebase/auth';
import { resolveUserProfile } from '$lib/auth/profile.js';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
import { createAuthGates } from '$lib/stores/auth/authGates.svelte.js';
import { hydrateFromFirebaseUser, handleAuthStateChange } from '$lib/utils/authHelpers.js';
import { createSessionState } from '$lib/stores/auth/sessionState.svelte.js';
import { createTenantState } from '$lib/stores/auth/tenantState.svelte.js';
import { createUserState } from '$lib/stores/auth/userState.svelte.js';

/**
 * Thin auth facade — composes user / tenant / session modules and wires
 * Firebase lifecycle + role-based routing gates only.
 */
export const globalFirestoreUnsubs = new Set();

export function createAuthFacade() {
	const userState = createUserState();
	const tenantState = createTenantState();
	const sessionState = createSessionState();
	const gates = createAuthGates(userState, sessionState, tenantState);

	onAuthStateChanged(auth, async (firebaseUser) => {
		await handleAuthStateChange(firebaseUser, auth, userState, sessionState, tenantState, globalFirestoreUnsubs);
	});

	registerActiveCellResolver(() => tenantState.cellId);

	return {
		get user() { return userState.user; },
		get userProfile() { return userState.userProfile; },
		get role() { return sessionState.role; },
		get tenantId() { return tenantState.tenantId; },
		get currentTenantId() { return tenantState.currentTenantId; },
		get orgId() { return tenantState.orgId; },
		get cellId() { return tenantState.cellId; },
		get isCoach() { return sessionState.isCoach; },
		get isAdmin() { return sessionState.isAdmin; },
		get isDirector() { return sessionState.isDirector; },
		get isPlayer() { return sessionState.isPlayer; },
		get isParent() { return sessionState.isParent; },
		get isTutor() { return sessionState.isTutor; },
		get isRecruiter() { return sessionState.isRecruiter; },
		get isRegistrar() { return sessionState.isRegistrar; },
		get phoneNumber() { return userState.phoneNumber; },
		get phoneVerified() { return userState.phoneVerified; },
		get ageBand() { return userState.ageBand; },
		get isTeenRestricted() { return userState.isTeenRestricted; },
		get isAdult() { return userState.isAdult; },
		get isCleared() { return gates.isCleared; },
		get needsOnboarding() { return gates.needsOnboarding; },
		get requiresConsent() { return gates.requiresConsent; },
		get requiresEmailConsent() { return gates.requiresEmailConsent; },
		get isConsented() { return gates.isConsented; },
		get isAuthenticated() { return sessionState.isAuthenticated; },
		get isProfileComplete() { return userState.isProfileComplete; },
		get isLoading() { return sessionState.isLoading; },
		setProfile: userState.setProfile,
		async refreshClaims() {
			if (!auth.currentUser) return;
			try {
				const tokenResult = await getIdTokenResult(auth.currentUser, true);
				const newRole = String(tokenResult.claims.role || '');
				if (newRole) sessionState.setRole(newRole);
				tenantState.applyClaims(tokenResult);
			} catch (err) {
				console.warn('[auth store] refreshClaims error:', err);
			}
		},
		async refresh(opts = {}) {
			if (!auth.currentUser) return;
			const { silent = false } = opts;
			if (!silent && sessionState.isLoading !== true) sessionState.isLoading = true;
			try {
				const ok = await hydrateFromFirebaseUser(auth.currentUser, userState, sessionState, tenantState);
				if (!ok) return;
				sessionState.isAuthenticated = true;
			} catch (err) {
				console.error('[auth store] refresh error:', err);
			} finally {
				if (!silent && sessionState.isLoading !== false) sessionState.isLoading = false;
			}
		},
	};
}

export const authStore = createAuthFacade();
