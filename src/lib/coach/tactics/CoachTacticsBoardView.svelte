<script lang="ts">
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
	import TacticalCommandBoard from '$lib/components/coach/TacticalCommandBoard.svelte';

	const teamScope = new CoachTeamScope({ preferProfileTeam: true });
	$effect(() => {
		teamScope.syncSelectedTeam();
	});

	const myTeams = $derived(teamScope.myTeams);
	const teamLabel = $derived(teamScope.teamLabel);
</script>

<div class="tactics-board-root">
	<header class="tactics-board-head">
		<div>
			<p class="tactics-board-kicker">Field Station · Tactics</p>
			<h1 class="tactics-board-title">Tactical command board</h1>
			<p class="tactics-board-sub">
				Design schematics, save named tactics, and run AI analysis against your team library.
			</p>
		</div>
		{#if myTeams.length > 1}
			<label class="tactics-board-team-label" for="tactics-board-team">Team</label>
			<select
				id="tactics-board-team"
				class="tactics-board-team-select"
				bind:value={teamScope.selectedTeamId}
			>
				{#each myTeams as team (team.id)}
					<option value={team.id}>{team.name || team.id}</option>
				{/each}
			</select>
		{:else if teamScope.selectedTeamId}
			<p class="tactics-board-team-static">{teamLabel}</p>
		{/if}
	</header>

	{#if !teamScope.selectedTeamId}
		<p class="tactics-board-empty">Select a team to open the tactical board.</p>
	{:else}
		<TacticalCommandBoard teamId={teamScope.selectedTeamId} />
	{/if}
</div>

<style>
	.tactics-board-root {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}
	.tactics-board-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
	}
	.tactics-board-kicker {
		margin: 0 0 4px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
	}
	.tactics-board-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #0f172a);
	}
	.tactics-board-sub {
		margin: 6px 0 0;
		max-width: 42rem;
		font-size: 13px;
		color: var(--text-secondary, #64748b);
	}
	.tactics-board-team-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #64748b;
	}
	.tactics-board-team-select {
		min-width: 12rem;
		padding: 6px 10px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		background: #fff;
		font-size: 13px;
	}
	.tactics-board-team-static {
		margin: 0;
		font-size: 12px;
		font-family: ui-monospace, monospace;
		color: #64748b;
	}
	.tactics-board-empty {
		margin: 0;
		padding: 1rem;
		border: 1px dashed #cbd5e1;
		border-radius: 8px;
		font-size: 13px;
		color: #64748b;
	}
</style>
