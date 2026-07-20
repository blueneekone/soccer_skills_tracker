<script lang="ts">
	import { dev } from '$app/environment';
	import CoachTeamSchedulePanel from '$lib/coach/logistics/CoachTeamSchedulePanel.svelte';
	import CoachTeamRosterPanel from '$lib/coach/logistics/CoachTeamRosterPanel.svelte';
	import CoachTeamAttendancePanel from '$lib/coach/logistics/CoachTeamAttendancePanel.svelte';
	import CoachTeamCommsPanel from '$lib/coach/logistics/CoachTeamCommsPanel.svelte';
	import { page } from '$app/state';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db } from '$lib/firebase.js';
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';

	const teamScope = new CoachTeamScope({ preferProfileTeam: true });
	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		teamScope.syncSelectedTeam();
	});

	const myTeams = $derived(teamScope.myTeams);
	const currentTeam = $derived(teamScope.currentTeam);
	const teamClubId = $derived(teamScope.teamClubId);
	const teamLabel = $derived(teamScope.teamLabel);

	/** @type {'comms' | 'schedule' | 'roster' | 'attendance'} */
	let activeTab = $state('comms');

	const tabs = [
		{ id: 'comms', label: 'Comms' },
		{ id: 'schedule', label: 'Schedule' },
		{ id: 'roster', label: 'Roster' },
		{ id: 'attendance', label: 'Attendance' },
	] as const;

	const tabFromUrl = $derived(page.url.searchParams.get('tab'));

	$effect(() => {
		if (tabFromUrl && tabs.some((t) => t.id === tabFromUrl)) {
			activeTab = tabFromUrl as typeof activeTab;
		}
	});
</script>

<div class="logistics-root">
	<header class="logistics-head">
		<div>
			{#if dev}
				<p class="logistics-kicker qa-mono">Epic 4.7 · Team ops</p>
			{/if}
			<h1 class="logistics-title">Team Ops</h1>
			<p class="logistics-sub">
				Coach-delegated logistics — schedule, roster, attendance, and parent-targeted comms (no separate
				team_manager role in v1).
			</p>
		</div>

		{#if myTeams.length > 1}
			<label class="logistics-team-label" for="logistics-team">Team</label>
			<select id="logistics-team" class="logistics-team-select" bind:value={teamScope.selectedTeamId}>
				{#each myTeams as team (team.id)}
					<option value={team.id}>{team.name || team.id}</option>
				{/each}
			</select>
		{:else if currentTeam}
			<p class="logistics-team-static qa-mono">{teamLabel}</p>
		{/if}
	</header>

	{#if !teamsStore.loaded}
		<p class="logistics-hint">Loading teams…</p>
	{:else if myTeams.length === 0}
		<p class="logistics-hint">No team assigned — contact your director to link a roster.</p>
	{:else}
		<nav class="logistics-tabs" aria-label="Team ops sections">
			{#each tabs as tab (tab.id)}
				<button
					type="button"
					class="logistics-tab"
					class:logistics-tab--active={activeTab === tab.id}
					aria-current={activeTab === tab.id ? 'page' : undefined}
					onclick={() => (activeTab = tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</nav>

		<div class="logistics-stack">
			{#if activeTab === 'comms'}
				<CoachTeamCommsPanel
					teamId={teamScope.selectedTeamId}
					clubId={teamClubId}
					teamName={teamLabel}
				/>
			{:else if activeTab === 'schedule'}
				<CoachTeamSchedulePanel teamId={teamScope.selectedTeamId} />
			{:else if activeTab === 'roster'}
				<CoachTeamRosterPanel teamId={teamScope.selectedTeamId} />
			{:else if activeTab === 'attendance'}
				<CoachTeamAttendancePanel teamId={teamScope.selectedTeamId} />
			{/if}
		</div>
	{/if}
</div>

<style>
	.logistics-root {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
		padding: var(--bento-pad-liquid, 1rem);
		padding-bottom: calc(var(--bento-pad-liquid, 1rem) + 84px + env(safe-area-inset-bottom, 0px));
	}

	.logistics-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px 20px;
	}

	.logistics-kicker {
		margin: 0 0 4px;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #64748b;
	}

	.logistics-title {
		margin: 0;
		font-size: clamp(1.35rem, 2.5vw, 1.75rem);
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--text-primary, #0f172a);
	}

	.logistics-sub {
		margin: 6px 0 0;
		max-width: 40rem;
		font-size: 13px;
		line-height: 1.45;
		color: #64748b;
	}

	.logistics-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0;
		border-bottom: 1px solid var(--pd-grey-trim, #334155);
	}

	.logistics-tab {
		border: none;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		padding: 10px 16px;
		font-size: 12px;
		font-weight: 700;
		background: transparent;
		color: #94a3b8;
		cursor: pointer;
	}

	.logistics-tab--active {
		border-bottom-color: var(--pd-nav-cyan, #06b6d4);
		color: #e2e8f0;
	}

	.logistics-team-label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
	}

	.logistics-team-select,
	.logistics-team-static {
		min-width: 12rem;
		font-size: 13px;
	}

	.logistics-team-select {
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 8px 12px;
		background: #fff;
		color: var(--text-primary, #0f172a);
	}

	.logistics-team-static {
		margin: 0;
		font-weight: 700;
		color: #334155;
	}

	.logistics-hint {
		margin: 0;
		font-size: 13px;
		color: #64748b;
	}

	.logistics-stack {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
	}
</style>
