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
	import type { DeliveryReport } from '$lib/services/comms.svelte.js';

	type OutboxRow = {
		id: string;
		teamId: string;
		subject: string | null;
		bodyPreview: string;
		createdAt?: { toDate?: () => Date };
		deliveryReport?: DeliveryReport;
		parentDeliveredCount?: number;
		parentSkippedCount?: number;
		recipientCount?: number;
	};

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);
	const myEmail = $derived((authStore.user?.email || '').toLowerCase());
	const teamId = $derived(profile?.teamId ? String(profile.teamId) : '');
	const clubId = $derived(profile?.clubId ? String(profile.clubId) : '');

	const isStaff = $derived(
		role === 'coach' || role === 'director' || role === 'registrar' || role === 'admin',
	);

	let items = $state<OutboxRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		if (!browser || !isStaff || !myEmail) {
			items = [];
			loading = false;
			return;
		}

		loading = true;
		error = '';

		let q;
		if (role === 'director' && clubId) {
			q = query(
				collection(db, 'team_broadcasts'),
				where('teamClubId', '==', clubId),
				orderBy('createdAt', 'desc'),
				limit(30),
			);
		} else if (teamId && teamId !== 'admin') {
			q = query(
				collection(db, 'team_broadcasts'),
				where('teamId', '==', teamId),
				orderBy('createdAt', 'desc'),
				limit(30),
			);
		} else {
			items = [];
			loading = false;
			return;
		}

		const unsub = onSnapshot(
			q,
			(snap) => {
				const rows: OutboxRow[] = [];
				snap.forEach((d) => {
					const x = d.data();
					if (role === 'coach' && String(x.fromEmail || '').toLowerCase() !== myEmail) return;
					const dr = x.deliveryReport as DeliveryReport | undefined;
					rows.push({
						id: d.id,
						teamId: String(x.teamId || ''),
						subject: x.subject ? String(x.subject) : null,
						bodyPreview: String(x.bodyPreview || x.body || ''),
						createdAt: x.createdAt,
						deliveryReport: dr,
						parentDeliveredCount: dr?.parentDelivered?.length,
						parentSkippedCount: dr?.parentSkipped?.length,
						recipientCount: typeof x.recipientCount === 'number' ? x.recipientCount : undefined,
					});
				});
				items = rows;
				loading = false;
			},
			(e) => {
				error = e instanceof Error ? e.message : 'Could not load outbox.';
				loading = false;
			},
		);

		return () => unsub();
	});

	function fmtDate(ts?: { toDate?: () => Date }) {
		if (!ts || typeof ts.toDate !== 'function') return '—';
		try {
			return ts.toDate().toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
			});
		} catch {
			return '—';
		}
	}
</script>

<section class="outbox-root" aria-labelledby="outbox-heading">
	<header class="outbox-head">
		<h3 id="outbox-heading" class="outbox-title">Outbox</h3>
		<p class="outbox-sub">Sent team announcements — delivery receipts are immutable.</p>
	</header>

	{#if loading}
		<p class="outbox-hint">Loading sent announcements…</p>
	{:else if error}
		<p class="outbox-err" role="alert">{error}</p>
	{:else if items.length === 0}
		<p class="outbox-hint">No sent announcements yet.</p>
	{:else}
		<ul class="outbox-list">
			{#each items as row (row.id)}
				<li class="outbox-card">
					<div class="outbox-meta">
						<time>{fmtDate(row.createdAt)}</time>
						{#if row.teamId}
							<span class="outbox-team qa-mono">{row.teamId}</span>
						{/if}
					</div>
					{#if row.subject}
						<p class="outbox-subject">{row.subject}</p>
					{/if}
					<p class="outbox-preview">{row.bodyPreview}</p>
					<p class="outbox-delivery">
						{#if row.deliveryReport}
							{row.deliveryReport.parentDelivered?.length ?? 0} parents delivered
							{#if (row.deliveryReport.parentSkipped?.length ?? 0) > 0}
								· {row.deliveryReport.parentSkipped?.length} skipped
							{/if}
						{:else if row.recipientCount !== undefined}
							Legacy send — {row.recipientCount} roster athletes
						{/if}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.outbox-root {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}

	.outbox-title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		color: var(--text-primary, #e2e8f0);
	}

	.outbox-sub,
	.outbox-hint {
		margin: 4px 0 0;
		font-size: 12px;
		color: #94a3b8;
	}

	.outbox-err {
		margin: 0;
		font-size: 12px;
		color: #fca5a5;
	}

	.outbox-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.outbox-card {
		padding: 12px 14px;
		border: 1px solid #334155;
		background: rgba(15, 23, 42, 0.6);
	}

	.outbox-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 11px;
		color: #94a3b8;
	}

	.outbox-team {
		font-size: 10px;
	}

	.outbox-subject {
		margin: 6px 0 0;
		font-weight: 700;
		font-size: 13px;
		color: #e2e8f0;
	}

	.outbox-preview {
		margin: 4px 0 0;
		font-size: 12px;
		color: #cbd5e1;
	}

	.outbox-delivery {
		margin: 8px 0 0;
		font-size: 11px;
		font-weight: 600;
		color: #14b8a6;
	}

	.qa-mono {
		font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;
	}
</style>
