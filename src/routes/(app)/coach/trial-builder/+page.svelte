<script>
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import CoachTrialBuilderPanel from '$lib/components/coach/CoachTrialBuilderPanel.svelte';
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

	const selectedTeam = $derived(myTeams.find((t) => t.id === selectedTeamId));
	const sportHint = $derived(
		typeof selectedTeam?.sport === 'string' && selectedTeam.sport.trim() ?
			selectedTeam.sport.trim()
		:	'',
	);

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
			if (selectedTeamId !== urlTeam) {
				selectedTeamId = urlTeam;
				untrack(() => workspaceContextStore.setActiveTeamId(urlTeam));
			}
			return;
		}

		if (!selectedTeamId || !teams.some((t) => t.id === selectedTeamId)) {
			selectedTeamId = teams[0].id;
			untrack(() => workspaceContextStore.setActiveTeamId(teams[0].id));
		}
	});
</script>

<div class="ec-page ec-coach trial-builder-route tw-min-h-0 tw-flex-1 tw-flex tw-flex-col tw-p-4 md:tw-p-6">
	{#if !browser}
		<p class="tw-font-mono tw-text-xs tw-text-slate-500">Loading…</p>
	{:else if !teamsStore.loaded}
		<p class="tw-font-mono tw-text-xs tw-text-slate-500">Loading teams…</p>
	{:else if myTeams.length === 0}
		<section class="tw-rounded-2xl tw-border tw-border-amber-500/40 tw-bg-amber-950/40 tw-p-6 tw-text-amber-100">
			<h1 class="tw-m-0 tw-text-xl tw-font-black tw-tracking-wide">Trial builder</h1>
			<p class="tw-mt-2 tw-mb-0 tw-text-sm tw-leading-relaxed">
				No coach-scoped teams found for your account. Ask your director to attach you to a squad first.
			</p>
		</section>
	{:else}
		<div class="tw-mb-6 tw-flex tw-max-w-xl tw-flex-col tw-gap-3">
			<label class="tw-flex tw-flex-col tw-gap-2">
				<span class="tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">Team</span>
				<select
					class="tw-rounded-xl tw-border tw-border-slate-700 tw-bg-slate-900 tw-p-3 tw-font-semibold tw-text-slate-100"
					bind:value={selectedTeamId}
				>
					{#each myTeams as t (t.id)}
						<option value={t.id}>{t.name || t.id}</option>
					{/each}
				</select>
			</label>
		</div>
		<CoachTrialBuilderPanel teamId={selectedTeamId} sportHint={sportHint} />
	{/if}
</div>

<style>
	.trial-builder-route {
		max-width: 960px;
		margin: 0 auto;
		width: 100%;
	}
</style>
