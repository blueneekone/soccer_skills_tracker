/**
 * Unified post-login navigation: mandatory passkey (legacy/magic-link) → profile setup → dashboard.
 */

import { goto } from '$app/navigation';
import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { auth } from '$lib/firebase.js';
import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import {
	requiresPasskeyEnrollmentBeforeApp,
	PASSKEY_ENROLL_ROUTE,
} from '$lib/auth/passkeyGate.js';

export { PASSKEY_ENROLL_ROUTE };

export async function navigateAfterLogin(
	options?: { replaceState?: boolean },
): Promise<void> {
	if (!browser) return;
	const replaceState = options?.replaceState ?? true;

	try {
		await authStore.refresh({ silent: true });
	} catch {
		/* non-fatal */
	}

	const u = auth.currentUser;
	if (await requiresPasskeyEnrollmentBeforeApp(u)) {
		await untrack(() => goto(PASSKEY_ENROLL_ROUTE, { replaceState }));
		return;
	}

	if (!authStore.isProfileComplete) {
		await untrack(() => goto('/setup', { replaceState }));
		return;
	}

	await untrack(() => goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState }));
}
