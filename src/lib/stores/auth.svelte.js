/**
 * Auth store public entry — thin re-export of modular facade.
 * @deprecated Import from `$lib/stores/auth/facade.svelte.js` for new code.
 */
export { authStore, createAuthFacade } from '$lib/stores/auth/facade.svelte.js';
export { getSessionItemSafe } from '$lib/stores/auth/storage.js';
