import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '$lib/firebase.js';
import { fieldMenu } from '$lib/stores/fieldMenu.svelte.js';
import { brandingStore } from '$lib/stores/branding.svelte.js';
import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';
import { teamsStore } from '$lib/stores/teams.svelte.js';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

/**
 * Central sign-out: navigate to a public route first (unmount protected UI), then
 * `signOut`, then clear client stores so a later login on the same device has no
 * ghost session data.
 *
 * FCM hook: removes this device's push token from Firestore before signing out
 * to prevent rogue notifications to a logged-out device.
 *
 * @param {object} [opts]
 * @param {string} [opts.loginPath] Defaults to `/login`
 */
export async function handleSignOut(opts = {}) {
	if (!browser) return;
	const loginPath =
		typeof opts.loginPath === 'string' && opts.loginPath.trim() ? opts.loginPath.trim() : '/login';

	// ── FCM logout hook: deregister device token before signing out ──────────
	try {
		// Dynamic import avoids circular deps and keeps the bundle lean for
		// non-browser environments (e.g. SSR prerender)
		const { fcmService } = await import('$lib/services/messaging.svelte.js');
		await fcmService.deregisterDevice();
	} catch {
		// Best-effort — never block sign-out on FCM failure
	}

	try {
		fieldMenu.close();
		// Execute Firebase sign-out FIRST so authStore.isAuthenticated becomes false,
		// preventing the /login page from auto-redirecting us back to the app.
		await signOut(auth);
	} catch (e) {
		console.error('[handleSignOut]', e);
		try {
			await signOut(auth);
		} catch (e2) {
			console.error('[handleSignOut] recovery signOut failed', e2);
		}
	} finally {
		// Clear all lingering app state BEFORE we trigger the navigation
		try {
			workspaceContextStore.clear();
			teamsStore.clearSession();
			clubBrandingStore.clear();
			brandingStore.resetLocalDefaults();
		} catch (e3) {
			console.error('[handleSignOut] store reset failed', e3);
		}
		
		// Finally route to the login page (or public page)
		await goto(loginPath, { replaceState: true });
	}
}
