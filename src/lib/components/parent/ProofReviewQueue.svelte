<script lang="ts">
	/**
	 * ProofReviewQueue.svelte — B4b
	 * ─────────────────────────────
	 * Parent OS — advisory completion-proof review queue.
	 * Shows pending `completion_verifications` for the parent's household children.
	 * Approve / Reject calls `parentReviewCompletionProof` (CF callable, Admin SDK write).
	 *
	 * ADVISORY: these reviews do NOT affect XP, workout_logs, or intent fulfillment.
	 * Design: flat adult UI per PARENT_OS.md — teal mono (#14b8a6), NO gamification chrome.
	 */

	import { browser } from '$app/environment';
	import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { ref as storageRef, getDownloadURL } from 'firebase/storage';
	import { db, storage } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props {
		/** Parent's householdId (resolved by parent dashboard — do NOT re-resolve here). */
		householdId: string;
		/** Child email → display name map (resolved by dashboard from households doc). */
		childNames: Record<string, string>;
	}
	const { householdId, childNames }: Props = $props();

	// ── Types ─────────────────────────────────────────────────────────────────
	interface PendingProof {
		id: string;
		userKey: string;
		intentId: string;
		proofNote: string | null;
		mediaStoragePath: string | null;
		createdAt: Date | null;
	}

	// ── State ─────────────────────────────────────────────────────────────────
	let items = $state<PendingProof[]>([]);
	let loading = $state(true);
	let error = $state('');
	/** verificationIds currently in flight for optimistic removal. */
	let deciding = $state<Set<string>>(new Set());
	/** Per-item error messages. */
	let itemErrors = $state<Record<string, string>>({});
	/** Resolved download URLs for items that have mediaStoragePath. */
	let mediaUrls = $state<Record<string, string | null>>({});
	/** Items where media URL resolution failed. */
	let mediaUrlErrors = $state<Record<string, boolean>>({});

	// ── Firestore subscription ────────────────────────────────────────────────
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

				// B4c — resolve download URLs for items with media (parent has household read access).
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

	// ── Actions ───────────────────────────────────────────────────────────────
	async function decide(verificationId: string, decision: 'approved' | 'rejected') {
		deciding = new Set([...deciding, verificationId]);
		itemErrors = { ...itemErrors, [verificationId]: '' };

		try {
			const fn = httpsCallable(getFunctions(undefined, 'us-east1'), 'parentReviewCompletionProof');
			await fn({ verificationId, decision });
			// Optimistic: remove from list immediately (snapshot will also remove it).
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

	// ── Helpers ───────────────────────────────────────────────────────────────
	function childDisplayName(userKey: string): string {
		return childNames[userKey] ?? userKey;
	}

	function fmtDate(d: Date | null): string {
		if (!d) return '—';
		return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="prq-root">
	<header class="prq-header">
		<span class="prq-eyebrow">COMPLETION REVIEW · ADVISORY</span>
		<h2 class="prq-title">ATHLETE COMPLETIONS</h2>
		<p class="prq-subtitle">
			Approve or note coach-assigned completions submitted by your athlete.
			These reviews are advisory only — they do not affect training progress or XP.
		</p>
	</header>

	{#if error}
		<div class="prq-error" role="alert">{error}</div>
	{:else if loading}
		<div class="prq-loading">
			<span class="prq-spin" aria-hidden="true"></span>
			Loading…
		</div>
	{:else if items.length === 0}
		<div class="prq-empty">
			<span class="prq-empty__icon" aria-hidden="true">◈</span>
			<p>No completions awaiting your review.</p>
		</div>
	{:else}
		<ul class="prq-list" aria-label="Pending completion reviews">
			{#each items as item (item.id)}
				<li class="prq-item">
					<div class="prq-item__meta">
						<span class="prq-child">{childDisplayName(item.userKey)}</span>
						<span class="prq-time">{fmtDate(item.createdAt)}</span>
					</div>

				{#if item.proofNote}
					<p class="prq-note">"{item.proofNote}"</p>
				{:else}
					<p class="prq-note prq-note--empty">No note provided.</p>
				{/if}

				<!-- B4c — parent media preview (player-uploaded COPPA proof; coaches never see this) -->
				{#if item.mediaStoragePath}
					<div class="prq-media">
						{#if mediaUrlErrors[item.id]}
							<p class="prq-media__unavailable">Media attachment unavailable. You can still approve or reject the note.</p>
						{:else if mediaUrls[item.id]}
							{@const url = mediaUrls[item.id]!}
							{#if item.mediaStoragePath.match(/\.(mp4|mov|webm|avi|m4v)(\?|$)/i) || item.mediaStoragePath.match(/video\//)}
							<video
								class="prq-media__video"
								src={url}
								controls
								preload="metadata"
								aria-label="Proof video submitted by {childDisplayName(item.userKey)}"
							>
								<track kind="captions" src="" label="No captions" default />
							</video>
							{:else}
								<img
									class="prq-media__image"
									src={url}
									alt="Proof photo submitted by {childDisplayName(item.userKey)}"
								/>
							{/if}
						{:else}
							<p class="prq-media__loading">Loading media…</p>
						{/if}
					</div>
				{/if}

				{#if itemErrors[item.id]}
						<p class="prq-item-error" role="alert">{itemErrors[item.id]}</p>
					{/if}

					<div class="prq-actions">
						<button
							class="prq-btn prq-btn--approve"
							disabled={deciding.has(item.id)}
							onclick={() => decide(item.id, 'approved')}
							aria-label="Approve completion for {childDisplayName(item.userKey)}"
						>
							{deciding.has(item.id) ? '…' : 'Approve'}
						</button>
						<button
							class="prq-btn prq-btn--reject"
							disabled={deciding.has(item.id)}
							onclick={() => decide(item.id, 'rejected')}
							aria-label="Reject completion for {childDisplayName(item.userKey)}"
						>
							{deciding.has(item.id) ? '…' : 'Reject'}
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.prq-root {
		background: rgba(6, 8, 16, 0.92);
		border: 1px solid rgba(20, 184, 166, 0.18);
		border-radius: 12px;
		overflow: hidden;
		font-family: 'JetBrains Mono', monospace;
	}

	.prq-header {
		padding: 1.25rem 1.5rem 1rem;
		background: rgba(20, 184, 166, 0.04);
		border-bottom: 1px solid rgba(20, 184, 166, 0.1);
	}

	.prq-eyebrow {
		display: block;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(20, 184, 166, 0.55);
		margin-bottom: 0.3rem;
	}

	.prq-title {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: #fff;
	}

	.prq-subtitle {
		margin: 0;
		font-size: 0.68rem;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.35);
	}

	.prq-error {
		margin: 1rem 1.5rem;
		padding: 0.6rem 0.875rem;
		background: rgba(255, 50, 80, 0.08);
		border: 1px solid rgba(255, 50, 80, 0.2);
		border-radius: 6px;
		color: rgba(255, 50, 80, 0.85);
		font-size: 0.72rem;
	}

	.prq-loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 2rem 1.5rem;
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.72rem;
	}

	.prq-spin {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(20, 184, 166, 0.2);
		border-top-color: #14b8a6;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	.prq-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 2.5rem 2rem;
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.72rem;
		text-align: center;
	}
	.prq-empty p { margin: 0; }
	.prq-empty__icon { font-size: 1.5rem; opacity: 0.25; }

	.prq-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.prq-item {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		transition: background 0.12s;
	}
	.prq-item:last-child { border-bottom: none; }
	.prq-item:hover { background: rgba(20, 184, 166, 0.02); }

	.prq-item__meta {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.4rem;
	}

	.prq-child {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #14b8a6;
	}

	.prq-time {
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.25);
	}

	.prq-note {
		margin: 0 0 0.75rem;
		font-size: 0.68rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.6);
		font-style: italic;
	}
	.prq-note--empty { color: rgba(255, 255, 255, 0.2); font-style: normal; }

	.prq-item-error {
		margin: 0 0 0.5rem;
		font-size: 0.6rem;
		color: rgba(255, 100, 80, 0.85);
	}

	.prq-actions {
		display: flex;
		gap: 0.5rem;
	}

	.prq-btn {
		padding: 0.35rem 0.875rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
		border: 1px solid transparent;
	}
	.prq-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.prq-btn--approve {
		background: rgba(20, 184, 166, 0.12);
		border-color: rgba(20, 184, 166, 0.35);
		color: #14b8a6;
	}
	.prq-btn--approve:hover:not(:disabled) {
		background: rgba(20, 184, 166, 0.22);
		border-color: rgba(20, 184, 166, 0.6);
	}

	.prq-btn--reject {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.45);
	}
	.prq-btn--reject:hover:not(:disabled) {
		background: rgba(255, 80, 60, 0.08);
		border-color: rgba(255, 80, 60, 0.25);
		color: rgba(255, 130, 110, 0.85);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* B4c — parent media preview (calm adult Parent OS; no gamification chrome) */
	.prq-media {
		margin: 0 0 0.75rem;
	}

	.prq-media__image {
		max-width: 100%;
		max-height: 240px;
		border-radius: 6px;
		border: 1px solid rgba(20, 184, 166, 0.15);
		display: block;
		object-fit: contain;
		background: rgba(0, 0, 0, 0.3);
	}

	.prq-media__video {
		max-width: 100%;
		max-height: 240px;
		border-radius: 6px;
		border: 1px solid rgba(20, 184, 166, 0.15);
		display: block;
		background: #000;
	}

	.prq-media__loading {
		margin: 0;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.25);
		font-style: italic;
	}

	.prq-media__unavailable {
		margin: 0;
		font-size: 0.6rem;
		color: rgba(255, 180, 100, 0.65);
		font-style: italic;
	}
</style>
