<script lang="ts">
	/**
	 * ProofReviewQueue.svelte — B4b / VS-4c claim audit panel
	 * Parent OS — advisory completion-proof review queue.
	 */

	import { browser } from '$app/environment';
	import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { ref as storageRef, getDownloadURL } from 'firebase/storage';
	import { db, functions, storage } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props {
		householdId: string;
		childNames: Record<string, string>;
	}
	const { householdId, childNames }: Props = $props();

	interface PendingProof {
		id: string;
		userKey: string;
		intentId: string;
		proofNote: string | null;
		mediaStoragePath: string | null;
		createdAt: Date | null;
	}

	let items = $state<PendingProof[]>([]);
	let loading = $state(true);
	let error = $state('');
	let deciding = $state<Set<string>>(new Set());
	let itemErrors = $state<Record<string, string>>({});
	let mediaUrls = $state<Record<string, string | null>>({});
	let mediaUrlErrors = $state<Record<string, boolean>>({});

	let unsubscribe: (() => void) | null = null;

	$effect(() => {
		if (!browser || !householdId) return;
		loading = true;
		error = '';

		const q = query(
			collection(db, 'completion_verifications'),
			where('householdId', '==', householdId),
			where('status', '==', 'pending'),
			orderBy('createdAt', 'desc'),
		);

		unsubscribe = onSnapshot(
			q,
			(snap) => {
				const newItems = snap.docs.map((d) => {
					const data = d.data();
					return {
						id: d.id,
						userKey: typeof data.userKey === 'string' ? data.userKey : '',
						intentId: typeof data.intentId === 'string' ? data.intentId : '',
						proofNote: typeof data.proofNote === 'string' ? data.proofNote : null,
						mediaStoragePath:
							typeof data.mediaStoragePath === 'string' ? data.mediaStoragePath : null,
						createdAt: data.createdAt?.toDate?.() ?? null,
					};
				});
				items = newItems;
				loading = false;

				for (const item of newItems) {
					if (item.mediaStoragePath && !(item.id in mediaUrls)) {
						mediaUrls = { ...mediaUrls, [item.id]: null };
						getDownloadURL(storageRef(storage, item.mediaStoragePath))
							.then((url) => {
								mediaUrls = { ...mediaUrls, [item.id]: url };
							})
							.catch((err) => {
								console.error('[B4c] media URL resolution failed', err);
								mediaUrlErrors = { ...mediaUrlErrors, [item.id]: true };
							});
					}
				}
			},
			(err) => {
				error = err instanceof Error ? err.message : 'Failed to load review queue.';
				loading = false;
			},
		);

		return () => {
			unsubscribe?.();
			unsubscribe = null;
		};
	});

	async function decide(verificationId: string, decision: 'approved' | 'rejected') {
    if (!db || !authStore.isAuthenticated) return;
		deciding = new Set([...deciding, verificationId]);
		itemErrors = { ...itemErrors, [verificationId]: '' };

		try {
			const fn = httpsCallable(functions, 'parentReviewCompletionProof');
			await fn({ verificationId, decision });
			items = items.filter((i) => i.id !== verificationId);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Action failed. Please try again.';
			itemErrors = { ...itemErrors, [verificationId]: msg };
		} finally {
			const next = new Set(deciding);
			next.delete(verificationId);
			deciding = next;
		}
	}

	function childDisplayName(userKey: string): string {
		return childNames[userKey] ?? userKey;
	}

	function fmtDate(d: Date | null): string {
		if (!d) return '—';
		return d.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}
</script>

<div class="parent-bounty-claims-panel">
	<header class="parent-bounty-claims-panel__head">
		<span class="parent-bounty-claims-panel__eyebrow">Completion review · advisory</span>
		<h2 class="parent-bounty-claims-panel__title">Audit claims</h2>
		<p class="parent-bounty-claims-panel__subtitle">
			Approve or note coach-assigned completions submitted by your athlete. These reviews are
			advisory only — they do not affect training progress or XP.
		</p>
	</header>

	{#if error}
		<div class="parent-bounty-claims-error" role="alert">{error}</div>
	{:else if loading}
		<div class="parent-bounty-claims-loading">Loading review queue…</div>
	{:else if items.length === 0}
		<div class="parent-bounty-claims-empty">
			<p>No completions awaiting your review.</p>
		</div>
	{:else}
		<ul class="parent-bounty-claims-list" aria-label="Pending completion reviews">
			{#each items as item (item.id)}
				<li class="parent-bounty-claims-item">
					<div class="parent-bounty-claims-item__meta">
						<span class="parent-bounty-claims-item__child">{childDisplayName(item.userKey)}</span>
						<span class="parent-bounty-claims-item__time">{fmtDate(item.createdAt)}</span>
					</div>

					{#if item.proofNote}
						<p class="parent-bounty-claims-item__note">"{item.proofNote}"</p>
					{:else}
						<p class="parent-bounty-claims-item__note parent-bounty-claims-item__note--empty">
							No note provided.
						</p>
					{/if}

					{#if item.mediaStoragePath}
						<div class="parent-bounty-claims-media">
							{#if mediaUrlErrors[item.id]}
								<p class="parent-bounty-claims-media__unavailable">
									Media attachment unavailable. You can still approve or reject the note.
								</p>
							{:else if mediaUrls[item.id]}
								{@const url = mediaUrls[item.id]!}
								{#if item.mediaStoragePath.match(/\.(mp4|mov|webm|avi|m4v)(\?|$)/i) || item.mediaStoragePath.match(/video\//)}
									<video
										class="parent-bounty-claims-media__video"
										src={url}
										controls
										preload="metadata"
										aria-label="Proof video submitted by {childDisplayName(item.userKey)}"
									>
										<track kind="captions" src="" label="No captions" default />
									</video>
								{:else}
									<img
										class="parent-bounty-claims-media__image"
										src={url}
										alt="Proof photo submitted by {childDisplayName(item.userKey)}"
									/>
								{/if}
							{:else}
								<p class="parent-bounty-claims-media__loading">Loading media…</p>
							{/if}
						</div>
					{/if}

					{#if itemErrors[item.id]}
						<p class="parent-bounty-claims-item__error" role="alert">{itemErrors[item.id]}</p>
					{/if}

					<div class="parent-bounty-claims-actions tw-flex tw-gap-2">
						<button
							type="button"
							class="tw-bg-nuclear-yellow tw-text-black tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-font-bold tw-rounded-none hover:tw-bg-yellow-300 tw-transition-all tw-inline-flex tw-items-center tw-gap-1.5"
							disabled={deciding.has(item.id)}
							onclick={() => decide(item.id, 'approved')}
							aria-label="Approve completion for {childDisplayName(item.userKey)}"
						>
							<Icon name={"status.check" as IconName} size={14} />
							<span>{deciding.has(item.id) ? '…' : 'Approve'}</span>
						</button>
						<button
							type="button"
							class="tw-border tw-border-slate-700 tw-bg-[#1E293B] tw-text-slate-300 tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-font-bold tw-rounded-none hover:tw-border-red-500/50 hover:tw-text-red-400 tw-transition-all tw-inline-flex tw-items-center tw-gap-1.5"
							disabled={deciding.has(item.id)}
							onclick={() => decide(item.id, 'rejected')}
							aria-label="Reject completion for {childDisplayName(item.userKey)}"
						>
							<Icon name={"status.x" as IconName} size={14} />
							<span>{deciding.has(item.id) ? '…' : 'Reject'}</span>
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
