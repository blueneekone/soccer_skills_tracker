<script lang="ts">
	import { browser } from '$app/environment';
	import {
		collection,
		limit,
		onSnapshot,
		orderBy,
		query,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { COMMS_CHANNEL_TYPE_REGISTRY } from '$lib/comms/channelTypes.js';

	let { clubId = '', teamId = '' } = $props();

	type MatchMessage = {
		id: string;
		subject: string | null;
		text: string;
		createdAt?: { toDate?: () => Date };
	};

	const channelId = $derived(teamId.trim() ? `match-day-${teamId.trim()}` : '');
	const def = COMMS_CHANNEL_TYPE_REGISTRY.match_day;

	let items = $state<MatchMessage[]>([]);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		if (!browser || !clubId.trim() || !channelId) {
			items = [];
			loading = false;
			return;
		}

		loading = true;
		error = '';
		const qy = query(
			collection(db, 'clubs', clubId.trim(), 'channels', channelId, 'messages'),
			orderBy('createdAt', 'desc'),
			limit(20),
		);
		const unsub = onSnapshot(
			qy,
			(snap) => {
				items = snap.docs.map((d) => {
					const x = d.data();
					return {
						id: d.id,
						subject: typeof x.subject === 'string' ? x.subject : null,
						text: String(x.text || x.body || ''),
						createdAt: x.createdAt,
					};
				});
				loading = false;
			},
			(e) => {
				error = e instanceof Error ? e.message : 'Could not load match day messages.';
				loading = false;
			},
		);
		return () => unsub();
	});

	function formatDate(ts: MatchMessage['createdAt']) {
		if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
		return '—';
	}
</script>

<section class="comms-match" aria-labelledby="comms-match-heading">
	<header class="comms-match__head">
		<h2 id="comms-match-heading" class="comms-match__title">
			{def.label}
			<span class="comms-match__badge">Gameday</span>
		</h2>
		<p class="comms-match__sub">{def.description}</p>
	</header>

	{#if !teamId}
		<p class="comms-match__muted">Link a team to view match-day notes.</p>
	{:else if loading}
		<p class="comms-match__muted">Loading match day stream…</p>
	{:else if error}
		<p class="comms-match__muted">{error}</p>
	{:else if items.length === 0}
		<p class="comms-match__muted">
			No match-day posts yet. Coaches can also post in Team logistics → Game Day.
		</p>
	{:else}
		<ul class="comms-match__list">
			{#each items as m (m.id)}
				<li class="comms-match__card">
					<div class="comms-match__meta">{formatDate(m.createdAt)}</div>
					{#if m.subject}
						<h3 class="comms-match__subject">{m.subject}</h3>
					{/if}
					<p class="comms-match__body">{m.text}</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.comms-match {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.comms-match__head {
		padding-bottom: 8px;
		border-bottom: 1px solid #334155;
	}

	.comms-match__title {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 15px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.comms-match__badge {
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 2px 8px;
		border: 1px solid #fbbf24;
		color: #fbbf24;
	}

	.comms-match__sub,
	.comms-match__muted {
		margin: 6px 0 0;
		font-size: 12px;
		color: #94a3b8;
		line-height: 1.45;
	}

	.comms-match__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.comms-match__card {
		padding: 12px 14px;
		border: 1px solid #334155;
		background: rgba(15, 23, 42, 0.4);
	}

	.comms-match__meta {
		font-size: 11px;
		color: #64748b;
		margin-bottom: 6px;
	}

	.comms-match__subject {
		margin: 0 0 4px;
		font-size: 13px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.comms-match__body {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: #cbd5e1;
		white-space: pre-wrap;
	}
</style>
