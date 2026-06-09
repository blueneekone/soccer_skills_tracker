/** Pure role / gate derivations — testable without Firebase or Svelte runes. */

export type RoleFlags = {
	isCoach: boolean;
	isAdmin: boolean;
	isDirector: boolean;
	isPlayer: boolean;
	isParent: boolean;
	isTutor: boolean;
	isRecruiter: boolean;
	isRegistrar: boolean;
};

/** UI permission gates — use canAccess() as the single client-side check. */
export type AccessGate =
	| 'admin'
	| 'director'
	| 'coach'
	| 'player'
	| 'parent'
	| 'registrar'
	| 'recruiter'
	| 'tutor';

export function deriveRoleFlags(role: string): RoleFlags {
	return {
		isCoach: role === 'coach',
		isAdmin: role === 'global_admin' || role === 'super_admin',
		isDirector: role === 'director',
		isPlayer: role === 'player',
		isParent: role === 'parent',
		isTutor: role === 'tutor',
		isRecruiter: role === 'recruiter',
		isRegistrar: role === 'registrar',
	};
}

/**
 * Sprint 1.3 — single source of truth for UI-level permission checks.
 * Infrastructure enforcement lives in Firestore rules + JWT claims.
 */
export function canAccess(role: string, gate: AccessGate): boolean {
	const flags = deriveRoleFlags(role);
	switch (gate) {
		case 'admin':
			return flags.isAdmin;
		case 'director':
			return flags.isDirector || flags.isAdmin;
		case 'coach':
			return flags.isCoach || flags.isDirector || flags.isAdmin;
		case 'player':
			return flags.isPlayer;
		case 'parent':
			return flags.isParent;
		case 'registrar':
			return flags.isRegistrar || flags.isAdmin;
		case 'recruiter':
			return flags.isRecruiter;
		case 'tutor':
			return flags.isTutor;
		default:
			return false;
	}
}

export function deriveNeedsOnboarding(input: {
	isAuthenticated: boolean;
	isLoading: boolean;
	tenantId: string;
	role: string;
}): boolean {
	const flags = deriveRoleFlags(input.role);
	return (
		input.isAuthenticated &&
		!input.isLoading &&
		!input.tenantId &&
		!flags.isAdmin &&
		!flags.isDirector
	);
}

export function deriveRequiresConsent(input: {
	isAuthenticated: boolean;
	isLoading: boolean;
	role: string;
	userProfile: Record<string, unknown> | null;
}): boolean {
	return (
		input.isAuthenticated &&
		!input.isLoading &&
		input.role === 'player' &&
		input.userProfile !== null &&
		input.userProfile.isMinor === true &&
		input.userProfile.coppaStatus !== 'granted'
	);
}

/** Parent-provisioned or household-linked minors use in-app VPC — not email consent. */
export function deriveUsesHouseholdVpcPath(
	userProfile: Record<string, unknown> | null,
): boolean {
	if (!userProfile) return false;
	if (userProfile.parentProvisioned === true) return true;
	const householdId = userProfile.householdId;
	return typeof householdId === 'string' && householdId.trim() !== '';
}

/**
 * LAUNCH-VPC-UX — email ConsentOverlay only for self-signup minors without a household.
 * Household minors block on /vpc-pending until parentGrantVpcConsent completes.
 */
export function deriveRequiresEmailConsent(input: {
	isAuthenticated: boolean;
	isLoading: boolean;
	role: string;
	userProfile: Record<string, unknown> | null;
}): boolean {
	if (!deriveRequiresConsent(input)) return false;
	return !deriveUsesHouseholdVpcPath(input.userProfile);
}

/**
 * Sprint 2.1 — unified COPPA + VPC consent gate for minor players.
 * Non-players and non-minors always pass. Minors require granted COPPA
 * and verified (or not_required) VPC status.
 */
export function deriveIsConsented(input: {
	isAuthenticated: boolean;
	isLoading: boolean;
	role: string;
	userProfile: Record<string, unknown> | null;
}): boolean {
	if (!input.isAuthenticated || input.isLoading || !input.userProfile) return false;
	if (input.role !== 'player') return true;
	if (input.userProfile.isMinor !== true) return true;
	const coppaOk = input.userProfile.coppaStatus === 'granted';
	const vpcOk =
		input.userProfile.vpcStatus === 'verified' ||
		input.userProfile.vpcStatus === 'not_required';
	return coppaOk && vpcOk;
}

export function deriveIsCleared(
	role: string,
	userProfile: Record<string, unknown> | null | undefined,
): boolean {
	if (role !== 'coach' && role !== 'recruiter') return true;
	const cl = userProfile?.clearance;
	if (!cl || typeof cl !== 'object') return false;
	const status = (cl as Record<string, unknown>).status;
	if (status !== 'cleared') return false;
	const exp = (cl as Record<string, unknown>).expiresAt;
	if (!exp) return true;
	try {
		const expMs =
			typeof (exp as Record<string, unknown>).seconds === 'number'
				? Number((exp as Record<string, unknown>).seconds) * 1000
				: Number(exp);
		return Number.isNaN(expMs) || expMs > Date.now();
	} catch {
		return false;
	}
}

