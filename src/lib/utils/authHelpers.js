import { db } from '$lib/firebase.js';
import { resolveUserProfile } from '$lib/auth/profile.js';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
import { attachUserStatusListener, detachUserStatusListener, signOutIfSuspended } from '$lib/stores/auth/lifecycle.js';
import { getIdToken, signOut } from 'firebase/auth';

export async function hydrateFromFirebaseUser(firebaseUser, userState, sessionState, tenantState) {
	const resolved = await resolveUserProfile(db, firebaseUser, false);
	if (await signOutIfSuspended(resolved)) return false;
	sessionState.setRole(resolved.role);
	tenantState.applyResolved(resolved);
	userState.setProfile(resolved.profile);
	workspaceContextStore.hydrateContext(firebaseUser, resolved.role, resolved.profile);
	attachUserStatusListener(firebaseUser);
	return true;
}

export function clearAuthState(userState, sessionState, tenantState, globalFirestoreUnsubs) {
	detachUserStatusListener();
	
	globalFirestoreUnsubs.forEach(unsub => unsub());
	globalFirestoreUnsubs.clear();

	userState.clearUser();
	tenantState.clearTenant();
	sessionState.clearSession();
	workspaceContextStore.clear();
}

export async function handleAuthStateChange(firebaseUser, auth, userState, sessionState, tenantState, globalFirestoreUnsubs) {
	detachUserStatusListener();
	if (!firebaseUser) {
		clearAuthState(userState, sessionState, tenantState, globalFirestoreUnsubs);
		return;
	}

	try {
		await getIdToken(firebaseUser);
	} catch (tokenError) {
		console.error('[Auth] Poisoned session detected. Triggering circuit breaker.', tokenError);
		clearAuthState(userState, sessionState, tenantState, globalFirestoreUnsubs);
		await signOut(auth);
		return;
	}

	if (sessionState.isLoading !== true) sessionState.isLoading = true;
	userState.user = firebaseUser;
	sessionState.isAuthenticated = true;

	try {
		const ok = await hydrateFromFirebaseUser(firebaseUser, userState, sessionState, tenantState);
		if (!ok) {
			if (sessionState.isLoading !== false) sessionState.isLoading = false;
			return;
		}
	} catch (err) {
		console.error('[auth store] init error:', err);
	} finally {
		if (sessionState.isLoading !== false) sessionState.isLoading = false;
	}
}
