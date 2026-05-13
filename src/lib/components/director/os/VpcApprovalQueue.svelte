<script lang="ts">
	import { browser } from '$app/environment';
	import { httpsCallable } from 'firebase/functions';
	import {
		collection,
		query,
		where,
		orderBy,
		limit,
		getDocs,
	} from 'firebase/firestore';
	import { db, functions } from '$lib/firebase.js';

	/** @type {{ clubId?: string }} */
	let { clubId = '' } = $props();

	const directorApproveVpcFn = httpsCallable(functions, 'directorApproveVpc');

	/** @type {Array<{ id: string; playerEmail: string; childEmail?: string; email?: string; parentEmail: string; consentedAt: unknown; clubId: string }>} */
	let requests = $state([]);
	let loading = $state(true);
	let loadError = $state('');
	/** @type {Record<string, 'approving' | 'done' | 'error'>} */
	let itemState = $state({});

	$effect(() => {
		if (!browser || !clubId) {
			requests = [];
			loading = false;
			return;
		}
		let cancelled = false;
		loading = true;
		loadError = '';

		(async () => {
			try {
				const q = query(
					collection(db, 'vpc_requests'),
					where('clubId', '==', clubId),
					where('status', '==', 'parent_consented'),
					orderBy('consentedAt', 'desc'),
					limit(25),
				);
			const snap = await getDocs(q);
			if (cancelled) return;
			requests = snap.docs.map((d) => ({
				id: d.id,
				playerEmail: String(d.data().playerEmail || ''),
				childEmail: String(d.data().childEmail || ''),
				email: String(d.data().email || ''),
				parentEmail: String(d.data().parentEmail || ''),
				consentedAt: d.data().consentedAt || null,
				clubId: String(d.data().clubId || ''),
			}));
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

	/**
	 * Resolve the minor's email across legacy schema variations, then dispatch
	 * the directorApproveVpc callable with a strictly-typed payload object.
	 * @param {{ id: string; playerEmail: string; childEmail?: string; email?: string }} requestRow
	 */
	async function handleVpcApproval(requestRow) {
		const targetEmail =
			requestRow.playerEmail ||
			requestRow.childEmail ||
			requestRow.email ||
			'';

		if (!targetEmail.trim()) {
			console.error(
				'[VpcApprovalQueue] Approval aborted: row lacks a valid target player email.',
				requestRow,
			);
			return;
		}

		itemState = { ...itemState, [requestRow.id]: 'approving' };
		try {
			await directorApproveVpcFn({ playerEmail: targetEmail.trim() });
			itemState = { ...itemState, [requestRow.id]: 'done' };
			requests = requests.filter((r) => r.id !== requestRow.id);
		} catch (e) {
			console.error('[VpcApprovalQueue] Backend VPC clearance rejected:', e);
			itemState = { ...itemState, [requestRow.id]: 'error' };
		}
	}

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
	<header class="tw-mb-4 tw-flex tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-[#00f0ff]/15 tw-pb-3">
		<div class="tw-min-w-0">
			<p class="tw-mb-1 tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.28em] tw-text-[#00f0ff]/85">
				COPPA · CONSENT QUEUE
			</p>
			<h3 id="vaq-h" class="tw-m-0 tw-font-mono tw-text-base tw-font-black tw-tracking-tight tw-text-slate-100">
				Pending Director Approvals
			</h3>
		</div>
		<span class="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#00f0ff]/30 tw-bg-[#00f0ff]/10 tw-px-2.5 tw-py-1 tw-font-mono tw-text-[10px] tw-font-bold tw-tabular-nums tw-tracking-widest tw-text-[#00f0ff]">
			<span class="tw-block tw-h-1.5 tw-w-1.5 tw-animate-pulse tw-rounded-full tw-bg-[#00f0ff] tw-shadow-[0_0_6px_rgba(0,240,255,0.7)]"></span>
			{requests.length} OPEN
		</span>
	</header>

	{#if loading}
		<p class="tw-flex tw-items-center tw-gap-2 tw-py-4 tw-font-mono tw-text-xs tw-tracking-wider tw-text-slate-500">
			<i class="ph ph-spinner-gap tw-animate-spin" aria-hidden="true"></i>
			SYNCING CONSENT MANIFEST…
		</p>
	{:else if loadError}
		<p
			class="tw-flex tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-[#ff003c]/40 tw-bg-[#ff003c]/10 tw-px-3 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-text-[#ff003c]"
			role="alert"
		>
			<i class="ph ph-warning-circle" aria-hidden="true"></i> {loadError}
		</p>
	{:else if requests.length === 0}
		<p class="tw-py-4 tw-font-mono tw-text-xs tw-leading-relaxed tw-text-slate-600">
			No consent requests awaiting approval. Channel quiet.
		</p>
	{:else}
		<ul class="tw-m-0 tw-list-none tw-space-y-2 tw-p-0" role="list">
			{#each requests as req (req.id)}
				<li
					class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-white/8 tw-bg-black/40 tw-px-4 tw-py-3 tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] tw-transition-colors hover:tw-border-[#00f0ff]/35"
				>
					<div class="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-1">
						<div class="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
							<i class="ph ph-user-circle tw-shrink-0 tw-text-base tw-text-[#00f0ff]/80" aria-hidden="true"></i>
							<span class="tw-min-w-0 tw-truncate tw-font-mono tw-text-sm tw-font-bold tw-text-slate-100">{req.playerEmail}</span>
						</div>
						<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-pl-6 tw-font-mono tw-text-[10px] tw-tracking-wide tw-text-slate-500">
							<span>PARENT · <span class="tw-text-slate-300">{req.parentEmail || '—'}</span></span>
							{#if req.consentedAt}
								<span class="tw-text-slate-600">CONSENTED · <span class="tw-text-slate-400 tw-tabular-nums">{formatDate(req.consentedAt)}</span></span>
							{/if}
						</div>
					</div>
					<div class="tw-flex tw-shrink-0 tw-items-center tw-gap-2">
						{#if itemState[req.id] === 'done'}
							<span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff]">
								<i class="ph ph-check-circle" aria-hidden="true"></i> Approved
							</span>
						{:else if itemState[req.id] === 'error'}
							<span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#ff003c]">
								<i class="ph ph-warning" aria-hidden="true"></i> Retry
							</span>
						{/if}
						<button
							type="button"
							class="tw-pointer-events-auto tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#00f0ff]/40 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff] tw-backdrop-blur-3xl tw-transition-all hover:tw-border-[#00f0ff]/80 hover:tw-bg-[#00f0ff]/10 hover:tw-shadow-[0_0_20px_rgba(0,240,255,0.35)] active:tw-scale-95 disabled:tw-cursor-not-allowed disabled:tw-opacity-30"
						disabled={itemState[req.id] === 'approving' || itemState[req.id] === 'done'}
						onclick={() => handleVpcApproval(req)}
							aria-label="Approve VPC for {req.playerEmail}"
						>
							{#if itemState[req.id] === 'approving'}
								<i class="ph ph-spinner-gap tw-animate-spin" aria-hidden="true"></i> Approving…
							{:else}
								<i class="ph ph-seal-check" aria-hidden="true"></i> Approve VPC
							{/if}
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
