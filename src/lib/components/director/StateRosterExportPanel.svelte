<script lang="ts">
	import { browser } from '$app/environment';
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { clubId = '' } = $props();

	let teamId = $state('');
	let busy = $state(false);
	let err = $state('');
	let ok = $state('');

	const exportStateRoster = httpsCallable(functions, 'exportStateRoster');

	const clubTeams = $derived(
		teamsStore.teams
			.filter((t) => t.clubId === clubId)
			.map((t) => ({ id: t.id, name: t.name }))
			.sort((a, b) => a.name.localeCompare(b.name)),
	);

	$effect(() => {
		if (!clubId) teamId = '';
	});

	function downloadCsv(csv: string, filename: string) {
		if (!browser) return;
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename || 'state-roster.csv';
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function runExport() {
		if (!clubId.trim() || busy) return;
		err = '';
		ok = '';
		busy = true;
		try {
			const res = await exportStateRoster({
				clubId: clubId.trim(),
				...(teamId.trim() ? { teamId: teamId.trim() } : {}),
			});
			const data = res.data as {
				csv?: string;
				filename?: string;
				rowCount?: number;
			};
			const csv = typeof data.csv === 'string' ? data.csv : '';
			if (!csv) {
				err = 'Export returned no data.';
				return;
			}
			downloadCsv(csv, data.filename || 'state-roster.csv');
			const count = typeof data.rowCount === 'number' ? data.rowCount : 0;
			ok =
				count === 0
					? 'Export complete — no linked players on file for this scope.'
					: `Export complete — ${count} player${count === 1 ? '' : 's'} downloaded.`;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not export state roster.';
		} finally {
			busy = false;
		}
	}
</script>

<section class="sre-panel" aria-labelledby="sre-panel-title">
	<header class="sre-panel__head">
		<h3 id="sre-panel-title" class="sre-panel__title">
			<Icon name={'action.download' as IconName} size={18} aria-hidden="true" />
			State roster export (CSV v1)
		</h3>
		<p class="sre-panel__sub">
			Download linked players from <code>player_lookup</code> with household guardian fields for
			state association / NGB filing. Name-only roster rows without accounts are excluded.
		</p>
	</header>

	<div class="sre-panel__controls">
		<label class="sre-panel__field">
			<span class="sre-panel__label">Scope</span>
			<select class="sre-panel__select" bind:value={teamId} disabled={!clubId || busy}>
				<option value="">All teams in club</option>
				{#each clubTeams as team (team.id)}
					<option value={team.id}>{team.name}</option>
				{/each}
			</select>
		</label>

		<button
			type="button"
			class="sre-panel__btn"
			disabled={!clubId || busy}
			onclick={() => void runExport()}
		>
			{busy ? 'Exporting…' : 'Download CSV'}
		</button>
	</div>

	{#if err}<p class="sre-panel__err" role="alert">{err}</p>{/if}
	{#if ok}<p class="sre-panel__ok" role="status">{ok}</p>{/if}
</section>

<style>
	.sre-panel {
		margin-bottom: 1rem;
		padding: 1rem 1.1rem;
		border: 1px solid #334155;
		border-radius: 12px;
		background: #0f172a;
	}

	.sre-panel__head {
		margin-bottom: 0.85rem;
	}

	.sre-panel__title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0 0 0.35rem;
		font-size: 1rem;
		font-weight: 700;
		color: #f8fafc;
	}

	.sre-panel__sub {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.45;
		color: #94a3b8;
	}

	.sre-panel__sub code {
		font-size: 0.78rem;
		color: #cbd5e1;
	}

	.sre-panel__controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: flex-end;
	}

	.sre-panel__field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 220px;
		flex: 1;
	}

	.sre-panel__label {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
	}

	.sre-panel__select {
		padding: 0.55rem 0.65rem;
		border: 1px solid #334155;
		border-radius: 8px;
		background: #020617;
		color: #e2e8f0;
		font-size: 0.88rem;
	}

	.sre-panel__btn {
		padding: 0.55rem 1rem;
		border: 1px solid rgba(251, 191, 36, 0.35);
		border-radius: 8px;
		background: rgba(251, 191, 36, 0.08);
		color: #fbbf24;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		cursor: pointer;
	}

	.sre-panel__btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.sre-panel__err {
		margin: 0.65rem 0 0;
		font-size: 0.82rem;
		color: #f87171;
	}

	.sre-panel__ok {
		margin: 0.65rem 0 0;
		font-size: 0.82rem;
		color: #34d399;
	}
</style>
