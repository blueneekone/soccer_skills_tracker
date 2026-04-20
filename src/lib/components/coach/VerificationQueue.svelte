<script>
	import { browser } from '$app/environment';
	import { db, functions } from '$lib/firebase.js';
	import {
		collection,
		query,
		where,
		orderBy,
		onSnapshot,
	} from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';

	let { teamId = '' } = $props();

	const verifyVideoTrial = httpsCallable(functions, 'verifyVideoTrial');

	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let items = $state([]);
	let loading = $state(true);
	let err = $state('');
	let busyId = $state('');

	$effect(() => {
		if (!browser || !teamId) {
			items = [];
			loading = false;
			return;
		}
		loading = true;
		err = '';
		const q = query(
			collection(db, 'trial_scores'),
			where('teamId', '==', teamId),
			where('status', '==', 'pending_verification'),
			orderBy('submittedAt', 'desc'),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				items = [];
				snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
				loading = false;
			},
			(e) => {
				console.error(e);
				err = 'Could not load verification queue.';
				loading = false;
			},
		);
		return () => unsub();
	});

	/**
	 * @param {string} id
	 * @param {'approve' | 'reject'} decision
	 */
	async function act(id, decision) {
		if (!id || busyId) return;
		busyId = id;
		err = '';
		try {
			await verifyVideoTrial({ scoreId: id, decision });
		} catch (e) {
			console.error(e);
			err = 'Action failed. Try again.';
		} finally {
			busyId = '';
		}
	}

	function fmtDate(ts) {
		if (!ts || typeof ts.toDate !== 'function') return '—';
		try {
			return ts.toDate().toLocaleString();
		} catch {
			return '—';
		}
	}
</script>

<div class="vq glass-panel">
	<div class="vq-head">
		<h3 class="vq-title">Video verification</h3>
		<p class="vq-sub">Review athlete clips before they appear for recruiters.</p>
	</div>

	{#if !teamId}
		<p class="vq-muted">Select a team to load the queue.</p>
	{:else if loading}
		<p class="vq-muted">Loading…</p>
	{:else if err}
		<p class="vq-err" role="alert">{err}</p>
	{:else if items.length === 0}
		<p class="vq-muted">No clips awaiting verification.</p>
	{:else}
		<ul class="vq-list">
			{#each items as row (row.id)}
				<li class="vq-card">
					<div class="vq-meta">
						<strong>{String(row.playerName ?? 'Player')}</strong>
						<span class="vq-date">{fmtDate(row.submittedAt)}</span>
					</div>
					{#if typeof row.videoUrl === 'string' && row.videoUrl}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							class="vq-video"
							controls
							preload="metadata"
							src={row.videoUrl}
							aria-label="Trial video for {String(row.playerName ?? 'player')}"
						></video>
					{/if}
					<div class="vq-actions">
						<button
							type="button"
							class="vq-approve"
							disabled={busyId === row.id}
							onclick={() => act(row.id, 'approve')}
						>
							{busyId === row.id ? '…' : 'Approve'}
						</button>
						<button
							type="button"
							class="vq-reject"
							disabled={busyId === row.id}
							onclick={() => act(row.id, 'reject')}
						>
							Reject
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.vq {
		padding: clamp(16px, 3vw, 22px);
		border-radius: var(--radius-premium, 20px);
		border: 1px solid rgba(148, 163, 184, 0.18);
	}

	.vq-head {
		margin-bottom: 14px;
	}

	.vq-title {
		margin: 0 0 6px;
		font-size: 1.05rem;
		font-weight: 700;
	}

	.vq-sub {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-secondary, #64748b);
	}

	.vq-muted {
		margin: 0;
		color: #64748b;
		font-size: 0.9rem;
	}

	.vq-err {
		color: #c2410c;
		font-size: 0.9rem;
	}

	.vq-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.vq-card {
		border: 1px solid rgba(15, 23, 42, 0.1);
		border-radius: 16px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.55);
	}

	.vq-meta {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
		margin-bottom: 10px;
		font-size: 0.92rem;
	}

	.vq-date {
		font-size: 0.78rem;
		color: #64748b;
	}

	.vq-video {
		width: 100%;
		max-height: 220px;
		border-radius: 12px;
		background: #0f172a;
		margin-bottom: 10px;
	}

	.vq-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.vq-approve {
		padding: 10px 18px;
		border-radius: 12px;
		border: none;
		cursor: pointer;
		font-weight: 800;
		color: #022c22;
		background: linear-gradient(180deg, #34d399 0%, #10b981 100%);
		box-shadow:
			0 0 0 1px rgba(16, 185, 129, 0.5),
			0 0 24px rgba(16, 185, 129, 0.35);
	}

	.vq-approve:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.vq-reject {
		padding: 10px 18px;
		border-radius: 12px;
		border: 1px solid rgba(220, 38, 38, 0.45);
		cursor: pointer;
		font-weight: 700;
		color: #991b1b;
		background: rgba(254, 226, 226, 0.9);
	}

	.vq-reject:disabled {
		opacity: 0.6;
		cursor: wait;
	}
</style>
