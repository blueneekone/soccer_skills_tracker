<script>
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

	let { clubId = '' } = $props();

	let rows = $state(/** @type {Array<{ id: string; title?: string; startsAt?: unknown; kind?: string }>} */ ([]));
	let err = $state(/** @type {string | null} */ (null));
	let loading = $state(true);

	$effect(() => {
		if (!browser || !clubId) {
			loading = false;
			rows = [];
			return;
		}
		loading = true;
		err = null;
		const q = query(
			collection(db, 'deployment_calendar_entries'),
			where('clubId', '==', clubId),
			orderBy('startsAt', 'desc')
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
				loading = false;
			},
			(e) => {
				console.warn('[DeploymentCalendarPanel]', e);
				err =
					e && typeof (/** @type {*} */ (e)).code === 'string' ?
						String(/** @type {*} */ (e).message || e)
						: 'Could not load deployment calendar.';
				loading = false;
				rows = [];
			}
		);
		return () => unsub();
	});

	function formatStart(raw) {
		if (!raw) return '—';
		try {
			if (raw?.toDate && typeof raw.toDate === 'function') {
				return raw.toDate().toLocaleString();
			}
			if (typeof raw === 'object' && 'seconds' in raw) {
				const s = /** @type {{ seconds: number }} */ (raw).seconds;
				return new Date(s * 1000).toLocaleString();
			}
		} catch {
			/* ignore */
		}
		return String(raw);
	}
</script>

<section
	class="tw-rounded-xl tw-border tw-p-4 tw-mb-4"
	style="border-color: rgba(15, 23, 42, 0.12); background: rgba(15, 23, 42, 0.03);"
	aria-labelledby="dep-cal-heading"
>
	<h4
		id="dep-cal-heading"
		class="tw-m-0 tw-mb-1 tw-text-sm tw-font-extrabold tw-tracking-tight"
		style="color: var(--text-primary);"
	>
		Deployment calendar
	</h4>
	<p class="tw-m-0 tw-mb-3 tw-text-xs" style="color: var(--text-secondary);">
		Epic 5.3 scaffold — practice and match deployments (see
		<code class="tw-text-[11px]">docs/DEPLOYMENT_CALENDAR_SCHEMA.md</code>). Server writes via callables TBD.
	</p>

	{#if !clubId}
		<p class="tw-m-0 tw-text-xs" style="color: var(--danger-red);">No club scope.</p>
	{:else if loading}
		<p class="tw-m-0 tw-text-sm" style="color: var(--text-secondary);">Loading…</p>
	{:else if err}
		<p class="tw-m-0 tw-text-sm" style="color: var(--danger-red);">{err}</p>
		<p class="tw-mt-2 tw-m-0 tw-text-xs" style="color: var(--text-secondary);">
			Empty state is expected until indexes and seed data exist.
		</p>
	{:else if rows.length === 0}
		<div
			class="tw-rounded-lg tw-border tw-dashed tw-border-slate-300 tw-bg-slate-50/80 tw-px-4 tw-py-8 tw-text-center"
		>
			<p class="tw-m-0 tw-text-sm tw-font-semibold" style="color: var(--text-primary);">
				No deployment windows yet
			</p>
			<p class="tw-mt-1 tw-m-0 tw-text-xs" style="color: var(--text-secondary);">
				Entries will appear here from <code>deployment_calendar_entries</code> when ops starts logging
				matches and practices.
			</p>
		</div>
	{:else}
		<ul class="tw-m-0 tw-list-none tw-divide-y tw-divide-[rgba(0,240,255,0.1)] tw-rounded-lg tw-border tw-border-[rgba(0,240,255,0.2)] tw-bg-vanguard-bg/80">
			{#each rows as row (row.id)}
				<li class="tw-px-3 tw-py-2">
					<p class="tw-m-0 tw-text-sm tw-font-bold tw-text-gray-200">
						{typeof row.title === 'string' ? row.title : 'Event'}
					</p>
					<p class="tw-m-0 tw-text-xs tw-text-gray-500">
						{formatStart(row.startsAt)}
						{#if row.kind}
							· {row.kind}
						{/if}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>
