import { auth, db, registerActiveCellResolver } from '$lib/firebase.js';
import { getIdTokenResult, onAuthStateChanged, signOut } from 'firebase/auth';
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
// Reactive auth state: no $effect in this file (avoids effect_update_depth_exceeded
// and effect_orphan). `onAuthStateChanged` and `onSnapshot` only mutate $state
// in their callbacks, synchronously; profile hydration to workspace is a no-op if values unchanged.
// ---------------------------------------------------------------------------
function createAuthStore() {
	let user = $state(null);
	let userProfile = $state(null);
	let role = $state('guest');
	/**
	 * Canonical multi-tenant identifier sourced from JWT custom claims
	 * (via `resolveUserProfile` → `getIdTokenResult`).
	 * Equals the `clubId` / `tenantId` custom claim written by the
	 * `syncUserClaims` Cloud Function trigger.
	 * Empty string '' = platform admin, unjoined user, or not yet resolved.
	 */
	let tenantId = $state('');
	/**
	 * Umbrella organisation identifier, optional.
	 * Present when a club belongs to a parent Rec-Center / league org.
	 * Sourced from JWT claims (`orgId`) written by `syncUserClaims`.
	 * Empty string '' when the user's club is a standalone tenant.
	 */
	let orgId = $state('');
	/**
	 * Phase 1, Epic 1 — Cell-Based Routing.
	 *
	 * Firestore Multi-Database cell ID this tenant is routed to.
	 * Stamped into the JWT by `syncUserClaims` after reading
	 * `organizations/{tenantId}.cellId`.  Defaults to the reserved
	 * '(default)' string for tenants on the shared cell — never empty.
	 *
	 * Consumed by `getActiveDb()` in `$lib/firebase.js` (Session C) to
	 * select the right Firestore instance for every cell-aware read or
	 * write.  Components never read this directly; the cell-aware
	 * accessor reads it on their behalf.
	 */
	let cellId = $state('(default)');
	let isAuthenticated = $state(false);
	let isProfileComplete = $state(false);
	let isLoading = $state(true);

	// ── Claims-aware derived booleans ────────────────────────────────────────
	// These are computed from the reactive `role` and `tenantId` $state vars,
	// so they update instantly whenever the auth store resolves a new profile.
	// Components should consume these directly rather than string-comparing role.

	/** True when the user's verified JWT role is 'coach'. */
	const isCoach = $derived(role === 'coach');

	/**
	 * True when the user holds PLATFORM-LEVEL authority only.
	 * Matches: global_admin, super_admin.
	 *
	 * ⚠  Does NOT include 'director'.  Directors are club-level actors — use
	 *    `isDirector` for org-management gates.  This strict separation enforces
	 *    the Vanguard role hierarchy:
	 *
	 *      Platform Admin  (isAdmin)    — cross-tenant SaaS management
	 *      Club Director   (isDirector) — single-tenant org management
	 *      Team Coach      (isCoach)    — single-team coaching access
	 *      Athlete         (isPlayer)   — individual performance view
	 *
	 *    UI access pattern for director dashboards:
	 *      isAuthorized = authStore.isDirector || authStore.isAdmin
	 *                     ↑ primary audience     ↑ God Mode bypass
	 */
	const isAdmin = $derived(role === 'global_admin' || role === 'super_admin');

	/**
	 * True when the role is 'director' — the Club/Organisation owner.
	 * Directors manage a single tenantId; they are NOT platform admins.
	 */
	const isDirector = $derived(role === 'director');

	/** True when the role is 'player'. */
	const isPlayer = $derived(role === 'player');

	/** True when the role is 'parent'. */
	const isParent = $derived(role === 'parent');

	/**
	 * True when the user is a Tutor — has read-only access to academic_records
	 * for their assigned students. Scoped to a single tenantId.
	 */
	const isTutor = $derived(role === 'tutor');

	/**
	 * True when the user holds a Recruiter role.
	 * Recruiters get the talent-feed view but NO raw PII until a Digital Handshake
	 * is accepted by the player's Director/Parent.
	 */
	const isRecruiter = $derived(role === 'recruiter');

	/**
	 * True when the user holds a Registrar role.
	 * Registrars are club-scoped staff who manage compliance and rosters but
	 * have no team assignment.
	 */
	const isRegistrar = $derived(role === 'registrar');

	/**
	 * Epic 14: Vanguard Clearance Protocol.
	 *
	 * True when the user has passed their background-check vetting
	 * (clearance.status === 'cleared' in Firestore, mirrored as isCleared JWT claim).
	 *
	 * Non-coach / non-recruiter roles are always considered cleared for UI purposes
	 * — the enforcement boundary is the JWT claim checked by Firestore rules.
	 *
	 * Components should use this to:
	 *   1. Show the locked state overlay for coaches who are not yet cleared.
	 *   2. Hide sensitive player data panels until clearance is confirmed.
	 *
	 * ZERO-TRUST: The value is derived from the Firestore `clearance` sub-object
	 * on the user profile (hydrated by resolveUserProfile). The JWT `isCleared`
	 * claim is the ultimate enforcement gate on the server side.
	 */
	const isCleared = $derived.by(() => {
		if (role !== 'coach' && role !== 'recruiter') return true;
		const cl = /** @type {Record<string, unknown>} */ (userProfile)?.clearance;
		if (!cl || typeof cl !== 'object') return false;
		const status = /** @type {Record<string, unknown>} */ (cl).status;
		if (status !== 'cleared') return false;
		const exp = /** @type {Record<string, unknown>} */ (cl).expiresAt;
		if (!exp) return true;
		try {
			const expMs = typeof (/** @type {Record<string, unknown>} */ (exp)).seconds === 'number'
				? Number((/** @type {Record<string, unknown>} */ (exp)).seconds) * 1000
				: Number(exp);
			return isNaN(expMs) || expMs > Date.now();
		} catch {
			return false;
		}
	});

	/**
	 * Security guard: true when the user is fully authenticated but has no
	 * tenantId claim — i.e. they have not yet joined an organisation.
	 *
	 * Platform admins (global_admin / super_admin) are intentionally cross-
	 * tenant and must be excluded.
	 *
	 * Consumer pattern (e.g. in +layout.svelte):
	 *   {#if authStore.needsOnboarding}
	 *     <Navigate to="/enter-invite" />
	 *   {/if}
	 */
	const needsOnboarding = $derived(
		isAuthenticated &&
			!isLoading &&
			!tenantId &&
			!isAdmin && // platform admins are intentionally cross-tenant
			!isDirector, // directors always have a tenantId; guard against edge cases
	);

	/**
	 * COPPA 2026 consent gate.
	 * Profile-based (not JWT): reads isMinor and coppaStatus from the Firestore
	 * user document hydrated into userProfile by resolveUserProfile().
	 * coppaStatus is ONLY written by the verifyParentalConsent Cloud Function.
	 */
	const requiresConsent = $derived(
		isAuthenticated &&
			!isLoading &&
			role === 'player' &&
			userProfile !== null &&
			/** @type {Record<string, unknown>} */ (userProfile)?.isMinor === true &&
			/** @type {Record<string, unknown>} */ (userProfile)?.coppaStatus !== 'granted',
	);

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
		tenantId = '';
		orgId = '';
		cellId = '(default)';
		isAuthenticated = false;
		isProfileComplete = false;
		if (isLoading !== false) isLoading = false;
		workspaceContextStore.clear();
			return;
		}

		// Do not let protected UI render until Firestore profile + role are resolved.
		if (isLoading !== true) isLoading = true;
		user = firebaseUser;
		isAuthenticated = true;

		try {
			const resolved = await resolveUserProfile(db, firebaseUser, true);
			if (await signOutIfSuspended(resolved)) {
				if (isLoading !== false) isLoading = false;
				return;
			}
			if (role !== resolved.role) role = resolved.role;
			// `resolved.tenantId` is authoritative (JWT claims via syncUserClaims trigger).
			// Fall back to Firestore profile.clubId for users provisioned before the trigger.
			const resolvedTenantId = resolved.tenantId ?? String(resolved.profile?.clubId ?? '');
			if (tenantId !== resolvedTenantId) tenantId = resolvedTenantId;
			// Org-topology: derive orgId from profile (optional; absent for standalone clubs).
			const resolvedOrgId = String(resolved.profile?.orgId ?? '');
			if (orgId !== resolvedOrgId) orgId = resolvedOrgId;
			// Cell-Based Routing — `resolved.cellId` is always a non-empty
			// string ('(default)' for tenants on the shared cell).  Drives
			// `getActiveDb()` in $lib/firebase.js.
			const resolvedCellId = resolved.cellId || '(default)';
			if (cellId !== resolvedCellId) cellId = resolvedCellId;
			setProfile(resolved.profile);
			workspaceContextStore.hydrateContext(firebaseUser, resolved.role, resolved.profile);
			attachUserStatusListener(firebaseUser);
		} catch (err) {
			console.error('[auth store] init error:', err);
		} finally {
			if (isLoading !== false) isLoading = false;
		}
	});

	// Phase 1, Epic 1 — Cell-Based Routing.
	//
	// Hand the firebase.js singleton a closure that reads the current
	// reactive `cellId` value.  `getActiveDb()` invokes this on every
	// call so the returned Firestore instance always reflects the
	// freshest JWT claim — including after `provisionTenantCell`
	// reassigns the tenant and `refreshClaims()` picks up the change.
	registerActiveCellResolver(() => cellId);

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
		/**
		 * Canonical tenant identifier sourced from JWT custom claims.
		 * Scope ALL Firestore queries with: `where('clubId', '==', authStore.tenantId)`.
		 * Empty string '' means the user has no org — check `needsOnboarding`.
		 */
		get tenantId() {
			return tenantId;
		},
		/** Alias for `tenantId` — matches the `currentTenantId` naming from the directive. */
		get currentTenantId() {
			return tenantId;
		},
		/**
		 * Umbrella organisation identifier (Rec-Center / league).
		 * Optional — empty string '' for standalone clubs not part of a parent org.
		 * Sourced from the `orgId` JWT claim written by `syncUserClaims`.
		 * Use this to scope compliance-vault queries:
		 *   `orgs/{orgId}/compliance_vault/{email}`
		 */
		get orgId() {
			return orgId;
		},
		/**
		 * Phase 1, Epic 1 — Cell-Based Routing.
		 *
		 * Firestore Multi-Database cell ID this tenant is currently
		 * routed to.  ALWAYS a non-empty string — '(default)' indicates
		 * the shared cell.  Components do not read this directly; the
		 * `getActiveDb()` accessor in `$lib/firebase.js` consumes it.
		 *
		 * Exposed here for the Director OS migration UI which renders
		 * the current cell badge.
		 */
		get cellId() {
			return cellId;
		},
		/** Derived from verified JWT role claim. */
		get isCoach() {
			return isCoach;
		},
		/** True for global_admin and super_admin (platform-level) ONLY. Does NOT include director. */
		get isAdmin() {
			return isAdmin;
		},
		/** True for director role (club/tenant owner). Use this for org-management gates. */
		get isDirector() {
			return isDirector;
		},
		/** True for player role. */
		get isPlayer() {
			return isPlayer;
		},
		/** True for parent role. */
		get isParent() {
			return isParent;
		},
		/** True for tutor role. Read-only academic_records access for assigned students. */
		get isTutor() {
			return isTutor;
		},
	/** True for recruiter role. Talent-feed access; PII gated behind Digital Handshake. */
	get isRecruiter() {
		return isRecruiter;
	},
	/** True for registrar role. Club-scoped compliance and roster manager. */
	get isRegistrar() {
		return isRegistrar;
	},
	/**
	 * Epic 14: Clearance Protocol gate.
	 * True when the user has an active cleared background check (or is a role
	 * that is exempt from the clearance requirement, e.g. director, player).
	 * Coaches must be cleared before accessing player data.
	 */
	get isCleared() {
		return isCleared;
	},
	/**
	 * True when authenticated + loading complete + no tenantId claim.
	 * Redirect to invite-code entry screen when this is true.
	 */
	get needsOnboarding() {
		return needsOnboarding;
	},
	/**
	 * COPPA 2026 consent gate.
	 *
	 * True when the authenticated player is a minor and has NOT yet had a
	 * parent/guardian grant consent via the `verifyParentalConsent` Cloud
	 * Function.  When this is true, `ConsentOverlay.svelte` covers the entire
	 * PlayerShell, blocking all interaction until consent is obtained.
	 *
	 * ZERO-TRUST note: coppaStatus is read from the Firestore user profile
	 * (server-written by verifyParentalConsent).  The client can never flip
	 * this field — Firestore Rules enforce it as server-only.
	 *
	 * Checks:
	 *   1. User is authenticated and fully loaded.
	 *   2. Role is 'player' (coaches/directors/parents are exempt).
	 *   3. userProfile.isMinor === true (set by syncUserClaims from DOB).
	 *   4. userProfile.coppaStatus is absent or not 'granted'.
	 *
	 * Exempt roles (never shown the overlay):
	 *   coach, director, admin, parent, registrar, global_admin, super_admin
	 */
	get requiresConsent() {
		return requiresConsent;
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
		 * Lightweight claims refresh — reads the updated JWT and syncs `tenantId`
		 * and `role` into the store WITHOUT a Firestore round-trip.
		 *
		 * When to use:
		 *   Call this immediately after `consumeInviteCode()` returns, so the
		 *   store's reactive state reflects the new claims before any UI redirect.
		 *
		 *   Pattern:
		 *     const result = await consumeInviteCode(code);   // CF sets claims
		 *     await authStore.refreshClaims();                // store picks them up
		 *     // authStore.tenantId / isCoach / needsOnboarding are now correct
		 *
		 * vs. refresh():
		 *   `refresh()` re-reads the full Firestore profile (expensive, for settings
		 *   saves / role changes).  `refreshClaims()` only touches the JWT.
		 */
		async refreshClaims() {
			if (!auth.currentUser) return;
			try {
				// Force-refresh the token so the client picks up any claims written
				// by the `consumeInviteCode` or `syncUserClaims` Cloud Functions.
				const tokenResult = await getIdTokenResult(auth.currentUser, /* forceRefresh */ true);

				const newRole = String(tokenResult.claims.role || '');
				const newTenantId = String(
					tokenResult.claims.tenantId || tokenResult.claims.clubId || '',
				);
				const newOrgId = String(tokenResult.claims.orgId || '');
				// Cell-Based Routing: read fresh cellId; absent → '(default)'.
				const rawCellId =
					typeof tokenResult.claims.cellId === 'string' &&
					tokenResult.claims.cellId.trim().length > 0
						? tokenResult.claims.cellId.trim()
						: '(default)';

				// Only update role if the token carries one — avoids blanking the
				// role while claims are still propagating.
				if (newRole && role !== newRole) role = newRole;
				// tenantId can legitimately become '' (revocation) — always sync it.
				if (tenantId !== newTenantId) tenantId = newTenantId;
				// orgId: sync from JWT; empty string is valid (standalone club).
				if (orgId !== newOrgId) orgId = newOrgId;
				// cellId is always non-empty; if it changed, the next read via
				// getActiveDb() picks up the new Firestore database.
				if (cellId !== rawCellId) cellId = rawCellId;
			} catch (err) {
				console.warn('[auth store] refreshClaims error:', err);
			}
		},
		/**
		 * Re-resolve profile from Firestore + token (e.g. after setup or settings save).
		 * @param {{ silent?: boolean }} [opts] Pass `silent: true` to avoid full-app splash (see +layout).
		 */
		async refresh(opts = {}) {
			if (!auth.currentUser) return;
			const { silent = false } = opts;
			if (!silent && isLoading !== true) isLoading = true;
			try {
				const resolved = await resolveUserProfile(db, auth.currentUser, true);
				if (await signOutIfSuspended(resolved)) {
					return;
				}
				if (role !== resolved.role) role = resolved.role;
				const refreshedTenantId = resolved.tenantId ?? String(resolved.profile?.clubId ?? '');
				if (tenantId !== refreshedTenantId) tenantId = refreshedTenantId;
				const refreshedOrgId = String(resolved.profile?.orgId ?? '');
				if (orgId !== refreshedOrgId) orgId = refreshedOrgId;
				const refreshedCellId = resolved.cellId || '(default)';
				if (cellId !== refreshedCellId) cellId = refreshedCellId;
				setProfile(resolved.profile);
				workspaceContextStore.hydrateContext(auth.currentUser, resolved.role, resolved.profile);
			} catch (err) {
				console.error('[auth store] refresh error:', err);
			} finally {
				if (!silent && isLoading !== false) isLoading = false;
			}
		}
	};
}

export const authStore = createAuthStore();
