<script>
	/**
	 * Sprint 2.6.1 — Recruiter Marketplace Oversight.
	 *
	 * Approval and monitoring dashboard for NCAA / Pro / Club scouts.
	 * Backed by the `recruiters` Firestore collection (document id ==
	 * lowercased scout email). Super-admin only.
	 *
	 * Columns: Agency / University · Scout name · Subscription status ·
	 * Verification status · Actions (Approve / Reject).
	 */

	import { db } from '$lib/firebase.js';
	import {
		collection,
		doc,
		getDocs,
		orderBy,
		query,
		serverTimestamp,
		updateDoc
	} from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import '$lib/styles/enterprise-console.css';

	// ── Types ────────────────────────────────────────────────────────────────
	/**
	 * @typedef {'pending' | 'verified' | 'rejected'} VerificationStatus
	 * @typedef {'none' | 'trial' | 'active' | 'past_due' | 'cancelled'} SubscriptionStatus
	 *
	 * @typedef {{
	 *   id: string,
	 *   email: string,
	 *   scoutName: string,
	 *   agency: string,
	 *   affiliationType: string,
	 *   phone: string,
	 *   region: string,
	 *   verificationStatus: VerificationStatus,
	 *   subscriptionStatus: SubscriptionStatus,
	 *   subscriptionTier: string,
	 *   lastActiveAt: number,
	 *   createdAt: number,
	 *   notes: string,
	 * }} RecruiterRow
	 */

	// ── State ────────────────────────────────────────────────────────────────
	/** @type {RecruiterRow[]} */
	let rows = $state([]);
	let loading = $state(true);
	let err = $state('');

	/** @type {'' | VerificationStatus} */
	let statusFilter = $state('');
	let searchInput = $state('');
	let busyFor = $state('');
	let rejectingFor = $state('');
	let rejectReason = $state('');
	let flashOk = $state('');
	let flashErr = $state('');

	// ── Utilities ────────────────────────────────────────────────────────────
	/** @param {unknown} v */
	function toEpochMs(v) {
		if (v == null) return 0;
		if (typeof v === 'number' && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
		if (typeof v === 'string') {
			const n = Number(v);
			if (Number.isFinite(n) && n > 0) return n > 1e12 ? n : n * 1000;
			const parsed = Date.parse(v);
			return Number.isFinite(parsed) ? parsed : 0;
		}
		if (typeof v === 'object' && v !== null) {
			const o = /** @type {Record<string, unknown>} */ (v);
			if (typeof o.toMillis === 'function') {
				try {
					return /** @type {() => number} */ (o.toMillis)();
				} catch {
					/* fall through */
				}
			}
			if (typeof o.seconds === 'number') {
				return o.seconds * 1000 + (typeof o.nanoseconds === 'number' ? Math.floor(o.nanoseconds / 1e6) : 0);
			}
			if (typeof o.toDate === 'function') {
				try {
					return /** @type {() => Date} */ (o.toDate)().getTime();
				} catch {
					/* fall through */
				}
			}
		}
		return 0;
	}

	/** @param {number} ts */
	function formatRelative(ts) {
		if (!ts || !Number.isFinite(ts)) return '—';
		const diff = Date.now() - ts;
		if (diff < 0) return 'Just now';
		const MIN = 60_000;
		const HR = 60 * MIN;
		const DAY = 24 * HR;
		if (diff < MIN) return 'Just now';
		if (diff < HR) return `${Math.floor(diff / MIN)}m ago`;
		if (diff < DAY) return `${Math.floor(diff / HR)}h ago`;
		if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
		try {
			return new Date(ts).toLocaleDateString();
		} catch {
			return '—';
		}
	}

	/** @param {string} name */
	function initials(name) {
		const s = (name || '').trim();
		if (!s) return '•';
		const parts = s.split(/\s+/).filter(Boolean);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	/** @param {string} raw */
	function coerceVerification(raw) {
		const v = (raw || '').toLowerCase();
		if (v === 'verified' || v === 'rejected') return v;
		return 'pending';
	}

	/** @param {string} raw */
	function coerceSubscription(raw) {
		const v = (raw || '').toLowerCase();
		if (v === 'trial' || v === 'active' || v === 'past_due' || v === 'cancelled') return v;
		return 'none';
	}

	// ── Load ─────────────────────────────────────────────────────────────────
	async function loadRecruiters() {
		loading = true;
		err = '';
		try {
			const snap = await getDocs(
				query(collection(db, 'recruiters'), orderBy('email'))
			);
			/** @type {RecruiterRow[]} */
			const next = [];
			snap.forEach((d) => {
				const raw = /** @type {Record<string, unknown>} */ (d.data() || {});
				const email = typeof raw.email === 'string' && raw.email ? raw.email : d.id;
				next.push({
					id: d.id,
					email,
					scoutName: typeof raw.scoutName === 'string' ? raw.scoutName.trim() : '',
					agency: typeof raw.agency === 'string' ? raw.agency.trim() : '',
					affiliationType:
						typeof raw.affiliationType === 'string' ? raw.affiliationType.trim() : '',
					phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
					region: typeof raw.region === 'string' ? raw.region.trim() : '',
					verificationStatus: /** @type {VerificationStatus} */ (
						coerceVerification(typeof raw.verificationStatus === 'string' ? raw.verificationStatus : '')
					),
					subscriptionStatus: /** @type {SubscriptionStatus} */ (
						coerceSubscription(typeof raw.subscriptionStatus === 'string' ? raw.subscriptionStatus : '')
					),
					subscriptionTier:
						typeof raw.subscriptionTier === 'string' ? raw.subscriptionTier.trim() : '',
					lastActiveAt: toEpochMs(raw.lastActiveAt ?? raw.lastLoginAt ?? raw.updatedAt),
					createdAt: toEpochMs(raw.createdAt),
					notes: typeof raw.notes === 'string' ? raw.notes : ''
				});
			});
			rows = next;
		} catch (e) {
			console.error('[admin-recruiters] load failed', e);
			err = e instanceof Error ? e.message : 'Could not load recruiters.';
			rows = [];
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		if (authStore.role !== 'super_admin' && authStore.role !== 'global_admin') {
			err = 'You must be a super admin to view this page.';
			loading = false;
			return;
		}
		void loadRecruiters();
	});

	// ── Filter view ──────────────────────────────────────────────────────────
	const filteredRows = $derived.by(() => {
		const q = (searchInput || '').toLowerCase().trim();
		return rows.filter((r) => {
			if (statusFilter && r.verificationStatus !== statusFilter) return false;
			if (!q) return true;
			return (
				r.email.toLowerCase().includes(q) ||
				r.scoutName.toLowerCase().includes(q) ||
				r.agency.toLowerCase().includes(q)
			);
		});
	});

	const counts = $derived.by(() => {
		let pending = 0;
		let verified = 0;
		let rejected = 0;
		for (const r of rows) {
			if (r.verificationStatus === 'pending') pending += 1;
			else if (r.verificationStatus === 'verified') verified += 1;
			else if (r.verificationStatus === 'rejected') rejected += 1;
		}
		return { pending, verified, rejected, total: rows.length };
	});

	// ── Actions ──────────────────────────────────────────────────────────────
	/**
	 * @param {RecruiterRow} row
	 * @param {VerificationStatus} next
	 * @param {string} [reason]
	 */
	async function updateVerification(row, next, reason = '') {
		if (busyFor) return;
		busyFor = row.id;
		flashOk = '';
		flashErr = '';
		try {
			const ref = doc(db, 'recruiters', row.id);
			/** @type {Record<string, unknown>} */
			const patch = {
				verificationStatus: next,
				verificationUpdatedAt: serverTimestamp(),
				verificationUpdatedBy: authStore.user?.email || 'super_admin'
			};
			if (next === 'rejected') {
				patch.rejectionReason = reason.trim().slice(0, 500);
			} else {
				patch.rejectionReason = '';
			}
			await updateDoc(ref, patch);

			await logSecurityEvent(
				next === 'verified'
					? 'RECRUITER_APPROVE'
					: next === 'rejected'
						? 'RECRUITER_REJECT'
						: 'RECRUITER_RESET',
				row.email,
				reason
			);

			const idx = rows.findIndex((r) => r.id === row.id);
			if (idx >= 0) {
				rows = [
					...rows.slice(0, idx),
					{ ...rows[idx], verificationStatus: next },
					...rows.slice(idx + 1)
				];
			}
			flashOk =
				next === 'verified'
					? `${row.email} approved.`
					: next === 'rejected'
						? `${row.email} rejected.`
						: `${row.email} returned to pending.`;
		} catch (e) {
			console.error('[admin-recruiters] update failed', e);
			flashErr = e instanceof Error ? e.message : 'Update failed.';
		} finally {
			busyFor = '';
			rejectingFor = '';
			rejectReason = '';
		}
	}

	/** @param {RecruiterRow} row */
	function approve(row) {
		if (row.verificationStatus === 'verified') return;
		const ok = confirm(
			`Approve ${row.email} (${row.agency || 'no agency'}) as a verified recruiter?`
		);
		if (!ok) return;
		void updateVerification(row, 'verified');
	}

	/** @param {RecruiterRow} row */
	function openReject(row) {
		rejectingFor = row.id;
		rejectReason = '';
	}

	function cancelReject() {
		rejectingFor = '';
		rejectReason = '';
	}

	/** @param {RecruiterRow} row */
	function confirmReject(row) {
		if (!rejectReason.trim()) {
			flashErr = 'A rejection reason is required for the audit trail.';
			return;
		}
		void updateVerification(row, 'rejected', rejectReason);
	}

	/** @param {RecruiterRow} row */
	function resetPending(row) {
		if (row.verificationStatus === 'pending') return;
		void updateVerification(row, 'pending');
	}
</script>

<div class="ar-root">
	<header class="ar-head">
		<div class="ar-head__left">
			<h1 class="ar-title">Recruiter Marketplace</h1>
			<p class="ar-sub">
				Super-admin oversight for NCAA, Pro and Club scouts. Approve, reject, and monitor
				subscription health. Every action is written to <code>security_audit</code>.
			</p>
		</div>
		<div class="ar-head__right">
			<div class="ar-filter" role="search">
				<i class="ph ph-magnifying-glass" aria-hidden="true"></i>
				<input
					type="search"
					bind:value={searchInput}
					placeholder="Search by email, scout name, or agency"
					aria-label="Filter recruiters"
					autocomplete="off"
					spellcheck="false"
				/>
			</div>
			<div class="ar-tabs" role="tablist" aria-label="Verification filter">
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === ''}
					class="ar-tab"
					class:ar-tab--on={statusFilter === ''}
					onclick={() => (statusFilter = '')}
				>
					All <span class="ar-tab__n">{counts.total}</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === 'pending'}
					class="ar-tab"
					class:ar-tab--on={statusFilter === 'pending'}
					onclick={() => (statusFilter = 'pending')}
				>
					Pending <span class="ar-tab__n">{counts.pending}</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === 'verified'}
					class="ar-tab"
					class:ar-tab--on={statusFilter === 'verified'}
					onclick={() => (statusFilter = 'verified')}
				>
					Verified <span class="ar-tab__n">{counts.verified}</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === 'rejected'}
					class="ar-tab"
					class:ar-tab--on={statusFilter === 'rejected'}
					onclick={() => (statusFilter = 'rejected')}
				>
					Rejected <span class="ar-tab__n">{counts.rejected}</span>
				</button>
			</div>
		</div>
	</header>

	{#if flashErr}
		<p class="ar-flash ar-flash--err" role="alert">{flashErr}</p>
	{/if}
	{#if flashOk}
		<p class="ar-flash ar-flash--ok" role="status">{flashOk}</p>
	{/if}
	{#if err}
		<p class="ar-flash ar-flash--err" role="alert">{err}</p>
	{/if}

	<div class="ar-table-wrap" role="region" aria-label="Recruiters table" tabindex="-1">
		<table class="ar-table">
			<thead>
				<tr>
					<th class="ar-th ar-th--avatar" aria-label="Avatar"></th>
					<th class="ar-th">Agency / University</th>
					<th class="ar-th">Scout</th>
					<th class="ar-th">Subscription</th>
					<th class="ar-th">Verification</th>
					<th class="ar-th">Last Active</th>
					<th class="ar-th ar-th--right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr>
						<td colspan="7" class="ar-td-empty">Loading recruiters…</td>
					</tr>
				{:else if filteredRows.length === 0}
					<tr>
						<td colspan="7" class="ar-td-empty">
							{searchInput || statusFilter
								? 'No recruiters match the current filter.'
								: 'No recruiter applications yet.'}
						</td>
					</tr>
				{:else}
					{#each filteredRows as row (row.id)}
						<tr class="ar-tr">
							<td class="ar-td ar-td--avatar">
								<span class="ar-avatar" aria-hidden="true">
									{initials(row.agency || row.scoutName || row.email)}
								</span>
							</td>
							<td class="ar-td">
								<div class="ar-agency">
									<span class="ar-agency__primary">
										{row.agency || '—'}
									</span>
									{#if row.affiliationType}
										<span class="ar-agency__type">{row.affiliationType}</span>
									{/if}
									{#if row.region}
										<span class="ar-agency__meta">
											<i class="ph ph-map-pin" aria-hidden="true"></i>
											{row.region}
										</span>
									{/if}
								</div>
							</td>
							<td class="ar-td">
								<div class="ar-scout">
									<span class="ar-scout__name">{row.scoutName || '—'}</span>
									<span class="ar-scout__email">{row.email}</span>
								</div>
							</td>
							<td class="ar-td">
								<span class="ar-sub-pill ar-sub-pill--{row.subscriptionStatus}">
									{row.subscriptionStatus.replace('_', ' ')}
								</span>
								{#if row.subscriptionTier}
									<span class="ar-sub-tier">{row.subscriptionTier}</span>
								{/if}
							</td>
							<td class="ar-td">
								<span
									class="ar-verify-pill ar-verify-pill--{row.verificationStatus}"
								>
									<i
										class="ph {row.verificationStatus === 'verified'
											? 'ph-seal-check'
											: row.verificationStatus === 'rejected'
												? 'ph-prohibit'
												: 'ph-hourglass-medium'}"
										aria-hidden="true"
									></i>
									{row.verificationStatus}
								</span>
							</td>
							<td class="ar-td">
								<span class="ar-muted" title={row.createdAt ? `created ${new Date(row.createdAt).toISOString()}` : ''}>
									{formatRelative(row.lastActiveAt)}
								</span>
							</td>
							<td class="ar-td ar-td--right">
								{#if rejectingFor === row.id}
									<div class="ar-reject-inline">
										<input
											type="text"
											bind:value={rejectReason}
											placeholder="Reason for rejection (required)"
											maxlength="500"
											aria-label="Rejection reason"
										/>
										<button
											type="button"
											class="ar-btn ar-btn--danger"
											onclick={() => confirmReject(row)}
											disabled={busyFor === row.id}
										>
											{busyFor === row.id ? 'Rejecting…' : 'Confirm reject'}
										</button>
										<button
											type="button"
											class="ar-btn ar-btn--ghost"
											onclick={cancelReject}
											disabled={busyFor === row.id}
										>
											Cancel
										</button>
									</div>
								{:else}
									<div class="ar-actions">
										{#if row.verificationStatus !== 'verified'}
											<button
												type="button"
												class="ar-btn ar-btn--success"
												onclick={() => approve(row)}
												disabled={busyFor === row.id}
											>
												<i class="ph ph-check-circle" aria-hidden="true"></i>
												Approve
											</button>
										{/if}
										{#if row.verificationStatus !== 'rejected'}
											<button
												type="button"
												class="ar-btn ar-btn--danger-ghost"
												onclick={() => openReject(row)}
												disabled={busyFor === row.id}
											>
												<i class="ph ph-x-circle" aria-hidden="true"></i>
												Reject
											</button>
										{/if}
										{#if row.verificationStatus !== 'pending'}
											<button
												type="button"
												class="ar-btn ar-btn--ghost"
												onclick={() => resetPending(row)}
												disabled={busyFor === row.id}
												title="Return to pending queue"
											>
												<i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i>
												Reset
											</button>
										{/if}
									</div>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<style>
	/* ══════════════════════════════════════════════════════════════════════════
	 * Sprint 2.6.1 — Recruiter Marketplace Oversight
	 * WCAG-compliant dark + light mode surface. All muted text uses solid
	 * zinc-300 / zinc-400 hex values (never rgba alpha) so contrast never
	 * drops below AA.
	 * ══════════════════════════════════════════════════════════════════════════
	 */

	.ar-root {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 24px;
		min-height: 100%;
		background: #fafafa;
		color: #18181b;
	}

	:global(html.dark) .ar-root {
		background: #09090b;
		color: #fafafa;
	}

	/* ── Header ──────────────────────────────────────────────────────────── */
	.ar-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 16px;
	}

	.ar-head__left {
		min-width: 0;
	}

	.ar-head__right {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.ar-title {
		margin: 0 0 4px;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: #18181b;
	}

	:global(html.dark) .ar-title {
		color: #fafafa;
	}

	.ar-sub {
		margin: 0;
		max-width: 72ch;
		font-size: 0.875rem;
		line-height: 1.45;
		color: #52525b;
	}

	:global(html.dark) .ar-sub {
		color: #d4d4d8;
	}

	.ar-sub code {
		padding: 1px 6px;
		border-radius: 4px;
		background: #e4e4e7;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.8125rem;
	}

	:global(html.dark) .ar-sub code {
		background: #27272a;
		color: #fafafa;
	}

	.ar-filter {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		min-width: 280px;
		border-radius: 8px;
		border: 1px solid #e4e4e7;
		background: #ffffff;
		box-shadow: inset 0 1px 2px rgba(24, 24, 27, 0.04);
	}

	:global(html.dark) .ar-filter {
		border-color: #27272a;
		background: rgba(255, 255, 255, 0.04);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.ar-filter i {
		color: #71717a;
	}

	:global(html.dark) .ar-filter i {
		color: #a1a1aa;
	}

	.ar-filter input {
		flex: 1;
		min-width: 0;
		appearance: none;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 0.875rem;
	}

	.ar-filter input:focus {
		outline: none;
	}

	.ar-filter input::placeholder {
		color: #a1a1aa;
	}

	.ar-tabs {
		display: inline-flex;
		align-items: center;
		padding: 3px;
		border-radius: 10px;
		background: #f4f4f5;
		border: 1px solid #e4e4e7;
	}

	:global(html.dark) .ar-tabs {
		background: rgba(255, 255, 255, 0.04);
		border-color: #27272a;
	}

	.ar-tab {
		appearance: none;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border: 0;
		border-radius: 7px;
		background: transparent;
		color: #52525b;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		cursor: pointer;
		transition: background 0.12s ease, color 0.12s ease;
	}

	:global(html.dark) .ar-tab {
		color: #d4d4d8;
	}

	.ar-tab:hover {
		color: #18181b;
	}

	:global(html.dark) .ar-tab:hover {
		color: #fafafa;
	}

	.ar-tab--on {
		background: #ffffff;
		color: #18181b;
		box-shadow: 0 1px 2px rgba(24, 24, 27, 0.08);
	}

	:global(html.dark) .ar-tab--on {
		background: #18181b;
		color: #fafafa;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	.ar-tab__n {
		padding: 0 6px;
		border-radius: 999px;
		background: #e4e4e7;
		color: #3f3f46;
		font-size: 0.6875rem;
		font-weight: 700;
	}

	:global(html.dark) .ar-tab__n {
		background: #27272a;
		color: #d4d4d8;
	}

	.ar-tab--on .ar-tab__n {
		background: #18181b;
		color: #fafafa;
	}

	:global(html.dark) .ar-tab--on .ar-tab__n {
		background: #fafafa;
		color: #18181b;
	}

	/* ── Flash ───────────────────────────────────────────────────────────── */
	.ar-flash {
		margin: 0;
		padding: 10px 14px;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.ar-flash--ok {
		background: #dcfce7;
		color: #14532d;
		border: 1px solid #86efac;
	}

	:global(html.dark) .ar-flash--ok {
		background: rgba(34, 197, 94, 0.12);
		color: #bbf7d0;
		border-color: #166534;
	}

	.ar-flash--err {
		background: #fee2e2;
		color: #7f1d1d;
		border: 1px solid #fca5a5;
	}

	:global(html.dark) .ar-flash--err {
		background: rgba(239, 68, 68, 0.12);
		color: #fecaca;
		border-color: #7f1d1d;
	}

	/* ── Table ───────────────────────────────────────────────────────────── */
	.ar-table-wrap {
		flex: 1 1 auto;
		overflow: auto;
		border-radius: 12px;
		border: 1px solid #e4e4e7;
		background: #ffffff;
	}

	:global(html.dark) .ar-table-wrap {
		border-color: #27272a;
		background: #0f0f12;
	}

	.ar-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-size: 0.875rem;
	}

	.ar-th {
		position: sticky;
		top: 0;
		z-index: 1;
		padding: 10px 14px;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #52525b;
		background: #fafafa;
		border-bottom: 1px solid #e4e4e7;
	}

	:global(html.dark) .ar-th {
		background: #0f0f12;
		color: #a1a1aa;
		border-color: #27272a;
	}

	.ar-th--avatar {
		width: 44px;
	}

	.ar-th--right {
		text-align: right;
	}

	.ar-td {
		padding: 10px 14px;
		border-bottom: 1px solid #f4f4f5;
		vertical-align: middle;
	}

	:global(html.dark) .ar-td {
		border-color: #1f1f24;
	}

	.ar-td--avatar {
		width: 44px;
	}

	.ar-td--right {
		text-align: right;
	}

	.ar-tr:hover .ar-td {
		background: #fafafa;
	}

	:global(html.dark) .ar-tr:hover .ar-td {
		background: rgba(255, 255, 255, 0.02);
	}

	.ar-td-empty {
		padding: 32px 14px;
		text-align: center;
		color: #71717a;
		font-size: 0.875rem;
	}

	:global(html.dark) .ar-td-empty {
		color: #a1a1aa;
	}

	/* ── Cells ───────────────────────────────────────────────────────────── */
	.ar-avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
		color: #fafafa;
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.04em;
	}

	.ar-agency {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.ar-agency__primary {
		font-weight: 700;
		color: #18181b;
	}

	:global(html.dark) .ar-agency__primary {
		color: #fafafa;
	}

	.ar-agency__type {
		display: inline-block;
		width: fit-content;
		padding: 1px 8px;
		border-radius: 999px;
		background: #eef2ff;
		color: #3730a3;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	:global(html.dark) .ar-agency__type {
		background: rgba(99, 102, 241, 0.16);
		color: #c7d2fe;
	}

	.ar-agency__meta {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: #71717a;
		font-size: 0.75rem;
	}

	:global(html.dark) .ar-agency__meta {
		color: #a1a1aa;
	}

	.ar-scout {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.ar-scout__name {
		font-weight: 600;
		color: #27272a;
	}

	:global(html.dark) .ar-scout__name {
		color: #fafafa;
	}

	.ar-scout__email {
		color: #71717a;
		font-size: 0.8125rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	:global(html.dark) .ar-scout__email {
		color: #a1a1aa;
	}

	/* ── Pills ───────────────────────────────────────────────────────────── */
	.ar-sub-pill {
		display: inline-flex;
		align-items: center;
		padding: 2px 9px;
		border-radius: 999px;
		border: 1px solid transparent;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.ar-sub-pill--none {
		background: #f4f4f5;
		color: #3f3f46;
		border-color: #e4e4e7;
	}

	:global(html.dark) .ar-sub-pill--none {
		background: rgba(255, 255, 255, 0.05);
		color: #d4d4d8;
		border-color: #27272a;
	}

	.ar-sub-pill--trial {
		background: #fef9c3;
		color: #854d0e;
		border-color: #fde047;
	}

	:global(html.dark) .ar-sub-pill--trial {
		background: rgba(234, 179, 8, 0.16);
		color: #fef3c7;
		border-color: #854d0e;
	}

	.ar-sub-pill--active {
		background: #dcfce7;
		color: #166534;
		border-color: #86efac;
	}

	:global(html.dark) .ar-sub-pill--active {
		background: rgba(34, 197, 94, 0.16);
		color: #bbf7d0;
		border-color: #166534;
	}

	.ar-sub-pill--past_due {
		background: #ffedd5;
		color: #9a3412;
		border-color: #fdba74;
	}

	:global(html.dark) .ar-sub-pill--past_due {
		background: rgba(249, 115, 22, 0.16);
		color: #fed7aa;
		border-color: #9a3412;
	}

	.ar-sub-pill--cancelled {
		background: #fee2e2;
		color: #991b1b;
		border-color: #fca5a5;
	}

	:global(html.dark) .ar-sub-pill--cancelled {
		background: rgba(239, 68, 68, 0.16);
		color: #fecaca;
		border-color: #7f1d1d;
	}

	.ar-sub-tier {
		margin-left: 6px;
		color: #71717a;
		font-size: 0.75rem;
	}

	:global(html.dark) .ar-sub-tier {
		color: #a1a1aa;
	}

	.ar-verify-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 10px;
		border-radius: 999px;
		border: 1px solid transparent;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: capitalize;
	}

	.ar-verify-pill i {
		font-size: 0.875rem;
	}

	.ar-verify-pill--pending {
		background: #fef9c3;
		color: #854d0e;
		border-color: #fde047;
	}

	:global(html.dark) .ar-verify-pill--pending {
		background: rgba(234, 179, 8, 0.18);
		color: #fef3c7;
		border-color: #854d0e;
	}

	.ar-verify-pill--verified {
		background: #d1fae5;
		color: #065f46;
		border-color: #6ee7b7;
	}

	:global(html.dark) .ar-verify-pill--verified {
		background: rgba(16, 185, 129, 0.18);
		color: #a7f3d0;
		border-color: #065f46;
	}

	.ar-verify-pill--rejected {
		background: #fee2e2;
		color: #991b1b;
		border-color: #fca5a5;
	}

	:global(html.dark) .ar-verify-pill--rejected {
		background: rgba(239, 68, 68, 0.18);
		color: #fecaca;
		border-color: #7f1d1d;
	}

	.ar-muted {
		color: #71717a;
	}

	:global(html.dark) .ar-muted {
		color: #a1a1aa;
	}

	/* ── Actions ─────────────────────────────────────────────────────────── */
	.ar-actions {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.ar-reject-inline {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.ar-reject-inline input {
		min-width: 200px;
		padding: 6px 10px;
		border-radius: 6px;
		border: 1px solid #e4e4e7;
		background: #ffffff;
		color: #18181b;
		font: inherit;
		font-size: 0.8125rem;
	}

	:global(html.dark) .ar-reject-inline input {
		background: rgba(255, 255, 255, 0.04);
		border-color: #27272a;
		color: #fafafa;
	}

	.ar-btn {
		appearance: none;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 6px;
		border: 1px solid #e4e4e7;
		background: #ffffff;
		color: #18181b;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
	}

	:global(html.dark) .ar-btn {
		background: rgba(255, 255, 255, 0.04);
		border-color: #27272a;
		color: #fafafa;
	}

	.ar-btn:hover:not(:disabled) {
		background: #f4f4f5;
	}

	:global(html.dark) .ar-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
	}

	.ar-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.ar-btn--success {
		background: #10b981;
		border-color: #059669;
		color: #ecfdf5;
	}

	.ar-btn--success:hover:not(:disabled) {
		background: #059669;
		border-color: #047857;
	}

	.ar-btn--danger {
		background: #ef4444;
		border-color: #dc2626;
		color: #ffffff;
	}

	.ar-btn--danger:hover:not(:disabled) {
		background: #dc2626;
		border-color: #b91c1c;
	}

	.ar-btn--danger-ghost {
		border-color: #fca5a5;
		color: #b91c1c;
	}

	:global(html.dark) .ar-btn--danger-ghost {
		border-color: #7f1d1d;
		color: #fecaca;
		background: rgba(239, 68, 68, 0.08);
	}

	.ar-btn--danger-ghost:hover:not(:disabled) {
		background: #fee2e2;
	}

	:global(html.dark) .ar-btn--danger-ghost:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.16);
	}

	.ar-btn--ghost {
		background: transparent;
	}

	/* ── Responsive ──────────────────────────────────────────────────────── */
	@media (max-width: 960px) {
		.ar-head {
			flex-direction: column;
			align-items: stretch;
		}

		.ar-head__right {
			width: 100%;
		}

		.ar-filter {
			min-width: 0;
			width: 100%;
		}

		.ar-tabs {
			overflow-x: auto;
		}
	}
</style>
