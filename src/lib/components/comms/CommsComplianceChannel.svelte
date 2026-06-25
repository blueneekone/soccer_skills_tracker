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

	let { clubId = '' } = $props();

	type ComplianceMessage = {
		id: string;
		subject: string | null;
		text: string;
		status: string | null;
		incidentId: string | null;
		parentEmail: string | null;
		householdId: string | null;
		createdAt?: { toDate?: () => Date };
		actorRole?: string;
	};

	const role = $derived(authStore.role);
	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const householdId = $derived(
		authStore.userProfile?.householdId ? String(authStore.userProfile.householdId) : '',
	);
	const channelId = $derived(clubId.trim() ? `compliance-${clubId.trim()}` : '');
	const def = COMMS_CHANNEL_TYPE_REGISTRY.compliance;
	const isStaff = $derived(role === 'director' || role === 'registrar' || role === 'admin');

	let items = $state<ComplianceMessage[]>([]);
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
			limit(isStaff ? 50 : 20),
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
						status: typeof x.status === 'string' ? x.status : null,
						incidentId: typeof x.incidentId === 'string' ? x.incidentId : null,
						parentEmail: typeof x.parentEmail === 'string' ? x.parentEmail : null,
						householdId: typeof x.householdId === 'string' ? x.householdId : null,
						createdAt: x.createdAt,
						actorRole: typeof x.actorRole === 'string' ? x.actorRole : undefined,
					};
				});
				loading = false;
			},
			(e) => {
				error = e instanceof Error ? e.message : 'Could not load compliance messages.';
				loading = false;
			},
		);
		return () => unsub();
	});

	function formatDate(ts: ComplianceMessage['createdAt']) {
		if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
		return '—';
	}

	function visibleToParent(m: ComplianceMessage) {
		if (isStaff) return true;
		if (m.parentEmail && m.parentEmail.toLowerCase() === myEmail) return true;
		if (householdId && m.householdId === householdId) return true;
		return false;
	}

	const visibleItems = $derived(isStaff ? items : items.filter(visibleToParent));
</script>

<section class="comms-compliance" aria-labelledby="comms-compliance-heading">
	<header class="comms-compliance__head">
		<h2 id="comms-compliance-heading" class="comms-compliance__title">{def.label}</h2>
		<p class="comms-compliance__sub">{def.description}</p>
	</header>

	{#if isStaff}
		<p class="comms-compliance__staff-note">
			System compliance notices — VPC, clearance, and incident receipts. Full audit export lives in the
			director compliance console (not duplicated here).
		</p>
		<a class="comms-compliance__console-link" href="/director?tab=comms">
			Open compliance console &amp; export →
		</a>
	{:else}
		<p class="comms-compliance__parent-note">
			Household-scoped compliance notices — incident acknowledgements and VPC-related updates for
			your family only.
		</p>
	{/if}

	{#if loading}
		<p class="comms-compliance__muted">Loading compliance stream…</p>
	{:else if error}
		<p class="comms-compliance__err" role="alert">{error}</p>
	{:else if visibleItems.length === 0}
		<p class="comms-compliance__muted">No compliance notices yet.</p>
	{:else}
		<ul class="comms-compliance__list">
			{#each visibleItems as m (m.id)}
				<li class="comms-compliance__card">
					<div class="comms-compliance__meta">
						<span>{formatDate(m.createdAt)}</span>
						{#if m.status}
							<span class="comms-compliance__status">{m.status}</span>
						{/if}
					</div>
					{#if m.subject}
						<h3 class="comms-compliance__subject">{m.subject}</h3>
					{/if}
					<p class="comms-compliance__body">{m.text}</p>
					{#if isStaff && m.incidentId}
						<p class="comms-compliance__ref">Ref: {m.incidentId}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.comms-compliance {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.comms-compliance__head {
		padding-bottom: 8px;
		border-bottom: 1px solid #334155;
	}

	.comms-compliance__title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.comms-compliance__sub,
	.comms-compliance__staff-note,
	.comms-compliance__parent-note,
	.comms-compliance__muted {
		margin: 6px 0 0;
		font-size: 12px;
		color: #94a3b8;
		line-height: 1.45;
	}

	.comms-compliance__console-link {
		display: inline-flex;
		font-size: 12px;
		font-weight: 800;
		color: #14b8a6;
		text-decoration: none;
	}

	.comms-compliance__console-link:hover {
		text-decoration: underline;
	}

	.comms-compliance__err {
		margin: 0;
		font-size: 12px;
		color: #f87171;
	}

	.comms-compliance__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.comms-compliance__card {
		padding: 12px 14px;
		border: 1px solid #334155;
		background: rgba(15, 23, 42, 0.4);
	}

	.comms-compliance__meta {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		font-size: 11px;
		color: #64748b;
		margin-bottom: 6px;
	}

	.comms-compliance__status {
		text-transform: uppercase;
		font-weight: 700;
		color: #fbbf24;
	}

	.comms-compliance__subject {
		margin: 0 0 4px;
		font-size: 13px;
		font-weight: 800;
		color: #e2e8f0;
	}

	.comms-compliance__body {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: #cbd5e1;
		white-space: pre-wrap;
	}

	.comms-compliance__ref {
		margin: 8px 0 0;
		font-size: 10px;
		font-family: ui-monospace, monospace;
		color: #64748b;
	}
</style>
