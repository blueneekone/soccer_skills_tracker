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

	type Announcement = {
		id: string;
		teamId: string;
		fromEmail: string;
		fromRole: string;
		subject: string | null;
		body: string;
		bodyPreview: string;
		recipientCount?: number;
		hasMinors?: boolean;
		createdAt?: { toDate?: () => Date };
	};

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);
	const myEmail = $derived((authStore.user?.email || '').toLowerCase());

	let items = $state<Announcement[]>([]);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		if (!browser || !myEmail || !role) {
			items = [];
			loading = false;
			return;
		}

		const teamId = profile?.teamId ? String(profile.teamId) : '';
		const isStaff = role === 'coach' || role === 'director';

		// Roles without an announcements surface
		if (role === 'super_admin' || role === 'global_admin') {
			items = [];
			loading = false;
			return;
		}

		// Staff and player need a teamId to scope the query
		if ((isStaff || role === 'player') && !teamId) {
			items = [];
			loading = false;
			return;
		}

		loading = true;
		error = '';

		let q;
		if (role === 'player') {
			q = query(
				collection(db, 'team_broadcasts'),
				where('teamId', '==', teamId),
				orderBy('createdAt', 'desc'),
				limit(20),
			);
		} else if (role === 'parent') {
			q = query(
				collection(db, 'team_broadcasts'),
				where('ccParentEmails', 'array-contains', myEmail),
				orderBy('createdAt', 'desc'),
				limit(20),
			);
		} else {
			// coach / director — see what they sent for their own team
			q = query(
				collection(db, 'team_broadcasts'),
				where('teamId', '==', teamId),
				orderBy('createdAt', 'desc'),
				limit(20),
			);
		}

		const unsub = onSnapshot(
			q,
			(snap) => {
				const rows: Announcement[] = [];
				snap.forEach((d) => {
					const x = d.data();
					rows.push({
						id: d.id,
						teamId: String(x.teamId || ''),
						fromEmail: String(x.fromEmail || ''),
						fromRole: String(x.fromRole || ''),
						subject: x.subject ? String(x.subject) : null,
						body: String(x.body || ''),
						bodyPreview: String(x.bodyPreview || ''),
						recipientCount: typeof x.recipientCount === 'number' ? x.recipientCount : undefined,
						hasMinors: x.hasMinors === true,
						createdAt: x.createdAt,
					});
				});
				items = rows;
				loading = false;
			},
			(e) => {
				error = e instanceof Error ? e.message : 'Could not load announcements.';
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

<section class="ann-root" aria-labelledby="ann-heading">
	<header class="ann-head">
		<h3 id="ann-heading" class="ann-title">
			<span class="ann-icon" aria-hidden="true">📣</span> Team Announcements
		</h3>
		<p class="ann-sub">
			{#if role === 'parent'}
				Official staff announcements where your account was CC'd (athlete protection policy).
			{:else if role === 'player'}
				Official announcements from your coaching staff.
			{:else}
				Announcements sent to your team — read-only record.
			{/if}
		</p>
	</header>

	{#if loading}
		<p class="ann-hint">Loading announcements…</p>
	{:else if error}
		<p class="ann-err" role="alert">{error}</p>
	{:else if items.length === 0}
		<p class="ann-hint">No team announcements yet.</p>
	{:else}
		<ul class="ann-list">
			{#each items as ann (ann.id)}
				<li class="ann-card">
					<div class="ann-meta">
						<time class="ann-date">{fmtDate(ann.createdAt)}</time>
						{#if ann.hasMinors}
							<span class="ann-badge ann-badge--minor">Minor · CC policy</span>
						{/if}
						{#if ann.recipientCount !== undefined}
							<span class="ann-badge ann-badge--count">{ann.recipientCount} recipients</span>
						{/if}
					</div>
					{#if ann.subject}
						<p class="ann-subject">{ann.subject}</p>
					{/if}
					<p class="ann-body">{ann.body}</p>
					<p class="ann-from">
						<span class="lbl">From</span>
						{ann.fromEmail}
						<span class="ann-role-tag">{ann.fromRole}</span>
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.ann-root {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border-radius: 16px;
		border: 1px solid rgba(245, 158, 11, 0.35);
		background: rgba(245, 158, 11, 0.04);
	}

	:global(html.dark) .ann-root {
		background: rgba(245, 158, 11, 0.06);
		border-color: rgba(245, 158, 11, 0.25);
	}

	.ann-head {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ann-title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.ann-icon {
		font-size: 16px;
		line-height: 1;
	}

	.ann-sub {
		margin: 0;
		font-size: 12px;
		line-height: 1.45;
		color: var(--text-secondary, #64748b);
	}

	.ann-hint {
		margin: 0;
		font-size: 13px;
		opacity: 0.7;
	}

	.ann-err {
		margin: 0;
		font-size: 12px;
		color: #b91c1c;
	}

	.ann-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--bento-gap-sm, 10px);
	}

	.ann-card {
		padding: var(--bento-pad-sm, 12px);
		border-radius: 14px;
		border: 1px solid rgba(245, 158, 11, 0.22);
		background: rgba(255, 255, 255, 0.05);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	:global(html.dark) .ann-card {
		background: rgba(15, 23, 42, 0.35);
	}

	.ann-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.ann-date {
		font-size: 0.78rem;
		font-weight: 700;
		opacity: 0.85;
	}

	.ann-badge {
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 3px 7px;
		border-radius: 999px;
	}

	.ann-badge--minor {
		background: rgba(251, 191, 36, 0.18);
		color: var(--text-primary, inherit);
		border: 1px solid rgba(251, 191, 36, 0.35);
	}

	.ann-badge--count {
		background: rgba(148, 163, 184, 0.12);
		color: var(--text-secondary, #64748b);
		border: 1px solid rgba(148, 163, 184, 0.22);
	}

	.ann-subject {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 800;
		line-height: 1.3;
	}

	.ann-body {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.ann-from {
		margin: 0;
		font-size: 0.8rem;
		opacity: 0.8;
		display: flex;
		align-items: center;
		gap: 5px;
		flex-wrap: wrap;
	}

	.lbl {
		font-weight: 800;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		opacity: 0.8;
	}

	.ann-role-tag {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		opacity: 0.65;
		padding: 2px 6px;
		border-radius: 999px;
		background: rgba(148, 163, 184, 0.12);
		border: 1px solid rgba(148, 163, 184, 0.2);
	}
</style>
