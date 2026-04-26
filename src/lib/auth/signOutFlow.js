import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '$lib/firebase.js';
import { brandingStore } from '$lib/stores/branding.svelte.js';
import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';
import { teamsStore } from '$lib/stores/teams.svelte.js';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

/**
 * Central sign-out: navigate to a public route first (unmount protected UI), then
 * `signOut`, then clear client stores so a later login on the same device has no
 * ghost session data.
 *
 * @param {object} [opts]
 * @param {string} [opts.loginPath] Defaults to `/login`
 */
export async function handleSignOut(opts = {}) {
	if (!browser) return;
	const loginPath =
		typeof opts.loginPath === 'string' && opts.loginPath.trim() ? opts.loginPath.trim() : '/login';
	try {
		await goto(loginPath, { replaceState: true });
		await signOut(auth);
	} catch (e) {
		console.error('[handleSignOut]', e);
		try {
			await signOut(auth);
		} catch (e2) {
			console.error('[handleSignOut] recovery signOut failed', e2);
		}
	} finally {
		try {
			workspaceContextStore.clear();
			teamsStore.clearSession();
			clubBrandingStore.clear();
			brandingStore.resetLocalDefaults();
		} catch (e3) {
			console.error('[handleSignOut] store reset failed', e3);
		}
	}
}
