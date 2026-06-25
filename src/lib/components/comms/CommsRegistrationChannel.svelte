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
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { COMMS_CHANNEL_TYPE_REGISTRY } from '$lib/comms/channelTypes.js';

	let { clubId = '', householdId = '' } = $props();

	type SystemMessage = {
		id: string;
		subject: string | null;
		text: string;
		createdAt?: { toDate?: () => Date };
		actorRole?: string;
	};

	const role = $derived(authStore.role);
	const hid = $derived(
		householdId || (authStore.userProfile?.householdId ? String(authStore.userProfile.householdId) : ''),
	);
	const channelId = $derived(hid ? `registration-${hid}` : '');
	const def = COMMS_CHANNEL_TYPE_REGISTRY.registration;

	let items = $state<SystemMessage[]>([]);
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
			limit(30),
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
						actorRole: typeof x.actorRole === 'string' ? x.actorRole : undefined,
					};
				});
				loading = false;
			},
			(e) => {
				error = e instanceof Error ? e.message : 'Could not load registration messages.';
				loading = false;
			},
		);
		return () => unsub();
	});

	function formatDate(ts: SystemMessage['createdAt']) {
		if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
		return '—';
	}
</script>

<section class="comms-reg" aria-labelledby="comms-reg-heading">
	<header class="comms-reg__head">
		<h2 id="comms-reg-heading" class="comms-reg__title">{def.label}</h2>
		<p class="comms-reg__sub">{def.description}</p>
	</header>

	{#if role === 'registrar' || role === 'director'}
		<p class="comms-reg__staff-note">System posts only in v1 — use director registration panels to trigger updates.</p>
	{/if}

	{#if loading}
		<p class="comms-reg__muted">Loading registration updates…</p>
	{:else if error}
		<p class="comms-reg__muted">{error}</p>
	{:else if items.length === 0}
		<div class="comms-reg__empty">
			<p>No registration messages yet.</p>
			<p>
				Payment and assignment updates appear here. Manage fees on
				<a href="/parent/payments">/parent/payments</a>
				or ask your registrar for status.
			</p>
		</div>
	{:else}
		<ul class="comms-reg__list">
			{#each items as m (m.id)}
				<li class="comms-reg__card">
					<div class="comms-reg__meta">
						<span>{formatDate(m.createdAt)}</span>
						{#if m.actorRole}
							<span class="comms-reg__role">{m.actorRole}</span>
						{/if}
					</div>
					{#if m.subject}
						<h3 class="comms-reg__subject">{m.subject}</h3>
					{/if}
					<p class="comms-reg__body">{m.text}</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.comms-reg {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.comms-reg__head {
		padding-bottom: 8px;
		border-bottom: 1px solid #334155;
	}

	.comms-reg__title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.comms-reg__sub,
	.comms-reg__staff-note,
	.comms-reg__muted {
		margin: 6px 0 0;
		font-size: 12px;
		color: #94a3b8;
		line-height: 1.45;
	}

	.comms-reg__empty {
		padding: 16px;
		border: 1px dashed #334155;
		font-size: 13px;
		color: #94a3b8;
	}

	.comms-reg__empty a {
		color: #14b8a6;
	}

	.comms-reg__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.comms-reg__card {
		padding: 12px 14px;
		border: 1px solid #334155;
		background: rgba(15, 23, 42, 0.4);
	}

	.comms-reg__meta {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		font-size: 11px;
		color: #64748b;
		margin-bottom: 6px;
	}

	.comms-reg__role {
		text-transform: uppercase;
		font-weight: 700;
	}

	.comms-reg__subject {
		margin: 0 0 4px;
		font-size: 13px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.comms-reg__body {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: #cbd5e1;
		white-space: pre-wrap;
	}
</style>
