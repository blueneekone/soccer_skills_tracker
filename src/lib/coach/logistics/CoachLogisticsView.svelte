<script lang="ts">
	import MessagesTab from '$lib/components/coach/MessagesTab.svelte';
	import ParentAnnouncementCompose from '$lib/components/coach/ParentAnnouncementCompose.svelte';
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
</script>

<div class="logistics-root">
	<header class="logistics-head">
		<div>
			<p class="logistics-kicker qa-mono">Epic 4 · Coach logistics</p>
			<h1 class="logistics-title">Logistics &amp; Comms</h1>
			<p class="logistics-sub">
				Parent-targeted announcements and monitored team channels — SafeSport-aligned per COMMS_HUB.
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
		<div class="logistics-stack">
			<ParentAnnouncementCompose
				teamId={teamScope.selectedTeamId}
				clubId={teamClubId}
				teamName={teamLabel}
			/>

			<section class="logistics-channels" aria-labelledby="logistics-channels-heading">
				<h2 id="logistics-channels-heading" class="logistics-section-title">Team channels</h2>
				<p class="logistics-section-sub">
					Staff/participant channel matrix — game day, practice, and general logistics threads.
				</p>
				<MessagesTab teamId={teamScope.selectedTeamId} clubId={teamClubId} />
			</section>
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

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
	}
</style>
