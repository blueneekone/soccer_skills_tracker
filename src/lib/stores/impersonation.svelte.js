/**
 * Sprint 2.6.1 — Impersonation Session (claims-driven).
 *
 * CRITICAL SECURITY NOTE
 * ──────────────────────────────────────────────────────────────────────────
 * The previous implementation persisted impersonation metadata to
 * sessionStorage. Firebase Auth, however, persists its session to IndexedDB,
 * which is shared across every tab of the same origin. That mismatch created
 * a cross-tab desync vulnerability: if a super_admin opened a second tab
 * while impersonating, the second tab would load the target user's Firebase
 * session but NOT the sessionStorage flag, producing a "silent impersonation"
 * surface with no banner.
 *
 * The only trustworthy signal is the Firebase ID token's custom claims
 * (set via `admin.auth().createCustomToken(uid, additionalClaims)` in
 * `impersonateUserFn`). We derive `active` from
 * `getIdTokenResult().claims.impersonation === true` and keep it in sync via
 * `onIdTokenChanged`. This renders the banner correctly in every tab, every
 * reload, every restored session — regardless of sessionStorage state.
 */

import { browser } from '$app/environment';
import { auth } from '$lib/firebase.js';
import { onIdTokenChanged } from 'firebase/auth';
import { handleSignOut } from '$lib/auth/signOutFlow.js';

/**
 * @typedef {{
 *   active: boolean,
 *   originalAdminEmail: string,
 *   targetUid: string,
 *   targetEmail: string,
 *   targetRole: string,
 *   startedAt: number,
 *   resolved: boolean,
 * }} ImpersonationSession
 */

/** @returns {ImpersonationSession} */
function emptySession() {
	return {
		active: false,
		originalAdminEmail: '',
		targetUid: '',
		targetEmail: '',
		targetRole: '',
		startedAt: 0,
		resolved: false
	};
}

function createImpersonationStore() {
	let session = $state(emptySession());
	/** @type {(() => void) | null} */
	let unsubTokenChange = null;
	let initialized = false;

	/** @param {unknown} v */
	function asString(v) {
		return typeof v === 'string' ? v : '';
	}

	/** @param {unknown} v */
	function asNumber(v) {
		return typeof v === 'number' && Number.isFinite(v) ? v : 0;
	}

	/**
	 * Read the authoritative impersonation claims off the current ID token.
	 * @param {boolean} [forceRefresh] When true, forces a server round-trip.
	 */
	async function resolveFromIdToken(forceRefresh = false) {
		const u = auth?.currentUser;
		if (!u) {
			session = { ...emptySession(), resolved: true };
			return;
		}
		try {
			const res = await u.getIdTokenResult(forceRefresh);
			const claims = /** @type {Record<string, unknown>} */ (res?.claims || {});
			if (claims.impersonation === true) {
				session = {
					active: true,
					originalAdminEmail:
						asString(claims.impersonatedBy) || '',
					targetUid: u.uid || '',
					targetEmail:
						asString(claims.impersonatedEmail) || (u.email || ''),
					targetRole: asString(claims.impersonatedRole) || '',
					startedAt: asNumber(claims.impersonationStartedAt),
					resolved: true
				};
			} else {
				session = { ...emptySession(), resolved: true };
			}
		} catch (err) {
			console.warn('[impersonation] id-token resolution failed', err);
			session = { ...emptySession(), resolved: true };
		}
	}

	/**
	 * Wire up the cross-tab token-change listener. Safe to call multiple times;
	 * the subscription is memoized.
	 */
	function init() {
		if (!browser || initialized) return;
		initialized = true;
		// onIdTokenChanged fires on: sign-in, sign-out, token refresh, AND when
		// IndexedDB-persisted auth state changes in another tab. This is exactly
		// the signal we need to kill the cross-tab desync vulnerability.
		unsubTokenChange = onIdTokenChanged(auth, () => {
			void resolveFromIdToken(false);
		});
		void resolveFromIdToken(false);
	}

	function teardown() {
		if (unsubTokenChange) {
			try {
				unsubTokenChange();
			} catch {
				/* noop */
			}
			unsubTokenChange = null;
		}
		initialized = false;
		session = emptySession();
	}

	/**
	 * Called by `loginAs` immediately after `signInWithCustomToken` so the
	 * banner picks up the new impersonation claims without waiting for the
	 * next silent refresh. Forces a server round-trip to guarantee freshness.
	 */
	async function touch() {
		await resolveFromIdToken(true);
	}

	/**
	 * Hard exit: public route + sign out + clear client state (see signOutFlow).
	 * onIdTokenChanged then resets session when `currentUser === null`.
	 */
	async function exit() {
		try {
			await handleSignOut();
		} catch (err) {
			console.error('[impersonation] sign out', err);
		}
		session = emptySession();
	}

	return {
		get active() {
			return session.active;
		},
		get resolved() {
			return session.resolved;
		},
		get originalAdminEmail() {
			return session.originalAdminEmail;
		},
		get targetUid() {
			return session.targetUid;
		},
		get targetEmail() {
			return session.targetEmail;
		},
		get targetRole() {
			return session.targetRole;
		},
		get startedAt() {
			return session.startedAt;
		},
		init,
		teardown,
		touch,
		exit
	};
}

export const impersonationStore = createImpersonationStore();
