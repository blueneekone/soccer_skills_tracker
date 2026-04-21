<script>
	import { browser } from '$app/environment';
	import { httpsCallable } from 'firebase/functions';
	import {
		collection,
		query,
		where,
		orderBy,
		limit,
		getDocs,
		getDoc,
		doc
	} from 'firebase/firestore';
	import { db, functions } from '$lib/firebase.js';

	/** @type {{ clubId?: string }} */
	let { clubId = '' } = $props();

	const directorApproveVpcFn = httpsCallable(functions, 'directorApproveVpc');

	/** @type {Array<{
	 *   id: string,
	 *   playerEmail: string,
	 *   parentEmail: string,
	 *   consentedAt: unknown,
	 *   clubId: string
	 * }>} */
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
					limit(25)
				);
				const snap = await getDocs(q);
				if (cancelled) return;
				requests = snap.docs.map((d) => ({
					id: d.id,
					playerEmail: String(d.data().playerEmail || ''),
					parentEmail: String(d.data().parentEmail || ''),
					consentedAt: d.data().consentedAt || null,
					clubId: String(d.data().clubId || '')
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
	 * @param {string} requestId
	 * @param {string} playerEmail
	 */
	async function approveVpc(requestId, playerEmail) {
		itemState = { ...itemState, [requestId]: 'approving' };
		try {
			await directorApproveVpcFn({ playerEmail });
			itemState = { ...itemState, [requestId]: 'done' };
			requests = requests.filter((r) => r.id !== requestId);
		} catch (e) {
			console.error('[VpcApprovalQueue] approve failed', e);
			itemState = { ...itemState, [requestId]: 'error' };
		}
	}

	function formatDate(ts) {
		if (!ts) return '';
		try {
			const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
			return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		} catch {
			return '';
		}
	}
</script>

{#if loading}
	<p class="vaq-muted">Loading consent requests…</p>
{:else if loadError}
	<p class="vaq-error" role="alert">{loadError}</p>
{:else if requests.length === 0}
	<p class="vaq-muted">No consent requests awaiting approval.</p>
{:else}
	<ul class="vaq-list" role="list">
		{#each requests as req (req.id)}
			<li class="vaq-row">
				<div class="vaq-row__info">
					<div class="vaq-row__athlete">
						<i class="ph ph-user-circle vaq-row__icon" aria-hidden="true"></i>
						<span class="vaq-row__email">{req.playerEmail}</span>
					</div>
					<div class="vaq-row__meta">
						<span>Parent: <strong>{req.parentEmail || '—'}</strong></span>
						{#if req.consentedAt}
							<span>Consented: {formatDate(req.consentedAt)}</span>
						{/if}
					</div>
				</div>
				<div class="vaq-row__actions">
					{#if itemState[req.id] === 'done'}
						<span class="vaq-row__done">
							<i class="ph ph-check-circle" aria-hidden="true"></i> Approved
						</span>
					{:else if itemState[req.id] === 'error'}
						<span class="vaq-row__err">
							<i class="ph ph-warning" aria-hidden="true"></i> Error — retry
						</span>
					{/if}
					<button
						type="button"
						class="vaq-approve-btn"
						class:vaq-approve-btn--loading={itemState[req.id] === 'approving'}
						disabled={itemState[req.id] === 'approving' || itemState[req.id] === 'done'}
						onclick={() => approveVpc(req.id, req.playerEmail)}
						aria-label="Approve VPC for {req.playerEmail}"
					>
						{#if itemState[req.id] === 'approving'}
							<i class="ph ph-spinner" aria-hidden="true"></i> Approving…
						{:else}
							<i class="ph ph-seal-check" aria-hidden="true"></i> Approve VPC
						{/if}
					</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.vaq-muted {
		margin: 0;
		font-size: 0.82rem;
		color: var(--text-secondary);
	}

	.vaq-error {
		margin: 0;
		font-size: 0.82rem;
		color: #b91c1c;
		font-weight: 600;
	}
	:global(html.dark) .vaq-error { color: #fca5a5; }

	.vaq-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.vaq-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
		padding: 10px 12px;
		border: 1px solid rgba(15, 23, 42, 0.07);
		border-radius: 10px;
		background: rgba(245, 158, 11, 0.04);
	}

	:global(html.dark) .vaq-row {
		background: rgba(245, 158, 11, 0.06);
		border-color: rgba(245, 158, 11, 0.18);
	}

	.vaq-row__info {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.vaq-row__athlete {
		display: flex;
		align-items: center;
		gap: 7px;
	}

	.vaq-row__icon {
		font-size: 1.1rem;
		color: var(--aggie-gold, #f59e0b);
		flex-shrink: 0;
	}

	.vaq-row__email {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.vaq-row__meta {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		font-size: 0.75rem;
		color: var(--text-secondary);
		padding-left: 1.8rem;
	}

	.vaq-row__actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.vaq-row__done {
		font-size: 0.78rem;
		font-weight: 700;
		color: #16a34a;
		display: flex;
		align-items: center;
		gap: 4px;
	}
	:global(html.dark) .vaq-row__done { color: #4ade80; }

	.vaq-row__err {
		font-size: 0.78rem;
		font-weight: 700;
		color: #b91c1c;
		display: flex;
		align-items: center;
		gap: 4px;
	}
	:global(html.dark) .vaq-row__err { color: #fca5a5; }

	.vaq-approve-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 6px 12px;
		border: none;
		border-radius: 8px;
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		background: var(--aggie-gold, #f59e0b);
		color: #000;
		transition: background 0.12s, opacity 0.12s;
		white-space: nowrap;
	}

	.vaq-approve-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.vaq-approve-btn:not(:disabled):hover {
		background: #d97706;
	}

	.vaq-approve-btn--loading {
		opacity: 0.7;
	}
</style>
