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

	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let { teamId = '' } = $props();

	const engine = new RosterPanelEngine();

	$effect(() => {
		const activeTeamId = authStore.userProfile?.teamId || teamId;
		untrack(() => {
			if (!activeTeamId) {
				engine.players = [];
				engine.loading = false;
				return;
			}
			engine.subscribe(activeTeamId);
		});
		return () => engine.detach();
	});
</script>

<div class="ops-panel">
	<h2 class="ops-panel__title">Roster</h2>
	<p class="ops-panel__sub">
		Import CSV below or add one player at a time on
		<a class="ops-link" href="/coach/dashboard">Mission Control</a>.
		Linked players with email appear in the list automatically.
	</p>

	<CoachRosterImportPanel {teamId} />

	{#if engine.loading}
		<p class="ops-muted">Loading roster…</p>
	{:else if engine.err}
		<p class="ops-err" role="alert">{engine.err}</p>
	{:else if engine.players.length === 0}
		<p class="ops-muted">No athletes found on this roster. Ingest using the CSV tool above or manually via Mission Control.</p>
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
	.ops-panel__title { margin: 0; font-size: 15px; font-weight: 800; color: #e2e8f0; }
	.ops-panel__sub { margin: 0; font-size: 12px; color: #94a3b8; max-width: 40rem; }
	.ops-muted { margin: 0; font-size: 13px; color: #64748b; }
	.ops-err { margin: 0; font-size: 12px; color: #f87171; }
	.ops-count { margin: 0; font-size: 12px; font-weight: 700; color: #94a3b8; }
	.ops-roster { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
	.ops-link { color: #14b8a6; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
	.ops-link:hover { color: #14b8a6; }
</style>
