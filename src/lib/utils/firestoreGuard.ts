/**
 * firestoreGuard.ts
 * ──────────────────
 * b815 Defensive Hydration Guard (GEMINI.md §4)
 *
 * "You MUST wrap all Firestore getDocs calls in strict hydration guards
 *  to prevent Quota Exceeded loops."
 *
 * Usage:
 *   import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
 *   if (!isFirestoreReady()) return;
 */

import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';

/**
 * Returns true only when Firestore is initialised AND the user is
 * authenticated and not in a loading state.
 *
 * Call this as the first guard inside any $effect or async loader
 * that calls getDocs() or getDoc().
 */
export function isFirestoreReady(): boolean {
	if (!db) return false;
	if (authStore.isLoading) return false;
	if (!authStore.isAuthenticated) return false;
	return true;
}
