<script lang="ts">
	/**
	 * DirectorRetentionReport.svelte
	 * ────────────────────────────────
	 * DIRECTOR VIEW — PII Burn Protocol compliance dashboard.
	 *
	 * Displays:
	 *   1. Pending Deletions — documents verified but not yet burned (< 24h ago)
	 *   2. Completed Deletions — documents that have been burned from Storage
	 *   3. Compliance Export — generates a JSON audit export for league auditors
	 *
	 * Data source: `getRetentionReport` Cloud Function (reads `pending_deletions`).
	 */

	import { browser } from '$app/environment';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';

	// ── Types ──────────────────────────────────────────────────────────────────
	interface PendingDeletion {
		id: string;
		targetEmail: string;
		documentType: string;
		status: 'pending' | 'completed' | 'failed';
		scheduledDeleteAt: string | null;
		completedAt: string | null;
		requestedByEmail: string | null;
	}

	// ── State ──────────────────────────────────────────────────────────────────
	let pending = $state<PendingDeletion[]>([]);
	let completed = $state<PendingDeletion[]>([]);
	let loading = $state(false);
	let error = $state('');
	let showCompleted = $state(false);
	let exporting = $state(false);

	const canView = $derived(authStore.isDirector || authStore.isAdmin);

	// ── Cloud Function handles ─────────────────────────────────────────────────
	const getRetentionReportFn = browser
		? httpsCallable(getFunctions(undefined, 'us-east1'), 'getRetentionReport')
		: null;

	// ── Load ───────────────────────────────────────────────────────────────────
	$effect(() => {
		if (!browser || !canView) return;
		loadReport(false);
	});

	async function loadReport(withCompleted: boolean) {
		if (!getRetentionReportFn) return;
		loading = true; error = '';
		try {
			const res = await getRetentionReportFn({ includeCompleted: withCompleted });
			const docs = (res.data as { documents: PendingDeletion[] }).documents ?? [];
			pending = docs.filter((d) => d.status === 'pending');
			completed = docs.filter((d) => d.status === 'completed' || d.status === 'failed');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load retention report.';
		} finally {
			loading = false;
		}
	}

	async function toggleCompleted() {
		showCompleted = !showCompleted;
		if (showCompleted && completed.length === 0) await loadReport(true);
	}

	// ── Compliance Export ──────────────────────────────────────────────────────
	async function exportCompliance() {
		exporting = true;
		try {
			if (completed.length === 0) await loadReport(true);
			const exportData = {
				generatedAt: new Date().toISOString(),
				generatedBy: authStore.user?.email ?? 'unknown',
				pendingDeletions: pending,
				completedDeletions: completed,
				policy: 'Vanguard 24-Hour PII Burn Protocol v2026',
			};
			const blob = new Blob([JSON.stringify(exportData, null, 2)], {
				type: 'application/json',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `vanguard-retention-report-${new Date().toISOString().slice(0, 10)}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			exporting = false;
		}
	}

	function fmtDate(s: string | null): string {
		if (!s) return '—';
		const d = new Date(s);
		return d.toLocaleString('en-US', {
			month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit',
		});
	}

	function timeUntilBurn(scheduledAt: string | null): string {
		if (!scheduledAt) return '—';
		const ms = new Date(scheduledAt).getTime() - Date.now();
		if (ms <= 0) return 'BURNING SOON';
		const h = Math.floor(ms / 3_600_000);
		const m = Math.floor((ms % 3_600_000) / 60_000);
		return `${h}h ${m}m`;
	}
</script>

<div class="drr-root">
	<header class="drr-header">
		<div>
			<span class="drr-eyebrow">COMPLIANCE · PII BURN PROTOCOL</span>
			<h2 class="drr-title">RETENTION REPORT</h2>
		</div>
		<div class="drr-header__actions">
			<button class="drr-btn drr-btn--ghost" onclick={() => loadReport(showCompleted)} disabled={loading}>
				{#if loading}
					<span class="drr-spin" aria-hidden="true"></span>
				{:else}↺{/if}
			</button>
			<button class="drr-btn drr-btn--export" onclick={exportCompliance} disabled={exporting || loading}>
				{exporting ? 'EXPORTING…' : '⬇ EXPORT'}
			</button>
		</div>
	</header>

	<p class="drr-policy">
		<strong>Active Policy:</strong> Sensitive documents (birth certificates, photo IDs) are permanently
		deleted from storage 24 hours after a director verifies them. Verified status is retained indefinitely.
	</p>

	{#if error}
		<div class="drr-error" role="alert">{error}</div>
	{/if}

	<!-- ── Pending Deletions ─────────────────────────────────────────────── -->
	<section class="drr-section">
		<div class="drr-section__hd">
			<span class="drr-section__label">PENDING BURN</span>
			<span class="drr-badge drr-badge--warn">{pending.length}</span>
		</div>

		{#if pending.length === 0 && !loading}
			<div class="drr-empty">
				<span aria-hidden="true">◈</span>
				No documents pending deletion.
			</div>
		{:else}
			<div class="drr-table">
				<div class="drr-thead">
					<span>OPERATIVE</span>
					<span>DOCUMENT</span>
					<span>BURNS IN</span>
					<span>VERIFIED BY</span>
				</div>
				{#each pending as row (row.id)}
					<div class="drr-row drr-row--pending">
						<span class="drr-cell drr-cell--email">{row.targetEmail}</span>
						<span class="drr-cell drr-cell--doc">{row.documentType}</span>
						<span class="drr-cell drr-cell--countdown">
							<span class="drr-fire" aria-hidden="true">🔥</span>
							{timeUntilBurn(row.scheduledDeleteAt)}
						</span>
						<span class="drr-cell drr-cell--dim">{row.requestedByEmail ?? '—'}</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- ── Completed / Burned ────────────────────────────────────────────── -->
	<section class="drr-section">
		<div class="drr-section__hd">
			<span class="drr-section__label">BURNED (COMPLETED)</span>
			<span class="drr-badge drr-badge--ok">{completed.length}</span>
			<button class="drr-toggle" onclick={toggleCompleted}>
				{showCompleted ? 'HIDE' : 'SHOW'}
			</button>
		</div>

		{#if showCompleted}
			{#if completed.length === 0 && !loading}
				<div class="drr-empty">No completed deletions on record.</div>
			{:else}
				<div class="drr-table">
					<div class="drr-thead">
						<span>OPERATIVE</span>
						<span>DOCUMENT</span>
						<span>BURNED AT</span>
						<span>STATUS</span>
					</div>
					{#each completed as row (row.id)}
						<div class="drr-row" class:drr-row--failed={row.status === 'failed'}>
							<span class="drr-cell drr-cell--email">{row.targetEmail}</span>
							<span class="drr-cell drr-cell--doc">{row.documentType}</span>
							<span class="drr-cell drr-cell--dim">{fmtDate(row.completedAt)}</span>
							<span class="drr-cell"
								style:color={row.status === 'failed' ? 'rgba(255,50,80,0.8)' : 'rgba(20, 184, 166,0.7)'}>
								{row.status.toUpperCase()}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</section>
</div>

<style>
	.drr-root {
		background: rgba(6, 8, 16, 0.92);
		border: 1px solid rgba(20, 184, 166, 0.1);
		border-radius: 12px;
		overflow: hidden;
		font-family: 'JetBrains Mono', monospace;
	}

	.drr-header {
		display: flex; align-items: flex-start; justify-content: space-between;
		padding: 1.25rem 1.5rem 1rem;
		background: rgba(20, 184, 166, 0.03);
		border-bottom: 1px solid rgba(20, 184, 166, 0.08);
	}

	.drr-eyebrow {
		display: block;
		font-size: 0.55rem; font-weight: 700; letter-spacing: 0.22em;
		color: rgba(251, 146, 60, 0.7); margin-bottom: 0.3rem;
	}

	.drr-title {
		margin: 0; font-size: 0.9rem; font-weight: 900;
		letter-spacing: 0.08em; color: #fff;
	}

	.drr-header__actions { display: flex; gap: 0.5rem; align-items: center; }

	.drr-btn {
		padding: 0.35rem 0.75rem; border-radius: 6px;
		font-family: inherit; font-size: 0.65rem; font-weight: 700;
		letter-spacing: 0.1em; cursor: pointer; transition: all 0.15s;
	}
	.drr-btn--ghost {
		background: transparent; border: 1px solid rgba(255,255,255,0.1);
		color: rgba(255,255,255,0.35);
	}
	.drr-btn--ghost:hover:not(:disabled) { border-color: rgba(20, 184, 166,0.3); color: #14b8a6; }
	.drr-btn--export {
		background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.35);
		color: rgba(251,146,60,0.9);
	}
	.drr-btn--export:hover:not(:disabled) {
		background: rgba(251,146,60,0.18); box-shadow: 0 0 12px rgba(251,146,60,0.12);
	}
	.drr-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	.drr-spin {
		display: inline-block; width: 12px; height: 12px;
		border: 1.5px solid rgba(20, 184, 166,0.25); border-top-color: #14b8a6;
		border-radius: 50%; animation: spin 0.7s linear infinite;
	}

	.drr-policy {
		margin: 0; padding: 0.75rem 1.5rem;
		font-size: 0.68rem; line-height: 1.6;
		color: rgba(255,255,255,0.35);
		border-bottom: 1px solid rgba(255,255,255,0.05);
	}
	.drr-policy strong { color: rgba(251,146,60,0.75); font-weight: 700; }

	.drr-error {
		margin: 0.75rem 1.5rem; padding: 0.55rem 0.875rem;
		background: rgba(255,50,80,0.08); border: 1px solid rgba(255,50,80,0.2);
		border-radius: 6px; color: rgba(255,50,80,0.85); font-size: 0.7rem;
	}

	.drr-section { border-bottom: 1px solid rgba(255,255,255,0.05); }
	.drr-section:last-child { border-bottom: none; }

	.drr-section__hd {
		display: flex; align-items: center; gap: 0.6rem;
		padding: 0.75rem 1.5rem;
		background: rgba(0,0,0,0.2);
	}
	.drr-section__label {
		font-size: 0.58rem; font-weight: 700; letter-spacing: 0.18em;
		color: rgba(255,255,255,0.3);
	}

	.drr-badge {
		padding: 1px 7px; border-radius: 3px;
		font-size: 0.6rem; font-weight: 700;
	}
	.drr-badge--warn { background: rgba(251,146,60,0.15); color: rgba(251,146,60,0.8); }
	.drr-badge--ok   { background: rgba(20, 184, 166,0.1);   color: rgba(20, 184, 166,0.7); }

	.drr-toggle {
		margin-left: auto; padding: 2px 8px;
		background: transparent; border: 1px solid rgba(255,255,255,0.1);
		border-radius: 4px; color: rgba(255,255,255,0.3);
		font-family: inherit; font-size: 0.58rem; font-weight: 700;
		letter-spacing: 0.1em; cursor: pointer;
		transition: all 0.15s;
	}
	.drr-toggle:hover { border-color: rgba(20, 184, 166,0.3); color: #14b8a6; }

	.drr-empty {
		display: flex; align-items: center; justify-content: center;
		gap: 0.5rem; padding: 1.5rem;
		color: rgba(255,255,255,0.2); font-size: 0.7rem;
	}

	.drr-table { display: grid; }
	.drr-thead, .drr-row {
		display: grid;
		grid-template-columns: 1fr 140px 120px 160px;
		padding: 0.45rem 1.5rem;
		gap: 0; align-items: center;
	}
	.drr-thead {
		font-size: 0.52rem; font-weight: 700; letter-spacing: 0.18em;
		color: rgba(255,255,255,0.2);
		border-bottom: 1px solid rgba(255,255,255,0.05);
	}
	.drr-row { border-bottom: 1px solid rgba(255,255,255,0.03); }
	.drr-row--pending { background: rgba(251,146,60,0.02); }
	.drr-row--failed { background: rgba(255,50,80,0.03); }

	.drr-cell { font-size: 0.68rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.drr-cell--email { color: rgba(255,255,255,0.75); }
	.drr-cell--doc { color: rgba(20, 184, 166,0.6); font-size: 0.62rem; }
	.drr-cell--dim { color: rgba(255,255,255,0.35); }
	.drr-cell--countdown {
		display: flex; align-items: center; gap: 0.3rem;
		color: rgba(251,146,60,0.8); font-weight: 700;
	}
	.drr-fire { font-size: 0.75rem; }

	@keyframes spin { to { transform: rotate(360deg); } }

	@media (max-width: 600px) {
		.drr-thead, .drr-row { grid-template-columns: 1fr 120px; }
		.drr-cell:nth-child(3), .drr-cell:nth-child(4),
		.drr-thead span:nth-child(3), .drr-thead span:nth-child(4) { display: none; }
	}
</style>
