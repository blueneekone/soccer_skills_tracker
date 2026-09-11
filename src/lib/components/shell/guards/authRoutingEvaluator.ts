import { isDataCollectionRoute, isRouteAllowedForRole } from '$lib/auth/route-policies.js';
import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';

export interface AuthRoutingContext {
	currentPath: string;
	isAuthenticated: boolean;
	role?: string | null;
	isCleared?: boolean;
	isProfileComplete?: boolean;
	isMinor?: boolean;
	vpcStatus?: string;
	isConsented?: boolean;
	medicalSignatureVerified?: boolean;
	liabilityWaiverVerified?: boolean;
	userProfile?: Record<string, unknown> | null;
}

const VALID_ROLES = [
	'admin',
	'global_admin',
	'super_admin',
	'commissioner',
	'director',
	'coach',
	'parent',
	'player',
	'recruiter',
	'fan',
	'tutor',
	'registrar'
];

/**
 * Checks if the current route is public or uses a match token.
 */
export function shouldBypassAuth(currentPath: string, searchParams?: string): boolean {
	if (currentPath.startsWith('/public/match/')) return true;
	if (searchParams && searchParams.includes('matchToken')) return true;
	return false;
}

/**
 * Checks role validity and clearance gates for authenticated users.
 */
function checkRoleAndClearance(context: AuthRoutingContext): string | null {
	const { currentPath, role, isCleared } = context;

	if (!role || !VALID_ROLES.includes(role)) {
		return currentPath === '/onboarding/role-select' ? null : '/onboarding/role-select';
	}

	const isAdmin = role === 'admin' || role === 'super_admin' || role === 'global_admin';
	if (isCleared === false && !isAdmin) {
		const isSandbox = role === 'coach' && currentPath.startsWith('/coach/sandbox');
		if (!currentPath.startsWith('/onboarding/clearance') && !isSandbox) {
			return `/onboarding/clearance/${role}`;
		}
	}

	return null;
}

/**
 * Checks onboarding and profile completion status for authenticated users.
 */
function checkOnboardingCompletion(context: AuthRoutingContext): string | null {
	const { currentPath, role, isProfileComplete, userProfile } = context;
	const isAdmin = role === 'admin' || role === 'super_admin' || role === 'global_admin';

	if (currentPath === '/onboarding' || currentPath === '/onboarding/') {
		return applyLoginWaterfall(role ?? '', userProfile);
	}

	if (!isProfileComplete && !isAdmin && !currentPath.startsWith('/onboarding')) {
		return '/onboarding';
	}

	return null;
}

/**
 * Evaluates compliance (COPPA/VPC/HIPAA) and role boundaries for an authenticated user.
 */
function checkComplianceAndRole(context: AuthRoutingContext): string | null {
	const { currentPath, role, isMinor, vpcStatus, isConsented, userProfile } = context;

	if (role === 'player') {
		if (isMinor && vpcStatus !== 'verified' && vpcStatus !== 'not_required') {
			if (!currentPath.startsWith('/vpc-pending')) return '/vpc-pending';
		}
		if (!isConsented && isDataCollectionRoute(currentPath)) {
			if (!currentPath.startsWith('/vpc-pending') && !currentPath.startsWith('/parent/dashboard/vpc')) {
				return '/parent/dashboard/vpc';
			}
		}
		if (userProfile && !userProfile.medicalSignatureVerified && isDataCollectionRoute(currentPath)) {
			if (!currentPath.startsWith('/player/intake')) return '/player/intake';
		}
		if (userProfile && userProfile.medicalSignatureVerified && !userProfile.liabilityWaiverVerified && isDataCollectionRoute(currentPath)) {
			if (!currentPath.startsWith('/player/waivers')) return '/player/waivers';
		}
	}

	if (role && !isRouteAllowedForRole(currentPath, role)) {
		return applyLoginWaterfall(role, userProfile);
	}

	return null;
}

/**
 * Top-level pure evaluation function for route redirection.
 * Returns target redirect path or null if allowed.
 */
export function evaluateAuthRedirect(context: AuthRoutingContext): string | null {
	if (!context.isAuthenticated) {
		return context.currentPath === '/login' || context.currentPath === '/register' ? null : '/login';
	}

	const roleResult = checkRoleAndClearance(context);
	if (roleResult) return roleResult;

	const onboardingResult = checkOnboardingCompletion(context);
	if (onboardingResult) return onboardingResult;

	return checkComplianceAndRole(context);
}
