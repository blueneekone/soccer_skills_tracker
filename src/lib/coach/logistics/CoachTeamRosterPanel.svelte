<script lang="ts">
	/**
	 * CoachTeamRosterPanel.svelte — Shell layer (Vanguard Trinity)
	 * ─────────────────────────────────────────────────────────────
	 * Orchestrates the roster Brain (RosterPanelEngine) and renders
	 * via the Glass layer (RosterPlayerRow).
	 *
	 * Zero Firestore or business logic lives here — this component
	 * only wires props to child components and manages lifecycle.
	 */
	import { RosterPanelEngine } from './RosterPanelEngine.svelte.js';
	import RosterPlayerRow from './RosterPlayerRow.svelte';
	import CoachRosterImportPanel from '$lib/coach/logistics/CoachRosterImportPanel.svelte';

	let { teamId = '' } = $props();

	const engine = new RosterPanelEngine();

	$effect(() => {
		engine.subscribe(teamId);
		return () => engine.detach();
	});
</script>

<div class="ops-panel">
	<h2 class="ops-panel__title">Roster</h2>
	<p class="ops-panel__sub">
		Import CSV below or add one player at a time on
		<a class="ops-link" href="/coach/dashboard">Daily Intel</a>.
		Linked players with email appear in the list automatically.
	</p>

	<CoachRosterImportPanel {teamId} />

	{#if engine.loading}
		<p class="ops-muted">Loading roster…</p>
	{:else if engine.err}
		<p class="ops-err" role="alert">{engine.err}</p>
	{:else if engine.players.length === 0}
		<p class="ops-muted">No linked players on this team yet. Ask your director to sync the roster.</p>
	{:else}
		<p class="ops-count">{engine.players.length} player{engine.players.length === 1 ? '' : 's'}</p>
		<ul class="ops-roster">
			{#each engine.players as player (player.id)}
				<RosterPlayerRow
					{player}
					isEditing={engine.editingPlayerId === player.id}
					editData={engine.editData}
					onStartEdit={(p) => engine.startEdit(p)}
					onCancelEdit={() => engine.cancelEdit()}
					onSaveEdit={(id) => engine.saveEdit(id)}
				/>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.ops-panel { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
	.ops-panel__title { margin: 0; font-size: 15px; font-weight: 800; color: var(--text-primary, #0f172a); }
	.ops-panel__sub { margin: 0; font-size: 12px; color: #64748b; max-width: 40rem; }
	.ops-muted { margin: 0; font-size: 13px; color: #64748b; }
	.ops-err { margin: 0; font-size: 12px; color: #b91c1c; }
	.ops-count { margin: 0; font-size: 12px; font-weight: 700; color: #334155; }
	.ops-roster { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
	.ops-link { color: #0d9488; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
	.ops-link:hover { color: #0f766e; }
</style>
