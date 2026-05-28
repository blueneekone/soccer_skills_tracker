<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import {
		collection,
		limit,
		onSnapshot,
		query,
		type Unsubscribe,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { getLoadoutCatalog } from '$lib/gamification/loadoutSchema.js';
	import { replayLoadoutUnlockCeremony } from '$lib/services/loadoutUnlocks.svelte.js';

	let { playerEmail = '' } = $props();

	type UnlockRow = {
		id: string;
		cosmeticId: string;
		source: string;
		grantedAtLabel: string;
	};

	let rows = $state<UnlockRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	const catalogById = $derived(new Map(getLoadoutCatalog().map((row) => [row.id, row])));

	/** @type {Unsubscribe | null} */
	let unsub = null;

	$effect(() => {
		if (!browser) return;
		const email = playerEmail.trim().toLowerCase();
		if (unsub) {
			unsub();
			unsub = null;
		}
		if (!email) {
			rows = [];
			loading = false;
			return;
		}

		loading = true;
		error = '';

		const q = query(collection(db, 'users', email, 'cosmetic_unlocks'), limit(20));
		unsub = onSnapshot(
			q,
			(snap) => {
				rows = snap.docs
					.map((docSnap) => {
						const d = docSnap.data();
						const cosmeticId = typeof d.cosmeticId === 'string' ? d.cosmeticId : docSnap.id;
						const source = typeof d.source === 'string' ? d.source : 'unlock';
						const grantedAt = d.grantedAt;
						let grantedAtMs = 0;
						let grantedAtLabel = '—';
						if (grantedAt && typeof grantedAt.toDate === 'function') {
							const dt = grantedAt.toDate();
							grantedAtMs = dt.getTime();
							grantedAtLabel = dt.toLocaleDateString();
						}
						return { id: docSnap.id, cosmeticId, source, grantedAtLabel, grantedAtMs };
					})
					.sort((a, b) => b.grantedAtMs - a.grantedAtMs)
					.map(({ grantedAtMs: _ms, ...row }) => row);
				loading = false;
			},
			(err) => {
				console.warn('[OperativeCeremoniesPanel] cosmetic_unlocks listener', err);
				error = 'Unlock history unavailable.';
				loading = false;
			},
		);

		return () => {
			if (unsub) unsub();
			unsub = null;
		};
	});

	function labelFor(id: string): string {
		return catalogById.get(id)?.label ?? id.replace(/_/g, ' ');
	}
</script>

<section class="ocp-root player-dossier-root" aria-labelledby="ceremonies-heading">
	<header class="ocp-header">
		<p id="ceremonies-heading" class="ocp-eyebrow">Unlock ceremonies</p>
		<h2 class="ocp-title">Earned gear history</h2>
		<p class="ocp-sub">
			Replay celebration modals for gear you already own. Replays never grant items twice.
		</p>
	</header>

	{#if loading}
		<p class="ocp-status" role="status">Loading unlock history…</p>
	{:else if error}
		<p class="ocp-status" role="alert">{error}</p>
	{:else if rows.length === 0}
		<div class="pd-empty-state pd-empty-state--compact ocp-empty" role="status">
			<div class="pd-empty-state__icon" aria-hidden="true"></div>
			<div class="pd-empty-state__copy">
				<p class="pd-empty-state__title">No ceremonies yet</p>
				<p class="pd-empty-state__lede">
					Complete missions to unlock ceremony replays — or visit
					<a href={resolve('/player/armory')} class="ocp-empty__link">Armory studio</a>
					after your next unlock.
				</p>
			</div>
		</div>
	{:else}
		<ul class="ocp-list">
			{#each rows as row (row.id)}
				<li class="ocp-row pd-glass-panel">
					<div class="ocp-row__meta">
						<p class="ocp-row__title">{labelFor(row.cosmeticId)}</p>
						<p class="ocp-row__sub">
							<span class="ocp-mono">{row.source.replace(/_/g, ' ')}</span>
							<span aria-hidden="true"> · </span>
							<span>{row.grantedAtLabel}</span>
						</p>
					</div>
					<button
						type="button"
						class="ocp-replay"
						onclick={() => replayLoadoutUnlockCeremony(row.cosmeticId)}
					>
						Replay
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.ocp-root {
		color: var(--pd-text, #f4f4f5);
	}

	.ocp-header {
		margin-bottom: 1rem;
	}

	.ocp-eyebrow {
		margin: 0 0 0.25rem;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 75%, #fff);
	}

	.ocp-title {
		margin: 0 0 0.35rem;
		font-size: 1.1rem;
		font-weight: 900;
	}

	.ocp-sub {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.55);
	}

	.ocp-status {
		margin: 0;
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.ocp-empty {
		margin: 0;
		align-items: flex-start;
	}

	.ocp-empty__link {
		color: var(--pd-accent-data, #14b8a6);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.ocp-empty__link:hover {
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 85%, #fff);
	}

	.ocp-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.ocp-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.85rem 0.95rem;
		border-radius: 0.5rem;
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
	}

	.ocp-row__title {
		margin: 0 0 0.2rem;
		font-size: 0.88rem;
		font-weight: 800;
	}

	.ocp-row__sub {
		margin: 0;
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.ocp-mono {
		font-family: ui-monospace, Menlo, Consolas, monospace;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.ocp-replay {
		flex-shrink: 0;
		padding: 0.5rem 0.75rem;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		border: 1px solid color-mix(in srgb, var(--pd-accent-data, #14b8a6) 45%, #fff);
		border-radius: 0.25rem;
		background: rgba(0, 0, 0, 0.35);
		color: #ecfeff;
		cursor: pointer;
	}
</style>
