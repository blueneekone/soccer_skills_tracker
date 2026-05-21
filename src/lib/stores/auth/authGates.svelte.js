import {
	deriveIsCleared,
	deriveIsConsented,
	deriveNeedsOnboarding,
	deriveRequiresConsent,
} from '$lib/stores/auth/roleDerivations.js';

/** Derived onboarding / consent / clearance gates from user + session + tenant. */
export function createAuthGates(userState, sessionState, tenantState) {
	const needsOnboarding = $derived(
		deriveNeedsOnboarding({
			isAuthenticated: sessionState.isAuthenticated,
			isLoading: sessionState.isLoading,
			tenantId: tenantState.tenantId,
			role: sessionState.role,
		}),
	);

	const requiresConsent = $derived(
		deriveRequiresConsent({
			isAuthenticated: sessionState.isAuthenticated,
			isLoading: sessionState.isLoading,
			role: sessionState.role,
			userProfile: userState.userProfile,
		}),
	);

	const isConsented = $derived(
		deriveIsConsented({
			isAuthenticated: sessionState.isAuthenticated,
			isLoading: sessionState.isLoading,
			role: sessionState.role,
			userProfile: userState.userProfile,
		}),
	);

	const isCleared = $derived(deriveIsCleared(sessionState.role, userState.userProfile));

	return {
		get needsOnboarding() {
			return needsOnboarding;
		},
		get requiresConsent() {
			return requiresConsent;
		},
		get isConsented() {
			return isConsented;
		},
		get isCleared() {
			return isCleared;
		},
	};
}
