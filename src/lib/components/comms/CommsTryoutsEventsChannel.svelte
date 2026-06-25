<script lang="ts">
	import { browser } from '$app/environment';
	import {
		collection,
		limit,
		onSnapshot,
		orderBy,
		query,
		where,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { COMMS_CHANNEL_TYPE_REGISTRY } from '$lib/comms/channelTypes.js';

	let { clubId = '', programId = '', householdId = '' } = $props();

	type TryoutMessage = {
		id: string;
		subject: string | null;
		text: string;
		createdAt?: { toDate?: () => Date };
	};

	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const hid = $derived(
		householdId || (authStore.userProfile?.householdId ? String(authStore.userProfile.householdId) : ''),
	);
	const channelId = $derived(programId.trim() ? `tryouts-events-${programId.trim()}` : '');
	const def = COMMS_CHANNEL_TYPE_REGISTRY.tryouts_events;

	let items = $state<TryoutMessage[]>([]);
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

		const col = collection(db, 'clubs', clubId.trim(), 'channels', channelId, 'messages');
		const qy =
			hid
				? query(col, where('householdId', '==', hid), orderBy('createdAt', 'desc'), limit(30))
				: myEmail
					? query(col, where('guardianEmail', '==', myEmail), orderBy('createdAt', 'desc'), limit(30))
					: query(col, orderBy('createdAt', 'desc'), limit(30));

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
				error = e instanceof Error ? e.message : 'Could not load tryout messages.';
				loading = false;
			},
		);
		return () => unsub();
	});

	function formatDate(ts: TryoutMessage['createdAt']) {
		if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
		return '—';
	}
</script>

<section class="comms-tryouts" aria-labelledby="comms-tryouts-heading">
	<header class="comms-tryouts__head">
		<h2 id="comms-tryouts-heading" class="comms-tryouts__title">{def.label}</h2>
		<p class="comms-tryouts__sub">{def.description}</p>
	</header>

	{#if !programId}
		<p class="comms-tryouts__muted">
			Register for a tryout program to see eval and schedule updates here.
		</p>
	{:else if loading}
		<p class="comms-tryouts__muted">Loading tryout updates…</p>
	{:else if error}
		<p class="comms-tryouts__muted">{error}</p>
	{:else if items.length === 0}
		<p class="comms-tryouts__muted">No tryout messages for your household yet.</p>
	{:else}
		<ul class="comms-tryouts__list">
			{#each items as m (m.id)}
				<li class="comms-tryouts__card">
					<div class="comms-tryouts__meta">{formatDate(m.createdAt)}</div>
					{#if m.subject}
						<h3 class="comms-tryouts__subject">{m.subject}</h3>
					{/if}
					<p class="comms-tryouts__body">{m.text}</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.comms-tryouts {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.comms-tryouts__head {
		padding-bottom: 8px;
		border-bottom: 1px solid #334155;
	}

	.comms-tryouts__title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.comms-tryouts__sub,
	.comms-tryouts__muted {
		margin: 6px 0 0;
		font-size: 12px;
		color: #94a3b8;
		line-height: 1.45;
	}

	.comms-tryouts__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.comms-tryouts__card {
		padding: 12px 14px;
		border: 1px solid #334155;
		background: rgba(15, 23, 42, 0.4);
	}

	.comms-tryouts__meta {
		font-size: 11px;
		color: #64748b;
		margin-bottom: 6px;
	}

	.comms-tryouts__subject {
		margin: 0 0 4px;
		font-size: 13px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.comms-tryouts__body {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: #cbd5e1;
		white-space: pre-wrap;
	}
</style>
