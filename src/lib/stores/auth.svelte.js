import { auth, db } from '$lib/firebase.js';
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
			setProfile(resolved.profile);
			workspaceContextStore.hydrateContext(firebaseUser, resolved.role, resolved.profile);
			attachUserStatusListener(firebaseUser);
		} catch (err) {
			console.error('[auth store] init error:', err);
		} finally {
			if (isLoading !== false) isLoading = false;
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

				// Only update role if the token carries one — avoids blanking the
				// role while claims are still propagating.
				if (newRole && role !== newRole) role = newRole;
				// tenantId can legitimately become '' (revocation) — always sync it.
				if (tenantId !== newTenantId) tenantId = newTenantId;
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
