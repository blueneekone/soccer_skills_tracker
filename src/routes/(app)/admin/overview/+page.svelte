<script>
	import { db } from '$lib/firebase.js';
	import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { safeGetDate } from '$lib/utils/dates.js';
	import '$lib/styles/enterprise-console.css';

	// ── Executive KPI counts ─────────────────────────────────────────────────────
	let userCount     = $state(0);
	let licenseCount  = $state(0);
	let countsLoading = $state(false);
	let countsErr     = $state('');

	const clubCount   = $derived(teamsStore.clubs.length);
	const adminCount  = $derived(teamsStore.admins.length);

	$effect(() => {
		if (!teamsStore.loaded) return;
		let cancelled = false;
		countsLoading = true;
		countsErr = '';
		void Promise.all([
			getDocs(collection(db, 'users')),
			getDocs(collection(db, 'licenses')),
		])
			.then(([usersSnap, licensesSnap]) => {
				if (cancelled) return;
				userCount    = usersSnap.size;
				licenseCount = licensesSnap.size;
			})
			.catch((e) => {
				if (cancelled) return;
				countsErr = e instanceof Error ? e.message : 'Could not load counts.';
			})
			.finally(() => { if (!cancelled) countsLoading = false; });
		return () => { cancelled = true; };
	});

	// ── Recent activity feed — last 10 security_audit events ────────────────────
	/** @typedef {{ id: string, timestamp: unknown, admin: unknown, action: unknown, target: unknown }} ActivityRow */

	/** @type {ActivityRow[]} */
	let recentActivity = $state([]);
	let activityLoading = $state(false);

	$effect(() => {
		if (!teamsStore.loaded) return;
		let cancelled = false;
		activityLoading = true;
		void getDocs(
			query(collection(db, 'security_audit'), orderBy('timestamp', 'desc'), limit(10)),
		)
			.then((snap) => {
				if (cancelled) return;
				/** @type {ActivityRow[]} */
				const rows = [];
				snap.forEach((d) => rows.push({ id: d.id, .../** @type {Omit<ActivityRow,'id'>} */ (d.data()) }));
				recentActivity = rows;
			})
			.catch((e) => console.error('[overview] activity', e))
			.finally(() => { if (!cancelled) activityLoading = false; });
		return () => { cancelled = true; };
	});

	/**
	 * Color-code action by severity keyword for the activity feed.
	 * @param {unknown} action
	 */
	function activityColor(action) {
		const a = String(action || '').toUpperCase();
		if (a.includes('DELETE') || a.includes('REVOKE')) return 'var(--danger-red, #b91c1c)';
		if (a.includes('GRANT') || a.includes('CREATE') || a.includes('ASSIGN')) return '#16a34a';
		if (a.includes('EDIT') || a.includes('UPDATE')) return '#d97706';
		return 'var(--text-secondary)';
	}
</script>

