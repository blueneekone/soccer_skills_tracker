/**
 * Shared coach team resolution — workspace pivot, profile team, URL param, first team.
 */

import { authStore } from '$lib/stores/auth.svelte.js';
import { teamsStore } from '$lib/stores/teams.svelte.js';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

export type CoachTeamRow = {
	id: string;
	name?: string;
	clubId?: string;
	sport?: string;
};

export type CoachTeamScopeOptions = {
	/** Prefer `authStore.userProfile.teamId` when in coach's team list. */
	preferProfileTeam?: boolean;
	/** Read `?teamId=` from the current URL (match-day). */
	preferUrlTeamId?: () => string | null | undefined;
	/** When URL team resolves, sync workspace pivot. */
	syncWorkspaceOnUrlTeam?: boolean;
	/** Include `director` in all-teams access (default true). */
	includeDirector?: boolean;
};

const DEFAULT_OPTS: Required<
	Pick<CoachTeamScopeOptions, 'preferProfileTeam' | 'includeDirector' | 'syncWorkspaceOnUrlTeam'>
> = {
	preferProfileTeam: false,
	includeDirector: true,
	syncWorkspaceOnUrlTeam: false,
};

export class CoachTeamScope {
	readonly options: CoachTeamScopeOptions;
	selectedTeamId = $state('');

	role = $derived(authStore.role);
	myEmail = $derived((authStore.user?.email || '').toLowerCase());

	myTeams = $derived.by((): CoachTeamRow[] => {
		if (!teamsStore.loaded) return [];
		const role = this.role;
		const includeDirector = this.options.includeDirector !== false;
		if (
			role === 'super_admin' ||
			role === 'global_admin' ||
			(includeDirector && role === 'director')
		) {
			return teamsStore.teams.slice() as CoachTeamRow[];
		}
		if (!this.myEmail) return [];
		return teamsStore.getCoachTeams(this.myEmail) as CoachTeamRow[];
	});

	currentTeam = $derived(
		this.myTeams.find((t) => t.id === this.selectedTeamId) ?? null,
	);

	teamClubId = $derived.by(() => {
		const fromTeam =
			typeof this.currentTeam?.clubId === 'string' ? this.currentTeam.clubId.trim() : '';
		if (fromTeam) return fromTeam;
		const fromProfile =
			typeof authStore.userProfile?.clubId === 'string' ?
				authStore.userProfile.clubId.trim()
			:	'';
		return fromProfile;
	});

	teamLabel = $derived.by(() => {
		const name = typeof this.currentTeam?.name === 'string' ? this.currentTeam.name.trim() : '';
		return name || this.selectedTeamId || '—';
	});

	constructor(options: CoachTeamScopeOptions = {}) {
		this.options = { ...DEFAULT_OPTS, ...options };
	}

	/** Call from parent `$effect(() => teamScope.syncSelectedTeam())`. */
	syncSelectedTeam() {
		const teams = this.myTeams;
		if (teams.length === 0) return;

		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && teams.some((t) => t.id === pivot)) {
			if (this.selectedTeamId !== pivot) this.selectedTeamId = pivot;
			return;
		}

		if (this.options.preferUrlTeamId) {
			const urlTeam = this.options.preferUrlTeamId()?.trim();
			if (urlTeam && teams.some((t) => t.id === urlTeam)) {
				if (this.selectedTeamId !== urlTeam) this.selectedTeamId = urlTeam;
				if (this.options.syncWorkspaceOnUrlTeam) {
					workspaceContextStore.setActiveTeamId(urlTeam);
				}
				return;
			}
		}

		if (this.options.preferProfileTeam) {
			const prof = authStore.userProfile;
			if (
				prof?.teamId &&
				prof.teamId !== 'admin' &&
				teams.some((t) => t.id === prof.teamId)
			) {
				if (this.selectedTeamId !== prof.teamId) this.selectedTeamId = prof.teamId;
				return;
			}
		}

		if (!this.selectedTeamId || !teams.some((t) => t.id === this.selectedTeamId)) {
			this.selectedTeamId = teams[0].id;
		}
	}
}
