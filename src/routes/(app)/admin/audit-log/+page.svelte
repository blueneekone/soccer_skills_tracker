<script>
	import { db } from '$lib/firebase.js';
	import {
		collection,
		query,
		orderBy,
		limit,
		startAfter,
		getDocs,
	} from 'firebase/firestore';
	import { safeGetDate } from '$lib/utils/dates.js';
	import '$lib/styles/enterprise-console.css';

	const PAGE_SIZE = 100;

	/** @typedef {{ id: string, timestamp: unknown, admin: unknown, action: unknown, target: unknown, details: unknown }} AuditRow */

	/** @type {AuditRow[]} */
	let logs = $state([]);
	let loading = $state(false);
	let loadErr = $state('');
	let totalLoaded = $state(0);
	/** @type {import('firebase/firestore').QueryDocumentSnapshot | null} */
	let lastDoc = $state(null);
	let hasMore = $state(false);

	/** @type {string} */
	let actionFilter = $state('');
	/** Full-text search across action, admin, target, details (Strike 13 toolbar). */
	let searchQuery = $state('');

	const filteredLogs = $derived.by(() => {
		let rows = logs;
		const needle = searchQuery.trim().toLowerCase();
		if (needle) {
			rows = rows.filter((l) => {
				const blob = [l.action, l.admin, l.target, l.details]
					.map((x) => String(x ?? '').toLowerCase())
					.join(' ');
				return blob.includes(needle);
			});
		}
		const q = actionFilter.trim().toUpperCase();
		if (q) rows = rows.filter((l) => String(l.action || '').toUpperCase().includes(q));
		return rows;
	});

	async function loadLogs(append = false) {
		loading = true;
		loadErr = '';
		try {
			let q;
			if (append && lastDoc) {
				q = query(
					collection(db, 'security_audit'),
					orderBy('timestamp', 'desc'),
					startAfter(lastDoc),
					limit(PAGE_SIZE),
				);
			} else {
				q = query(
					collection(db, 'security_audit'),
					orderBy('timestamp', 'desc'),
					limit(PAGE_SIZE),
				);
			}
			const snap = await getDocs(q);
			/** @type {AuditRow[]} */
			const rows = [];
			snap.forEach((d) => {
				rows.push({ id: d.id, .../** @type {Omit<AuditRow,'id'>} */ (d.data()) });
			});
			if (append) {
				logs = [...logs, ...rows];
			} else {
				logs = rows;
			}
			totalLoaded = logs.length;
			lastDoc = snap.docs[snap.docs.length - 1] ?? null;
			hasMore = snap.size === PAGE_SIZE;
		} catch (e) {
			loadErr = e instanceof Error ? e.message : 'Could not load audit log.';
		} finally {
			loading = false;
		}
	}

	// Initial load
	loadLogs();

	/**
	 * Color-codes an action badge by severity keyword.
	 * @param {unknown} action
	 */
	function actionSeverityClass(action) {
		const a = String(action || '').toUpperCase();
		if (a.includes('DELETE') || a.includes('REVOKE')) return 'al-badge--danger';
		if (a.includes('GRANT') || a.includes('ASSIGN') || a.includes('CREATE')) return 'al-badge--success';
		if (a.includes('EDIT') || a.includes('UPDATE')) return 'al-badge--warn';
		return 'al-badge--neutral';
	}
</script>

