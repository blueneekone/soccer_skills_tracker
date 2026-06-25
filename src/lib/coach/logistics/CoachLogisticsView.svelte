<script lang="ts">
	import MessagesTab from '$lib/components/coach/MessagesTab.svelte';
	import CoachTeamSchedulePanel from '$lib/coach/logistics/CoachTeamSchedulePanel.svelte';
	import CoachTeamRosterPanel from '$lib/coach/logistics/CoachTeamRosterPanel.svelte';
	import CoachTeamAttendancePanel from '$lib/coach/logistics/CoachTeamAttendancePanel.svelte';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';

	const teamScope = new CoachTeamScope({ preferProfileTeam: true });
	$effect(() => {
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
</script>

<div class="logistics-root">
	<header class="logistics-head">
		<div>
			<p class="logistics-kicker qa-mono">Epic 4.7 · Team ops</p>
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
				<section class="logistics-cta" aria-labelledby="logistics-ann-cta">
					<h2 id="logistics-ann-cta" class="logistics-section-title">Team announcements</h2>
					<p class="logistics-section-sub">
						Parent-targeted broadcasts live in the unified Comms hub — delivery receipts show parents
						delivered vs skipped.
					</p>
					<a
						class="logistics-cta-link"
						href="/messages?channel=announcements&teamId={encodeURIComponent(teamScope.selectedTeamId)}"
					>
						Publish team announcement →
					</a>
				</section>
				<section class="logistics-channels" aria-labelledby="logistics-channels-heading">
					<h2 id="logistics-channels-heading" class="logistics-section-title">Team channels</h2>
					<p class="logistics-section-sub">
						Logistics threads (game day, practice) — full channel migration to Comms hub in Phase 2.
					</p>
					<MessagesTab teamId={teamScope.selectedTeamId} clubId={teamClubId} />
				</section>
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
		gap: 8px;
	}

	.logistics-tab {
		border: 1px solid #e2e8f0;
		border-radius: 999px;
		padding: 8px 14px;
		font-size: 12px;
		font-weight: 700;
		background: #fff;
		color: #475569;
		cursor: pointer;
	}

	.logistics-tab--active {
		background: #0f172a;
		border-color: #0f172a;
		color: #fff;
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

	.logistics-channels {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}

	.logistics-section-title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary, #0f172a);
	}

	.logistics-section-sub {
		margin: 0;
		font-size: 12px;
		color: #64748b;
	}

	.logistics-cta {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px 18px;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		background: #f8fafc;
	}

	.logistics-cta-link {
		display: inline-flex;
		align-self: flex-start;
		padding: 10px 16px;
		border-radius: 12px;
		font-size: 13px;
		font-weight: 800;
		text-decoration: none;
		color: #0f172a;
		background: var(--brand-primary, #f59e0b);
	}

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
	}
</style>
