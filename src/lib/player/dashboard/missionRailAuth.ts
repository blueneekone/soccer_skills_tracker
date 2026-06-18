import { browser } from '$app/environment';
import { getIdTokenResult } from 'firebase/auth';
import { auth } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';

function claimClubId(claims: Record<string, unknown>): string {
	const club =
		typeof claims.clubId === 'string' ? claims.clubId.trim()
		: typeof claims.tenantId === 'string' ? claims.tenantId.trim()
		: '';
	return club;
}

/**
 * Refresh JWT when Firestore profile has team/club scope but token claims do not (QA-142).
 * team_assignments list rules require both tokenTeam() and tokenClub().
 */
export async function refreshClaimsIfProfileTeamStale(
	profileTeamId: string,
	profileClubId = '',
): Promise<boolean> {
	if (!browser || !auth.currentUser) return false;
	const teamId = profileTeamId.trim();
	const clubId = profileClubId.trim();
	if (!teamId && !clubId) return false;
	try {
		const tr = await getIdTokenResult(auth.currentUser, false);
		const claimTeamId =
			typeof tr.claims.teamId === 'string' ? tr.claims.teamId.trim() : '';
		const claimClub = claimClubId(tr.claims as Record<string, unknown>);
		const teamStale = Boolean(teamId && !claimTeamId);
		const clubStale = Boolean(clubId && !claimClub);
		if (teamStale || clubStale) {
			await authStore.refreshClaims();
			return true;
		}
	} catch {
		/* non-fatal — mission subscription may still retry */
	}
	return false;
}

/** Persists retry state across Svelte effect re-runs (prevents infinite refresh loops). */
export class MissionSnapshotRetryGate {
	private retried = false;

	onError(onRetry: () => void, onBlocked: () => void): void {
		if (!this.retried) {
			this.retried = true;
			onRetry();
			return;
		}
		onBlocked();
	}

	onSuccess(): void {
		this.retried = false;
	}

	reset(): void {
		this.retried = false;
	}
}

/** @deprecated Prefer MissionSnapshotRetryGate — factory resets state on every call. */
export function createMissionSnapshotRetryHandler(
	onRetry: () => void,
	onBlocked: () => void,
): () => void {
	const gate = new MissionSnapshotRetryGate();
	return () => gate.onError(onRetry, onBlocked);
}
