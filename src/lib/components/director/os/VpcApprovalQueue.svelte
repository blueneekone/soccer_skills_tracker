<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import {
		collection,
		query,
		where,
		orderBy,
		limit,
		getDocs,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	/** @type {{ clubId?: string }} */
	let { clubId = '' } = $props();

	/** @type {Array<{ id: string; subjectEmail: string; parentEmail: string; method: string; grantedAt: unknown }>} */
	let records = $state([]);
	let loading = $state(true);
	let loadError = $state('');

	$effect(() => {
		if (!browser || !clubId) {
			records = [];
			loading = false;
			return;
		}
		let cancelled = false;
		loading = true;
		loadError = '';

		(async () => {
			try {
				if (!db || !authStore.isAuthenticated) return;
				const q = query(
					collection(db, 'consent_records'),
					where('clubId', '==', clubId),
					orderBy('grantedAt', 'desc'),
					limit(25),
				);
				const snap = await getDocs(q);
				if (cancelled) return;
				records = snap.docs.map((d) => {
					const data = d.data();
					return {
						id: d.id,
						subjectEmail: String(data.subjectEmail || ''),
						parentEmail: String(data.parentEmail || ''),
						method: String(data.method || ''),
						grantedAt: data.grantedAt || null,
					};
				});
			} catch (e) {
				if (!cancelled) {
					loadError = e instanceof Error ? e.message : String(e);
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	/** @param {unknown} ts */
	function formatDate(ts) {
		if (!ts) return '';
		try {
			const d = typeof (/** @type {{ toDate?: () => Date }} */ (ts).toDate) === 'function'
				? /** @type {{ toDate: () => Date }} */ (ts).toDate()
				: new Date(/** @type {string | number | Date} */ (ts));
			return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		} catch {
			return '';
		}
	}
</script>

<section
	class="vanguard-surface tw-relative tw-overflow-hidden tw-p-5"
	aria-labelledby="vaq-h"
>
	<header class="tw-mb-4 tw-flex tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-[#14b8a6]/15 tw-pb-3">
		<div class="tw-min-w-0">
			<p class="tw-mb-1 tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.28em] tw-text-[#14b8a6]/85">
				COPPA · CONSENT AUDIT
			</p>
			<h3 id="vaq-h" class="tw-m-0 tw-font-mono tw-text-base tw-font-black tw-tracking-tight tw-text-slate-100">
				Verified minor consent records
			</h3>
		</div>
		<span class="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#14b8a6]/30 tw-bg-[#14b8a6]/10 tw-px-2.5 tw-py-1 tw-font-mono tw-text-[10px] tw-font-bold tw-tabular-nums tw-tracking-widest tw-text-[#14b8a6]">
			{records.length} RECORD{records.length === 1 ? '' : 'S'}
		</span>
	</header>

	{#if loading}
		<p class="tw-flex tw-items-center tw-gap-2 tw-py-4 tw-font-mono tw-text-xs tw-tracking-wider tw-text-slate-500">
			<Icon name="status.loader" class="tw-animate-spin" />
			SYNCING CONSENT MANIFEST…
		</p>
	{:else if loadError}
		<p
			class="tw-flex tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-[#ff003c]/40 tw-bg-[#ff003c]/10 tw-px-3 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-text-[#ff003c]"
			role="alert"
		>
			<Icon name="status.warning-circle" /> {loadError}
		</p>
	{:else if records.length === 0}
		<p class="tw-py-4 tw-font-mono tw-text-xs tw-leading-relaxed tw-text-slate-600">
			No consent records for this club yet. Parents finalize VPC in Parent OS — no director approval required.
		</p>
	{:else}
		<ul class="tw-m-0 tw-list-none tw-space-y-2 tw-p-0" role="list">
			{#each records as rec (rec.id)}
				<li
					class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-white/8 tw-bg-black/40 tw-px-4 tw-py-3 tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
				>
					<div class="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-1">
						<div class="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
							<Icon name="user.avatar" class="tw-shrink-0 tw-text-[#14b8a6]/80" />
							<span class="tw-min-w-0 tw-truncate tw-font-mono tw-text-sm tw-font-bold tw-text-slate-100">{rec.subjectEmail}</span>
						</div>
						<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-pl-6 tw-font-mono tw-text-[10px] tw-tracking-wide tw-text-slate-500">
							<span>PARENT · <span class="tw-text-slate-300">{rec.parentEmail || '—'}</span></span>
							{#if rec.method}
								<span>METHOD · <span class="tw-text-slate-400">{rec.method}</span></span>
							{/if}
							{#if rec.grantedAt}
								<span>GRANTED · <span class="tw-text-slate-400 tw-tabular-nums">{formatDate(rec.grantedAt)}</span></span>
							{/if}
						</div>
					</div>
					<span class="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#14b8a6]">
						<Icon name="status.verified" /> Verified
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>
