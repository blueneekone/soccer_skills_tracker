/**
 * src/lib/auth/authRouter.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Sprint 1.2 — Vanguard Routing Interceptor
 *
 * Firestore-first role-based router. Reads `users/{uid}` from Firestore,
 * inspects the `role` field, and navigates to the role's canonical entry point.
 *
 * This module is the clean RBAC contract for the login pipeline. It is
 * intentionally independent of JWT claims — Firestore is read directly
 * so the UI is never blocked waiting for a custom-token refresh.
 *
 * Route map
 * ──────────
 *   super_admin / global_admin  → /admin/overview
 *   director                    → /director
 *   coach                       → /coach
 *   registrar                   → /director    (club-scoped staff view)
 *   parent                      → /parent/household
 *   player                      → /player/dashboard
 *   recruiter                   → /recruiter
 *   tutor                       → /tutor
 *   (no role / unrecognized)    → /onboarding
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import type { UserRole } from '$lib/types';
import type { User } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Route map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a `UserRole` string to its canonical entry-point route.
 *
 * Returns `'/onboarding'` for null, undefined, `'guest'`, or any unrecognized
 * string — covering first-time sign-ins where the Firestore doc exists but
 * the `role` field has not yet been stamped by the invite/setup flow.
 */
export function getRoleDestination(role: UserRole | string | null | undefined): string {
	switch (role) {
		case 'super_admin':
		case 'global_admin':
			return '/admin/overview';
		case 'director':
			return '/director';
		case 'coach':
			return '/coach/daily-intel';
		case 'registrar':
			return '/director';
		case 'parent':
			return '/parent/household';
		case 'player':
			return '/player/dashboard';
		case 'recruiter':
			return '/recruiter';
		case 'tutor':
			return '/tutor';
		default:
			return '/onboarding';
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore-first routing function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch `users/{uid}` from Firestore and navigate to the role's entry point.
 *
 * Falls back to `/onboarding` when:
 *   • The document does not exist (first-time Google sign-in)
 *   • The `role` field is absent or unrecognized
 *   • The Firestore read fails (network error)
 *
 * @param user  — Firebase Auth User object (must be authenticated)
 * @param opts  — SvelteKit navigation options (`replaceState` defaults to true)
 *
 * @example
 * const result = await signInWithPopup(auth, new GoogleAuthProvider());
 * await routeByFirestoreRole(result.user);
 */
export async function routeByFirestoreRole(
	user: User,
	opts: { replaceState?: boolean } = {},
): Promise<void> {
	if (!browser) return;
	const { replaceState = true } = opts;

	try {
		const emailKey = (user.email ?? '').trim().toLowerCase();
		if (!emailKey) {
			await goto('/onboarding', { replaceState });
			return;
		}
		const snap = await getDoc(doc(db, 'users', emailKey));
		const role = snap.exists()
			? (snap.data()?.role as UserRole | undefined)
			: undefined;
		await goto(getRoleDestination(role), { replaceState });
	} catch {
		// Network / permission failure — safest recovery is onboarding
		await goto('/onboarding', { replaceState });
	}
}
