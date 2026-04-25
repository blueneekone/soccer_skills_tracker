<script>
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

		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && teams.some((t) => t.id === pivot)) {
			if (selectedTeamId !== pivot) {
				selectedTeamId = pivot;
			}
			return;
		}

		const urlTeam = page.url.searchParams.get('teamId')?.trim();
		if (urlTeam && teams.some((t) => t.id === urlTeam)) {
			if (selectedTeamId !== urlTeam) {
				selectedTeamId = urlTeam;
				workspaceContextStore.setActiveTeamId(urlTeam);
			}
			return;
		}

		if (!selectedTeamId || !teams.some((t) => t.id === selectedTeamId)) {
			selectedTeamId = teams[0].id;
			workspaceContextStore.setActiveTeamId(teams[0].id);
		}
	});

	$effect(() => {
		if (role !== 'coach' || !userEmail || coachInviteClaimTried) return;
		coachInviteClaimTried = true;
		void claimCoachInvite({}).catch(() => {});
	});
</script>

<svelte:head>
	<title>Coach dashboard · SSTRACKER</title>
</svelte:head>

<div class="ec-page ec-coach st-pillar1">
	<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col">
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
