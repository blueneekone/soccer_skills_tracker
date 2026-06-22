import {
	missionRailEmptyCopy,
	resolveMissionRailEmptyReason,
	type MissionRailEmptyReason,
} from '$lib/player/dashboard/activeBounties.js';

export type MissionRailDiagnostic = {
	teamIdUsed: string;
	tokenTeam: string;
	tokenClub: string;
	intentSnapshotCount: number;
	intentScopedCount: number;
	listenerAttached: boolean;
	emptyReason: MissionRailEmptyReason;
};

export function buildMissionRailDiagnostic(input: {
	missionSyncBlocked: boolean;
	authLoaded: boolean;
	teamIdUsed: string;
	intentSnapshotCount: number;
	intentScopedCount: number;
	profileTeamId: string;
	tokenTeamId: string;
	tokenClubId: string;
	listenerAttached: boolean;
	serverRefetchCount?: number | null;
}): MissionRailDiagnostic {
	const emptyReason = resolveMissionRailEmptyReason({
		missionSyncBlocked: input.missionSyncBlocked,
		authLoaded: input.authLoaded,
		teamIdUsed: input.teamIdUsed,
		intentSnapshotCount: input.intentSnapshotCount,
		intentScopedCount: input.intentScopedCount,
		profileTeamId: input.profileTeamId,
		tokenTeamId: input.tokenTeamId,
		serverRefetchCount: input.serverRefetchCount,
	});
	return {
		teamIdUsed: input.teamIdUsed,
		tokenTeam: input.tokenTeamId,
		tokenClub: input.tokenClubId,
		intentSnapshotCount: input.intentSnapshotCount,
		intentScopedCount: input.intentScopedCount,
		listenerAttached: input.listenerAttached,
		emptyReason,
	};
}

export function missionRailEmptyMessageFor(diagnostic: MissionRailDiagnostic): string {
	return missionRailEmptyCopy({ reason: diagnostic.emptyReason });
}

/** One-shot info log key — avoids spamming console on every reactive tick. */
export function missionRailSnapshotLogKey(input: {
	teamId: string;
	intentSnapshotCount: number;
	intentScopedCount: number;
	listenerAttached: boolean;
}): string {
	const reason = !input.teamId
		? 'no_team_id'
		: input.intentSnapshotCount === 0
			? 'zero_docs'
			: input.intentScopedCount === 0
				? 'scoped_out'
				: 'ok';
	return `${input.teamId}|${input.intentSnapshotCount}|${input.intentScopedCount}|${input.listenerAttached}|${reason}`;
}

export function logMissionRailSnapshotOnce(
	logKey: string,
	prevKey: string,
	diagnostic: MissionRailDiagnostic,
): string {
	if (prevKey === logKey) return prevKey;
	if (!diagnostic.teamIdUsed) {
		console.info(
			'[ActiveBounties] coach intent snapshot: listener not attached (no teamId — profile/JWT team missing)',
			diagnostic,
		);
		return logKey;
	}
	console.info(
		`[ActiveBounties] coach intent snapshot: ${diagnostic.intentSnapshotCount} docs (teamId=${diagnostic.teamIdUsed}, scoped=${diagnostic.intentScopedCount}, listener=${diagnostic.listenerAttached})`,
		diagnostic,
	);
	return logKey;
}
