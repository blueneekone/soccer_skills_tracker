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
		const refreshTimeout = new Promise<void>((_, reject) =>
			setTimeout(() => reject(new Error('refresh timeout')), 7000),
		);
		await Promise.race([authStore.refresh({ silent: true }), refreshTimeout]);
	} catch {
		/* non-fatal — proceed with current auth state */
	}

	try {
		const tokenTimeout = new Promise<void>((_, reject) =>
			setTimeout(() => reject(new Error('token timeout')), 5000),
		);
		await Promise.race([
			(async () => {
				await auth.currentUser?.getIdToken(true);
				await authStore.refreshClaims();
			})(),
			tokenTimeout,
		]);
	} catch {
		/* non-fatal */
	}

	const u = auth.currentUser;
	if (await requiresPasskeyEnrollmentBeforeApp(u)) {
		await untrack(() => goto(PASSKEY_ENROLL_ROUTE, { replaceState }));
		return;
	}

	if (!authStore.isProfileComplete) {
		await untrack(() => goto('/onboarding', { replaceState }));
		return;
	}

	await untrack(() => goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState }));
}
