import { browser } from '$app/environment';
import { getIdTokenResult } from 'firebase/auth';
import { auth } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';

/** Refresh JWT when Firestore profile has teamId but token claims do not (QA-142). */
export async function refreshClaimsIfProfileTeamStale(profileTeamId: string): Promise<boolean> {
	if (!browser || !profileTeamId || !auth.currentUser) return false;
	try {
		const tr = await getIdTokenResult(auth.currentUser, false);
		const claimTeamId =
			typeof tr.claims.teamId === 'string' ? tr.claims.teamId.trim() : '';
		if (profileTeamId && !claimTeamId) {
			await authStore.refreshClaims();
			return true;
		}
	} catch {
		/* non-fatal — mission subscription may still retry */
	}
	return false;
}

/** One refreshClaims retry before reporting mission sync blocked. */
export function createMissionSnapshotRetryHandler(
	onRetry: () => void,
	onBlocked: () => void,
): () => void {
	let retried = false;
	return () => {
		if (!retried) {
			retried = true;
			onRetry();
			return;
		}
		onBlocked();
	};
}