<div class="ov3-page">

	<!-- ── Executive stat bar ─────────────────────────────────────────────────── -->
	<section class="ov3-stats" aria-label="Platform metrics">
		<div class="ov3-stat">
			<span class="ov3-stat__label">Total Users</span>
			<span class="ov3-stat__value">
				{countsLoading ? '—' : userCount.toLocaleString()}
			</span>
		</div>
		<div class="ov3-stats__divider" aria-hidden="true"></div>
		<div class="ov3-stat">
			<span class="ov3-stat__label">Organizations</span>
			<span class="ov3-stat__value">{clubCount.toLocaleString()}</span>
		</div>
		<div class="ov3-stats__divider" aria-hidden="true"></div>
		<div class="ov3-stat">
			<span class="ov3-stat__label">Active Licenses</span>
			<span class="ov3-stat__value">
				{countsLoading ? '—' : licenseCount.toLocaleString()}
			</span>
		</div>
		<div class="ov3-stats__divider" aria-hidden="true"></div>
		<div class="ov3-stat">
			<span class="ov3-stat__label">Platform Admins</span>
			<span class="ov3-stat__value">{adminCount}</span>
		</div>
	</section>

	{#if countsErr}
		<p class="ov3-err" role="alert">{countsErr}</p>
	{/if}

	<!-- ── Recent platform activity ──────────────────────────────────────────── -->
	<section class="ov3-activity">
		<header class="ov3-activity__header">
			<h2 class="ov3-activity__title">Recent Activity</h2>
			<a href="/admin/audit-log" class="ov3-activity__all-link">
				View full audit log <i class="ph ph-arrow-right" aria-hidden="true"></i>
			</a>
		</header>

		{#if activityLoading}
			<p class="ov3-activity__loading">Loading activity…</p>
		{:else if recentActivity.length === 0}
			<p class="ov3-activity__empty">No security events recorded yet.</p>
		{:else}
			<div class="ov3-activity__feed" role="log" aria-live="off">
				{#each recentActivity as row (row.id)}
					<div class="ov3-feed-row">
						<span
							class="ov3-feed-row__action"
							style="--action-color: {activityColor(row.action)}"
						>
							{row.action || '—'}
						</span>
						<span class="ov3-feed-row__target">{row.target || '—'}</span>
						<span class="ov3-feed-row__admin">{row.admin || '—'}</span>
						<span class="ov3-feed-row__ts">
							{safeGetDate(row.timestamp).toLocaleString()}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>

</div>

<style>
	.ov3-page {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* ── Executive stat bar ─────────────────────────────────────────── */
	.ov3-stats {
		display: flex;
		align-items: stretch;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 10px;
		background: var(--glass-bg, #fff);
		overflow: hidden;
		margin-bottom: 28px;
	}

	:global(html.dark) .ov3-stats {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ov3-stat {
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 20px 24px;
		min-width: 0;
	}

	.ov3-stats__divider {
		flex-shrink: 0;
		width: 1px;
		background: var(--border-subtle, #e5e5e5);
		margin: 14px 0;
	}

	:global(html.dark) .ov3-stats__divider {
		background: rgba(255, 255, 255, 0.08);
	}

	.ov3-stat__label {
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.ov3-stat__value {
		font-size: 1.875rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	@media (max-width: 680px) {
		.ov3-stats {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
		.ov3-stats__divider {
			display: none;
		}
		.ov3-stat {
			padding: 16px;
			border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		}
		:global(html.dark) .ov3-stat {
			border-bottom-color: rgba(255, 255, 255, 0.08);
		}
	}

	/* ── Error ──────────────────────────────────────────────────────── */
	.ov3-err {
		margin: 0 0 16px;
		padding: 12px 14px;
		border-radius: 10px;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--danger-red, #b91c1c);
		background: rgba(185, 28, 28, 0.08);
		border: 1px solid rgba(185, 28, 28, 0.25);
	}

	/* ── Activity feed ──────────────────────────────────────────────── */
	.ov3-activity__header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}

	.ov3-activity__title {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
	}

	.ov3-activity__all-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--brand-primary, #d97706);
		text-decoration: none;
		opacity: 0.85;
	}

	.ov3-activity__all-link:hover {
		opacity: 1;
	}

	.ov3-activity__loading,
	.ov3-activity__empty {
		margin: 0;
		padding: 20px 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.ov3-activity__feed {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 10px;
		overflow: hidden;
		background: var(--glass-bg, #fff);
	}

	:global(html.dark) .ov3-activity__feed {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	/* Each feed row */
	.ov3-feed-row {
		display: grid;
		grid-template-columns: 160px 1fr 180px 140px;
		align-items: center;
		gap: 0;
		padding: 9px 16px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		font-size: 0.8125rem;
		transition: background 0.08s ease;
	}

	.ov3-feed-row:last-child {
		border-bottom: none;
	}

	.ov3-feed-row:hover {
		background: rgba(0, 0, 0, 0.018);
	}

	:global(html.dark) .ov3-feed-row {
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	:global(html.dark) .ov3-feed-row:hover {
		background: rgba(255, 255, 255, 0.025);
	}

	.ov3-feed-row__action {
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--action-color, var(--text-secondary));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ov3-feed-row__target {
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 0 12px;
	}

	.ov3-feed-row__admin {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ov3-feed-row__ts {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.72rem;
		color: var(--text-secondary);
		text-align: right;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 800px) {
		.ov3-feed-row {
			grid-template-columns: 120px 1fr 120px;
		}
		.ov3-feed-row__ts {
			display: none;
		}
	}

	@media (max-width: 560px) {
		.ov3-feed-row {
			grid-template-columns: 100px 1fr;
		}
		.ov3-feed-row__admin {
			display: none;
		}
	}
</style>
