<script>
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import SquadTelemetryView from '$lib/components/coach/SquadTelemetryView.svelte';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

	const claimCoachInvite = httpsCallable(functions, 'claimCoachInvite');

	let selectedTeamId = $state('');
	let coachInviteClaimTried = $state(false);

	const role = $derived(authStore.role);
	const userEmail = $derived(authStore.user?.email || '');
	const myTeams = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin') return teamsStore.teams.slice();
		if (!userEmail) return [];
		return teamsStore.getCoachTeams(userEmail);
	});

	$effect(() => {
		const teams = myTeams;
		if (teams.length === 0) return;

		// Priority 1: context store pivot — set by WorkspaceContextSwitcher
		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && teams.some((t) => t.id === pivot)) {
			if (selectedTeamId !== pivot) {
			    selectedTeamId = pivot;
			}
			return;
		}

		// Priority 2: URL teamId param
		const urlTeam = page.url.searchParams.get('teamId')?.trim();
		if (urlTeam && teams.some((t) => t.id === urlTeam)) {
			if (selectedTeamId !== urlTeam) {
				selectedTeamId = urlTeam;
				untrack(() => workspaceContextStore.setActiveTeamId(urlTeam));
			}
			return;
		}

		// Priority 3: Default to first team if nothing matches
		if (!selectedTeamId || !teams.some((t) => t.id === selectedTeamId)) {
			selectedTeamId = teams[0].id;
			untrack(() => workspaceContextStore.setActiveTeamId(teams[0].id));
		}
	});

	$effect(() => {
		if (role !== 'coach' || !userEmail || coachInviteClaimTried) return;
		coachInviteClaimTried = true;
		void claimCoachInvite({}).catch(() => {});
	});
</script>

<div class="ec-page ec-coach st-pillar1">
	<div class="tw-flex tw-flex-col tw-min-h-0 tw-flex-1">
		<SquadTelemetryView teamId={selectedTeamId} teams={myTeams} />
	</div>
</div>

<style>
	.ec-coach.st-pillar1 {
		padding: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		flex: 1;
	}
</style>
