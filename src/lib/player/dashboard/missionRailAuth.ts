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
	try {
		const tr = await getIdTokenResult(auth.currentUser, false);
		const claimTeamId =
			typeof tr.claims.teamId === 'string' ? tr.claims.teamId.trim() : '';
		const claimClub = claimClubId(tr.claims as Record<string, unknown>);
		const profileTeam = profileTeamId.trim();
		const profileClub = profileClubId.trim();
		const effectiveTeam = profileTeam || claimTeamId;
		if (!effectiveTeam && !profileClub && !claimClub) return false;

		const teamStale = Boolean(profileTeam && claimTeamId !== profileTeam);
		const clubStale = Boolean(profileClub && !claimClub);
		// List rule requires tokenClub even when profile.clubId is unset.
		const listNeedsClub = Boolean(effectiveTeam && !claimClub);

		if (teamStale || clubStale || listNeedsClub) {
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

/** Prefer profile team, then workspace cache, then JWT (operative link may stamp claims first). */
export function pickMissionRailTeamId(
	profileTeamId: string,
	workspaceTeamId = '',
	claimTeamId = '',
): string {
	const profile = profileTeamId.trim();
	const workspace = workspaceTeamId.trim();
	const claim = claimTeamId.trim();

	// team_assignments list rules filter on tokenTeam() — query must match JWT team or snapshot is silently empty.
	if (claim && claim !== 'admin') {
		if (profile && profile !== claim) return claim;
		if (profile) return profile;
		if (workspace && workspace !== 'admin') return workspace;
		return claim;
	}

	for (const raw of [profile, workspace, claim]) {
		const t = raw.trim();
		if (t && t !== 'admin') return t;
	}
	return '';
}

/** Read teamId from current ID token without forcing refresh. */
export async function readTokenTeamId(): Promise<string> {
	if (!browser || !auth.currentUser) return '';
	try {
		const tr = await getIdTokenResult(auth.currentUser, false);
		return typeof tr.claims.teamId === 'string' ? tr.claims.teamId.trim() : '';
	} catch {
		return '';
	}
}

/** Read clubId / tenantId from current ID token without forcing refresh. */
export async function readTokenClubId(): Promise<string> {
	if (!browser || !auth.currentUser) return '';
	try {
		const tr = await getIdTokenResult(auth.currentUser, false);
		return claimClubId(tr.claims as Record<string, unknown>);
	} catch {
		return '';
	}
}

/** True when profile and JWT disagree on team — Firestore list rules gate on tokenTeam(). */
export function missionRailTeamScopeMismatch(
	profileTeamId: string,
	tokenTeamId: string,
): boolean {
	const profile = profileTeamId.trim();
	const token = tokenTeamId.trim();
	return Boolean(profile && token && profile !== token);
}

/** Refresh profile when JWT has team scope but Firestore profile does not (parent team-link handoff). */
export async function refreshProfileIfClaimsTeamAhead(
	profileTeamId: string,
): Promise<boolean> {
	if (!browser || !auth.currentUser) return false;
	if (profileTeamId.trim()) return false;
	try {
		const claimTeam = await readTokenTeamId();
		if (!claimTeam || claimTeam === 'admin') return false;
		await authStore.refresh({ silent: true });
		return true;
	} catch {
		return false;
	}
}

/** Reload profile when JWT team differs from Firestore (stale profile causes silent empty intent list). */
export async function refreshProfileIfClaimsTeamMismatch(
	profileTeamId: string,
): Promise<boolean> {
	if (!browser || !auth.currentUser) return false;
	const profile = profileTeamId.trim();
	if (!profile) return false;
	try {
		const claimTeam = await readTokenTeamId();
		if (!claimTeam || claimTeam === 'admin' || claimTeam === profile) return false;
		await authStore.refresh({ silent: true });
		return true;
	} catch {
		return false;
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
