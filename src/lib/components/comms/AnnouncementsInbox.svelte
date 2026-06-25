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
			const seen = new Set<string>();
			const rows: Announcement[] = [];

			const publish = () => {
				rows.sort((a, b) => {
					const at = a.createdAt?.toDate?.()?.getTime() ?? 0;
					const bt = b.createdAt?.toDate?.()?.getTime() ?? 0;
					return bt - at;
				});
				items = rows.slice(0, 20);
				loading = false;
			};

			const mergeRows = (
				snap: { forEach: (fn: (d: { id: string; data: () => Record<string, unknown> }) => void) => void },
			) => {
				snap.forEach((d) => {
					if (seen.has(d.id)) return;
					seen.add(d.id);
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
						createdAt: x.createdAt as Announcement['createdAt'],
					});
				});
				publish();
			};

			const qPrimary = query(
				collection(db, 'team_broadcasts'),
				where('parentRecipientEmails', 'array-contains', myEmail),
				orderBy('createdAt', 'desc'),
				limit(20),
			);
			const qLegacy = query(
				collection(db, 'team_broadcasts'),
				where('ccParentEmails', 'array-contains', myEmail),
				orderBy('createdAt', 'desc'),
				limit(20),
			);

			const unsubPrimary = onSnapshot(qPrimary, mergeRows, () => {
				/* legacy query still runs in parallel */
			});
			const unsubLegacy = onSnapshot(
				qLegacy,
				mergeRows,
				(e) => {
					error = e instanceof Error ? e.message : 'Could not load announcements.';
					loading = false;
				},
			);

			return () => {
				unsubPrimary();
				unsubLegacy();
			};
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
				Official staff announcements delivered to your guardian account.
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
