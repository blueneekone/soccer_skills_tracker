<script lang="ts">
	import { browser } from '$app/environment';
	import {
		collection,
		getDocs,
		limit,
		orderBy,
		query,
		where,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const myEmail = $derived((authStore.user?.email || '').toLowerCase());

	type AnnRow = {
		id: string;
		subject: string | null;
		bodyPreview: string;
		fromEmail: string;
		createdAt?: { toDate?: () => Date };
	};

	let items = $state<AnnRow[]>([]);
	let loading = $state(true);

	$effect(() => {
		if (!browser || !myEmail) {
			items = [];
			loading = false;
			return;
		}

		let cancelled = false;
		loading = true;

		(async () => {
			try {
				const seen = new Set<string>();
				const rows: AnnRow[] = [];

				const mergeSnap = (snap: { forEach: (fn: (d: { id: string; data: () => Record<string, unknown> }) => void) => void }) => {
					snap.forEach((d) => {
						if (seen.has(d.id)) return;
						seen.add(d.id);
						const x = d.data();
						rows.push({
							id: d.id,
							subject: x.subject ? String(x.subject) : null,
							bodyPreview: String(x.bodyPreview || x.body || ''),
							fromEmail: String(x.fromEmail || ''),
							createdAt: x.createdAt as AnnRow['createdAt'],
						});
					});
				};

				const qNew = query(
					collection(db, 'team_broadcasts'),
					where('parentRecipientEmails', 'array-contains', myEmail),
					orderBy('createdAt', 'desc'),
					limit(3),
				);
				try {
					mergeSnap(await getDocs(qNew));
				} catch {
					/* index may be deploying — fall through to legacy */
				}

				if (rows.length < 3) {
					const qLegacy = query(
						collection(db, 'team_broadcasts'),
						where('ccParentEmails', 'array-contains', myEmail),
						orderBy('createdAt', 'desc'),
						limit(3),
					);
					mergeSnap(await getDocs(qLegacy));
				}

				rows.sort((a, b) => {
					const at = a.createdAt?.toDate?.()?.getTime() ?? 0;
					const bt = b.createdAt?.toDate?.()?.getTime() ?? 0;
					return bt - at;
				});

				if (!cancelled) items = rows.slice(0, 3);
			} catch (e) {
				console.error('[ParentLatestAnnouncements]', e);
				if (!cancelled) items = [];
			} finally {
				if (!cancelled) loading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	function fmtDate(ts?: { toDate?: () => Date }) {
		if (!ts || typeof ts.toDate !== 'function') return '';
		try {
			return ts.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		} catch {
			return '';
		}
	}
</script>

<section class="parent-ann-strip parent-lounge-z2-panel" aria-labelledby="parent-ann-strip-heading">
	<div class="parent-ann-strip__head">
		<p class="parent-lounge-eyebrow">Comms</p>
		<h2 id="parent-ann-strip-heading" class="parent-lounge-page-title tw-text-sm">
			Latest announcements
		</h2>
	</div>

	{#if loading}
		<p class="parent-lounge-meta">Loading…</p>
	{:else if items.length === 0}
		<p class="parent-lounge-meta">No announcements yet.</p>
	{:else}
		<ul class="parent-ann-strip__list">
			{#each items as ann (ann.id)}
				<li class="parent-ann-strip__item">
					{#if ann.subject}
						<p class="parent-ann-strip__subject">{ann.subject}</p>
					{/if}
					<p class="parent-ann-strip__preview">{ann.bodyPreview}</p>
					<p class="parent-lounge-meta">
						{fmtDate(ann.createdAt)} · {ann.fromEmail}
					</p>
				</li>
			{/each}
		</ul>
	{/if}

	<a class="parent-ann-strip__link" href="/messages?channel=announcements">View all announcements →</a>
</section>

<style>
	.parent-ann-strip {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 1rem 1.1rem;
	}

	.parent-ann-strip__head {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.parent-ann-strip__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.parent-ann-strip__item {
		padding-bottom: 10px;
		border-bottom: 1px solid rgba(148, 163, 184, 0.25);
	}

	.parent-ann-strip__subject {
		margin: 0;
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary, #0f172a);
	}

	.parent-ann-strip__preview {
		margin: 4px 0 0;
		font-size: 12px;
		color: #475569;
		line-height: 1.4;
	}

	.parent-ann-strip__link {
		font-size: 12px;
		font-weight: 700;
		color: #0f766e;
		text-decoration: none;
	}

	.parent-ann-strip__link:hover {
		text-decoration: underline;
	}
</style>
