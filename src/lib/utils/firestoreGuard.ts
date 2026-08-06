import { getActiveDb } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';

/**
 * b815 Defensive Hydration Guard.
 * Call this at the top of every getDocs() block.
 * Returns true if safe to proceed, false if the call must abort.
 */
export function isFirestoreReady(): boolean {
  return !!getActiveDb() && authStore.isAuthenticated === true && !authStore.isLoading;
}
