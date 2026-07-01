<script lang="ts">
	/**
	 * /director/uplinks — Magic Uplink Management Console
	 * ─────────────────────────────────────────────────────
	 * Phase 2, Epic 3 — Passwordless Magic Uplinks.
	 *
	 * Director-scoped onSnapshot list of magic_uplinks for their club,
	 * filtered by status tabs: pending / consumed / revoked / expired.
	 *
	 * Per-row actions:
	 *   • Resend  — mints a new uplink for the same email/purpose
	 *   • Revoke  — calls revokeMagicUplink callable
	 *   • Audit   — opens modal with magic_uplink_audit rows
	 */

	import { onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import type { MagicUplinkDoc, MagicUplinkStatus, MagicUplinkAuditDoc } from '$lib/types/magicUplink.js';

	// ── Callables ─────────────────────────────────────────────────────────────

	const revokeFn = httpsCallable<{ tokenId: string }, void>(functions, 'revokeMagicUplink');

	// ── Tab state ─────────────────────────────────────────────────────────────

	type Tab = MagicUplinkStatus;
	let activeTab = $state<Tab>('pending');

	const TABS: { value: Tab; label: string }[] = [
		{ value: 'pending',  label: 'Pending'  },
		{ value: 'consumed', label: 'Consumed' },
		{ value: 'revoked',  label: 'Revoked'  },
		{ value: 'expired',  label: 'Expired'  },
	];

	// ── Uplinks data ──────────────────────────────────────────────────────────

	let allUplinks = $state<MagicUplinkDoc[]>([]);
	let loadError  = $state('');

	const clubId = $derived(
		(authStore.userProfile as { clubId?: string } | null)?.clubId ?? authStore.tenantId ?? '',
	);

	const visibleUplinks = $derived(
		allUplinks.filter((u) => u.status === activeTab),
	);

	// Subscribe (and re-subscribe) once club context hydrates — onMount fired too
	// early when userProfile was not yet loaded, leaving a permanent error state.
	$effect(() => {
		const cid = clubId;
		if (!cid) {
			loadError = 'Club context not available.';
			return;
		}
		loadError = '';

		const q = query(
			collection(db, 'magic_uplinks'),
			where('clubId', '==', cid),
			orderBy('mintedAt', 'desc'),
		);

		const unsub = onSnapshot(
			q,
			(snap) => {
				allUplinks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MagicUplinkDoc));
				loadError = '';
			},
			(err) => {
				loadError = err.message;
			},
		);

		return () => unsub();
	});

	// ── Row actions ───────────────────────────────────────────────────────────

	let revoking = $state<Set<string>>(new Set());
	let rowError  = $state<Record<string, string>>({});

	async function handleRevoke(tokenId: string) {
		revoking = new Set([...revoking, tokenId]);
		rowError = { ...rowError, [tokenId]: '' };
		try {
			await revokeFn({ tokenId });
		} catch (err: unknown) {
			rowError = { ...rowError, [tokenId]: (err instanceof Error ? err.message : 'Revoke failed.') };
		} finally {
			revoking = new Set([...revoking].filter((id) => id !== tokenId));
		}
	}

	// ── Audit modal ───────────────────────────────────────────────────────────

	let auditTokenId   = $state<string | null>(null);
	let auditRows      = $state<MagicUplinkAuditDoc[]>([]);
	let auditLoading   = $state(false);

	async function openAudit(tokenId: string) {
		auditTokenId = tokenId;
		auditLoading = true;
		auditRows    = [];
		try {
			const snap = await getDocs(
				query(
					collection(db, 'magic_uplink_audit'),
					where('tokenId', '==', tokenId),
					orderBy('timestamp', 'asc'),
				),
			);
			auditRows = snap.docs.map((d) => d.data() as MagicUplinkAuditDoc);
		} finally {
			auditLoading = false;
		}
	}

	function closeAudit() {
		auditTokenId = null;
		auditRows    = [];
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	function fmtDate(ts: unknown): string {
		if (!ts) return '—';
		const date = (ts as { toDate: () => Date }).toDate?.() ?? new Date(ts as string);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function tabCount(tab: Tab): number {
		return allUplinks.filter((u) => u.status === tab).length;
	}
</script>

<svelte:head>
	<title>Magic Uplinks — Vanguard Director</title>
</svelte:head>

<div class="console">

	<!-- ── Page header ────────────────────────────────────────────────────── -->
	<div class="page-header">
		<div>
			<span class="page-badge">MAGIC UPLINKS</span>
			<h1 class="page-title">Invite Management Console</h1>
			<p class="page-subtitle">Passwordless single-use invite tokens dispatched by email</p>
		</div>
		<a href="/director?tab=household" class="compose-btn">⚡ New Uplink</a>
	</div>

	<!-- ── Status tabs ────────────────────────────────────────────────────── -->
	<div class="tabs" role="tablist">
		{#each TABS as tab (tab.value)}
			<button
				class="tab"
				class:tab--active={activeTab === tab.value}
				role="tab"
				aria-selected={activeTab === tab.value}
				onclick={() => { activeTab = tab.value; }}
			>
				{tab.label}
				<span class="tab-count">{tabCount(tab.value)}</span>
			</button>
		{/each}
	</div>

	<!-- ── Load error ─────────────────────────────────────────────────────── -->
	{#if loadError}
		<div class="error-banner" role="alert">{loadError}</div>
	{/if}

	<!-- ── Empty state ────────────────────────────────────────────────────── -->
	{#if !loadError && visibleUplinks.length === 0}
		<div class="empty-state">
			<span class="empty-icon">📭</span>
			<p>No {activeTab} uplinks for your club.</p>
		</div>
	{/if}

	<!-- ── Uplink rows ────────────────────────────────────────────────────── -->
	<div class="rows">
		{#each visibleUplinks as uplink (uplink.id)}
			<div class="row">
				<div class="row-main">
					<div class="row-info">
						<p class="row-email">{uplink.targetEmail}</p>
						<div class="row-meta">
							<span class="chip chip--role">{uplink.role ?? uplink.purpose}</span>
							<span class="chip chip--purpose">{uplink.purpose}</span>
							{#if uplink.teamId}
								<span class="chip chip--team">team: {uplink.teamId.slice(0, 8)}</span>
							{/if}
						</div>
						<p class="row-dates">
							Minted {fmtDate(uplink.mintedAt)} ·
							{#if activeTab === 'pending'}
								Expires {fmtDate(uplink.expiresAt)}
							{:else if activeTab === 'consumed'}
								Consumed {fmtDate(uplink.consumedAt)}
							{:else if activeTab === 'revoked'}
								Revoked {fmtDate(uplink.revokedAt)}
							{:else}
								Expired {fmtDate(uplink.expiresAt)}
							{/if}
						</p>
					</div>

					<div class="row-actions">
						{#if activeTab === 'pending'}
							<button
								class="btn-primary--danger"
								disabled={revoking.has(uplink.id)}
								onclick={() => handleRevoke(uplink.id)}
							>
								{revoking.has(uplink.id) ? '…' : 'Revoke'}
							</button>
						{/if}
						<button class="btn-primary" onclick={() => openAudit(uplink.id)}>
							Audit
						</button>
					</div>
				</div>

				{#if rowError[uplink.id]}
					<p class="row-error">{rowError[uplink.id]}</p>
				{/if}
			</div>
		{/each}
	</div>

</div>

<!-- ── Audit modal ───────────────────────────────────────────────────────── -->
{#if auditTokenId}
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div class="modal-backdrop" onclick={closeAudit}>
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Audit log">
			<div class="modal-header">
				<span class="modal-badge">AUDIT LOG</span>
				<button class="modal-close" onclick={closeAudit} aria-label="Close">✕</button>
			</div>
			<p class="modal-token-id">token: {auditTokenId}</p>

			{#if auditLoading}
				<p class="modal-loading">Loading…</p>
			{:else if auditRows.length === 0}
				<p class="modal-empty">No audit events found.</p>
			{:else}
				<div class="audit-rows">
					{#each auditRows as row, i (i)}
						<div class="audit-row">
							<span class="audit-action">{row.action}</span>
							<span class="audit-time">{fmtDate(row.timestamp)}</span>
							{#if row.actorUid}
								<span class="audit-actor">by {row.actorUid.slice(0, 8)}…</span>
							{/if}
							{#if row.consumedByUid}
								<span class="audit-actor">uid {row.consumedByUid.slice(0, 8)}…</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ── Page ── */
	.console {
		max-width: 900px;
		margin: 0 auto;
		padding: clamp(20px, 4vw, 40px);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.page-badge {
		display: inline-block;
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(20, 184, 166,0.8);
		background: rgba(20, 184, 166,0.08);
		border: 1px solid rgba(20, 184, 166,0.22);
		border-radius: 4px;
		padding: 2px 8px;
		margin-bottom: 6px;
	}

	.page-title {
		margin: 0 0 4px;
		font-size: clamp(18px, 3vw, 24px);
		font-weight: 900;
		color: #fff;
		letter-spacing: 0.04em;
	}

	.page-subtitle {
		margin: 0;
		font-size: 0.65rem;
		color: rgba(255,255,255,0.3);
		letter-spacing: 0.08em;
	}

	.compose-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.65rem 1.2rem;
		font-family: inherit;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #14b8a6;
		background: rgba(20, 184, 166,0.07);
		border: 1px solid rgba(20, 184, 166,0.35);
		border-radius: 8px;
		text-decoration: none;
		transition: background 0.18s, border-color 0.18s;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.compose-btn:hover {
		background: rgba(20, 184, 166,0.13);
		border-color: rgba(20, 184, 166,0.6);
	}

	/* ── Tabs ── */
	.tabs {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid rgba(255,255,255,0.07);
		overflow-x: auto;
	}

	.tab {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 1rem;
		font-family: inherit;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: rgba(255,255,255,0.3);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.tab--active {
		color: #14b8a6;
		border-bottom-color: #14b8a6;
	}

	.tab-count {
		background: rgba(255,255,255,0.08);
		border-radius: 3px;
		padding: 1px 5px;
		font-size: 0.55rem;
	}

	.tab--active .tab-count {
		background: rgba(20, 184, 166,0.12);
		color: rgba(20, 184, 166,0.8);
	}

	/* ── Error / empty ── */
	.error-banner {
		padding: 0.75rem 1rem;
		background: rgba(255,77,106,0.06);
		border: 1px solid rgba(255,77,106,0.2);
		border-radius: 8px;
		font-size: 0.7rem;
		color: rgba(255,77,106,0.8);
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: rgba(255,255,255,0.2);
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.empty-icon {
		font-size: 2rem;
	}

	/* ── Rows ── */
	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.row {
		background: rgba(8,10,18,0.8);
		border: 1px solid rgba(255,255,255,0.07);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		transition: border-color 0.15s;
	}

	.row:hover {
		border-color: rgba(20, 184, 166,0.18);
	}

	.row-main {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.row-info {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.row-email {
		margin: 0;
		font-size: 0.82rem;
		color: #e5e7eb;
		font-weight: 600;
		letter-spacing: 0.04em;
		word-break: break-all;
	}

	.row-meta {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.chip {
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		border-radius: 4px;
		padding: 2px 7px;
		border: 1px solid;
	}

	.chip--role    { color: rgba(168,85,247,0.8); background: rgba(168,85,247,0.08); border-color: rgba(168,85,247,0.25); }
	.chip--purpose { color: rgba(20, 184, 166,0.65); background: rgba(20, 184, 166,0.06); border-color: rgba(20, 184, 166,0.18); }
	.chip--team    { color: rgba(240,199,94,0.65); background: rgba(240,199,94,0.06); border-color: rgba(240,199,94,0.18); }

	.row-dates {
		margin: 0;
		font-size: 0.58rem;
		color: rgba(255,255,255,0.25);
		letter-spacing: 0.06em;
	}

	.row-actions {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		flex-shrink: 0;
	}

	.btn-primary {
		padding: 0.4rem 0.8rem;
		font-family: inherit;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(20, 184, 166,0.7);
		background: rgba(20, 184, 166,0.05);
		border: 1px solid rgba(20, 184, 166,0.2);
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}

	.btn-primary:hover:not(:disabled) {
		background: rgba(20, 184, 166,0.1);
		border-color: rgba(20, 184, 166,0.4);
	}

	.btn-primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-primary--danger {
		color: rgba(255,77,106,0.8);
		background: rgba(255,77,106,0.05);
		border-color: rgba(255,77,106,0.2);
	}

	.btn-primary--danger:hover:not(:disabled) {
		background: rgba(255,77,106,0.1);
		border-color: rgba(255,77,106,0.4);
	}

	.row-error {
		margin: 0.5rem 0 0;
		font-size: 0.6rem;
		color: rgba(255,77,106,0.8);
	}

	/* ── Audit modal ── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.7);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		z-index: 100;
	}

	.modal {
		background: #080a12;
		border: 1px solid rgba(20, 184, 166,0.2);
		border-radius: 16px;
		padding: 1.5rem;
		width: 100%;
		max-width: 560px;
		max-height: 80dvh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.modal-badge {
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(20, 184, 166,0.7);
	}

	.modal-close {
		background: none;
		border: none;
		color: rgba(255,255,255,0.4);
		cursor: pointer;
		font-size: 0.9rem;
		padding: 2px 6px;
	}

	.modal-close:hover {
		color: #fff;
	}

	.modal-token-id {
		margin: 0 0 1rem;
		font-size: 0.6rem;
		color: rgba(255,255,255,0.25);
		word-break: break-all;
	}

	.modal-loading,
	.modal-empty {
		font-size: 0.7rem;
		color: rgba(255,255,255,0.3);
		text-align: center;
		padding: 1.5rem 0;
	}

	.audit-rows {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.audit-row {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
		padding: 0.5rem 0.75rem;
		background: rgba(255,255,255,0.03);
		border-radius: 6px;
		font-size: 0.62rem;
	}

	.audit-action {
		color: #14b8a6;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 700;
		min-width: 80px;
	}

	.audit-time {
		color: rgba(255,255,255,0.4);
	}

	.audit-actor {
		color: rgba(168,85,247,0.7);
	}
</style>
