<script>
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import TacticalCommandBoard from '$lib/components/coach/TacticalCommandBoard.svelte';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

	let selectedTeamId = $state('');

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
			if (selectedTeamId !== pivot) selectedTeamId = pivot;
			return;
		}

		const urlTeam = page.url.searchParams.get('teamId')?.trim();
		if (urlTeam && teams.some((t) => t.id === urlTeam)) {
			if (selectedTeamId !== urlTeam) selectedTeamId = urlTeam;
			return;
		}

		if (!selectedTeamId) {
			selectedTeamId = teams[0].id;
		}
	});
</script>

<div class="tactical-route tw-min-h-0 tw-flex-1 tw-flex tw-flex-col">
	<TacticalCommandBoard teamId={selectedTeamId} />
</div>

<style>
	.tactical-route {
		margin: 0;
		padding: 0;
		width: 100%;
	}
</style>
