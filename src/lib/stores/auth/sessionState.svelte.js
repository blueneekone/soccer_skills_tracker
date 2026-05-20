import { deriveRoleFlags } from '$lib/stores/auth/roleDerivations.js';

/** Session + role routing state. */
export function createSessionState() {
	let role = $state('guest');
	let isAuthenticated = $state(false);
	let isLoading = $state(true);

	function clearSession() {
		role = 'guest';
		isAuthenticated = false;
		isLoading = false;
	}

	function setRole(nextRole) {
		if (role !== nextRole) role = nextRole;
	}

	const roleFlags = $derived(deriveRoleFlags(role));

	return {
		get role() {
			return role;
		},
		setRole,
		get isAuthenticated() {
			return isAuthenticated;
		},
		set isAuthenticated(v) {
			isAuthenticated = v;
		},
		get isLoading() {
			return isLoading;
		},
		set isLoading(v) {
			isLoading = v;
		},
		get isCoach() {
			return roleFlags.isCoach;
		},
		get isAdmin() {
			return roleFlags.isAdmin;
		},
		get isDirector() {
			return roleFlags.isDirector;
		},
		get isPlayer() {
			return roleFlags.isPlayer;
		},
		get isParent() {
			return roleFlags.isParent;
		},
		get isTutor() {
			return roleFlags.isTutor;
		},
		get isRecruiter() {
			return roleFlags.isRecruiter;
		},
		get isRegistrar() {
			return roleFlags.isRegistrar;
		},
		clearSession,
	};
}