<div class="al-page">

	<div class="adm-toolbar al-page__toolbar">
		<div class="adm-toolbar__left">
			<h1 class="adm-toolbar__title adm-toolbar__title--icon">
				<i class="ph ph-shield-check" aria-hidden="true"></i>
				Security Audit Log
			</h1>
			<div class="adm-toolbar__meta">
				<span class="adm-toolbar__sub">Immutable platform-level event history.</span>
				<span class="adm-toolbar__count">
					Showing {filteredLogs.length} of {totalLoaded} loaded events
				</span>
			</div>
		</div>
		<div class="adm-toolbar__right">
			<div class="adm-search-wrap">
				<i class="ph ph-magnifying-glass adm-search-icon" aria-hidden="true"></i>
				<input
					type="search"
					class="adm-search tw-!pl-10 tw-text-sm"
					bind:value={searchQuery}
					placeholder="Search events…"
					autocomplete="off"
					aria-label="Search audit log"
				/>
			</div>
			<div class="al-toolbar__filter">
				<label class="al-toolbar__filter-label" for="al-action-filter">Filters</label>
				<input
					id="al-action-filter"
					type="search"
					class="al-filter-input"
					bind:value={actionFilter}
					placeholder="Action…"
					autocomplete="off"
					aria-label="Filter audit log by action"
				/>
			</div>
			<button
				type="button"
				class="al-toolbar-refresh"
				onclick={() => loadLogs()}
				disabled={loading}
				title={loading ? 'Loading…' : 'Refresh audit log'}
				aria-label="Refresh audit log"
			>
				<i
					class="ph ph-arrows-clockwise tw-text-lg {loading ? 'al-refresh-spin' : ''}"
					aria-hidden="true"
				></i>
			</button>
		</div>
	</div>

	{#if loadErr}
		<div class="al-err" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			{loadErr}
		</div>
	{/if}

	<!-- ── Log table ──────────────────────────────────────────────────────────── -->
	<div class="card">
		<div class="card-body al-table-body">
			<div class="al-table-wrap">
				<table class="admin-table al-table">
					<thead>
						<tr>
							<th class="al-th-ts">Timestamp</th>
							<th class="al-th-admin">Admin Identity</th>
							<th class="al-th-action">Action</th>
							<th>Target / Details</th>
						</tr>
					</thead>
					<tbody>
						{#if loading && logs.length === 0}
							<tr>
								<td colspan="4" class="text-center al-td-loading">
									Decrypting secure audit logs…
								</td>
							</tr>
						{:else if filteredLogs.length === 0}
							<tr>
								<td colspan="4" class="text-center">
									{logs.length === 0 ? 'No security events recorded yet.' : 'No events match your filter.'}
								</td>
							</tr>
						{:else}
							{#each filteredLogs as log (log.id)}
								<tr class="al-row">
									<td class="al-td-ts">
										{safeGetDate(log.timestamp).toLocaleString()}
									</td>
									<td class="al-td-admin">{log.admin || '—'}</td>
									<td class="al-td-action">
										<span class="al-badge {actionSeverityClass(log.action)}">
											{log.action || '—'}
										</span>
									</td>
									<td class="al-td-detail">
										<strong class="al-td-target">{log.target || '—'}</strong>
										{#if log.details}
											<span class="al-td-details-sub">{log.details}</span>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- ── Load more ──────────────────────────────────────────────────────────── -->
	{#if hasMore}
		<div class="al-load-more">
			<button
				type="button"
				class="secondary-btn"
				onclick={() => loadLogs(true)}
				disabled={loading}
			>
				{loading ? 'Loading…' : `Load ${PAGE_SIZE} more events`}
			</button>
			<span class="al-load-more__hint">
				{totalLoaded} events loaded so far
			</span>
		</div>
	{/if}

</div>

<style>
	.al-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.al-page__toolbar {
		margin-bottom: 4px;
	}

	.al-toolbar__filter {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.al-toolbar__filter-label {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.al-toolbar-refresh {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		flex-shrink: 0;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			background 0.12s ease,
			border-color 0.12s ease,
			color 0.12s ease;
	}

	.al-toolbar-refresh:hover:not(:disabled) {
		border-color: var(--brand-primary, #f59e0b);
		color: var(--text-primary);
	}

	.al-toolbar-refresh:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(html.dark) .al-toolbar-refresh {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.1);
		color: #d4d4d8;
	}

	.al-filter-input {
		height: 38px;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--input-bg, #fff);
		font: inherit;
		font-size: 0.875rem;
		color: var(--text-primary);
		min-width: 140px;
		width: 200px;
		max-width: 100%;
		box-sizing: border-box;
	}

	:global(html.dark) .al-filter-input {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.al-refresh-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}

	.al-refresh-spin {
		animation: al-refresh-spin 0.85s linear infinite;
	}

	@keyframes al-refresh-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── Error state ────────────────────────────────────────────────── */
	.al-err {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px;
		background: rgba(185, 28, 28, 0.08);
		border: 1px solid rgba(185, 28, 28, 0.3);
		border-radius: 14px;
		color: var(--danger-red, #b91c1c);
		font-weight: 600;
		font-size: 0.9rem;
	}

	/* ── Table ──────────────────────────────────────────────────────── */
	.al-table-body {
		padding: 0 !important;
	}

	.al-table-wrap {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.al-table {
		width: 100%;
		min-width: 680px;
		table-layout: auto;
	}

	.al-th-ts     { width: 160px; white-space: nowrap; }
	.al-th-admin  { width: 200px; }
	.al-th-action { width: 160px; }

	.al-row:hover {
		background: var(--surface-subtle, rgba(0, 0, 0, 0.02));
	}

	.al-td-ts {
		font-size: 0.78rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		font-family: ui-monospace, monospace;
	}

	.al-td-admin {
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
		color: var(--text-secondary);
		word-break: break-all;
	}

	.al-td-action {
		vertical-align: middle;
	}

	.al-td-detail {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.al-td-target {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.al-td-details-sub {
		font-size: 0.75rem;
		color: var(--text-secondary);
		word-break: break-word;
	}

	.al-td-loading {
		color: var(--text-secondary);
		font-style: italic;
		padding: 32px !important;
	}

	/* ── Action severity badges ─────────────────────────────────────── */
	.al-badge {
		display: inline-block;
		padding: 4px 9px;
		border-radius: 6px;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
		border: 1px solid transparent;
	}

	.al-badge--danger {
		background: #fef2f2;
		color: #991b1b;
		border-color: rgba(220, 38, 38, 0.2);
	}

	.al-badge--success {
		background: rgba(22, 163, 74, 0.1);
		color: #15803d;
		border-color: rgba(22, 163, 74, 0.25);
	}

	.al-badge--warn {
		background: rgba(245, 158, 11, 0.1);
		color: #d97706;
		border-color: rgba(245, 158, 11, 0.3);
	}

	.al-badge--neutral {
		background: rgba(99, 102, 241, 0.08);
		color: #4f46e5;
		border-color: rgba(99, 102, 241, 0.2);
	}

	:global(html.dark) .al-badge--danger {
		background: rgba(254, 202, 202, 0.1);
		color: #fecaca;
		border-color: rgba(248, 113, 113, 0.35);
	}

	:global(html.dark) .al-badge--success {
		background: rgba(134, 239, 172, 0.1);
		color: #86efac;
		border-color: rgba(134, 239, 172, 0.3);
	}

	:global(html.dark) .al-badge--warn {
		background: rgba(253, 230, 138, 0.1);
		color: #fde68a;
		border-color: rgba(253, 230, 138, 0.3);
	}

	:global(html.dark) .al-badge--neutral {
		background: rgba(165, 180, 252, 0.1);
		color: #a5b4fc;
		border-color: rgba(165, 180, 252, 0.25);
	}

	/* ── Load more ──────────────────────────────────────────────────── */
	.al-load-more {
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
		justify-content: center;
		padding-top: 4px;
	}

	.al-load-more__hint {
		font-size: 0.82rem;
		color: var(--text-secondary);
	}
</style>
