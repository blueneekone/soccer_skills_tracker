<script lang="ts">
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
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import AdminConsoleSearch from '$lib/components/admin/AdminConsoleSearch.svelte';

	// ── Types ────────────────────────────────────────────────────────────────
	/**
	 * @typedef {'pending' | 'verified' | 'rejected'} VerificationStatus
	 * @typedef {'none' | 'trial' | 'active' | 'past_due' | 'cancelled'} SubscriptionStatus
	 *
	 * Strike 2 — Checkr vetting pipeline status. `pending` means a run has
	 * not been requested yet; `processing` is set the moment we dispatch the
	 * Checkr call (simulated for now); `cleared` / `flagged` are terminal
	 * states returned by the webhook (future sprint).
	 * @typedef {'pending' | 'processing' | 'cleared' | 'flagged'} VettingStatus
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
	 *   vettingStatus: VettingStatus,
	 *   subscriptionStatus: SubscriptionStatus,
	 *   subscriptionTier: string,
	 *   lastActiveAt: number,
	 *   createdAt: number,
	 *   notes: string,
	 * }} RecruiterRow
	 */

	/**
	 * Accepts whatever the backing Firestore doc happens to carry and
	 * normalises it into a `VettingStatus`. Missing / unknown values default
	 * to `pending`.
	 * @param {unknown} raw
	 * @returns {VettingStatus}
	 */
	function coerceVetting(raw) {
		const v = typeof raw === 'string' ? raw.toLowerCase() : '';
		if (v === 'processing' || v === 'cleared' || v === 'flagged') return v;
		return 'pending';
	}

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

	// Sprint 2.6.5 — lightweight toast (auto-dismiss, aria-live) for Run
	// Background Check / future workflow triggers. No global store needed.
	/** @type {{ id: number, text: string, tone: 'info' | 'ok' | 'warn' }[]} */
	let toasts = $state([]);
	let toastSeq = 0;
	/** @param {string} text @param {'info' | 'ok' | 'warn'} [tone] */
	function pushToast(text, tone = 'info') {
		const id = ++toastSeq;
		toasts = [...toasts, { id, text, tone }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 4200);
	}

	// Row-level action menu (shared with Background Check action)
	let openMenuFor = $state('');
	function toggleMenu(/** @type {string} */ rowId) {
		openMenuFor = openMenuFor === rowId ? '' : rowId;
	}
	function closeMenu() {
		openMenuFor = '';
	}

	// Dismiss menu on outside click / Escape.
	$effect(() => {
		if (typeof document === 'undefined') return;
		if (!openMenuFor) return;
		/** @param {MouseEvent} e */
		const onDocClick = (e) => {
			const target = /** @type {HTMLElement | null} */ (e.target);
			if (target && target.closest && target.closest('.ar-menu-wrap')) return;
			openMenuFor = '';
		};
		/** @param {KeyboardEvent} e */
		const onKey = (e) => {
			if (e.key === 'Escape') openMenuFor = '';
		};
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});

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
					vettingStatus: coerceVetting(raw.vettingStatus),
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
			const patch: Record<string, unknown> = {
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

	/**
	 * Strike 2 — Vetting workflow. Optimistically flips the row's
	 * `vettingStatus` to `processing` the moment the admin dispatches the
	 * check so the UI reflects the pending API round-trip. The actual Checkr
	 * call lands in Sprint 2.9 and will webhook back a `cleared` or `flagged`
	 * terminal status. We persist the optimistic `processing` state to
	 * Firestore so the update survives a reload even before Checkr is wired.
	 * @param {RecruiterRow} row
	 */
	async function runBackgroundCheck(row) {
		closeMenu();
		if (row.vettingStatus === 'processing') {
			pushToast(
				`A Checkr run is already in flight for ${row.scoutName || row.email}.`,
				'info'
			);
			return;
		}

		// Optimistic local patch — keeps the cell in sync with the toast.
		const idx = rows.findIndex((r) => r.id === row.id);
		if (idx >= 0) {
			rows = [
				...rows.slice(0, idx),
				{ ...rows[idx], vettingStatus: /** @type {VettingStatus} */ ('processing') },
				...rows.slice(idx + 1)
			];
		}

		pushToast(
			`Background check dispatched for ${row.scoutName || row.email}. Checkr API integration arriving Sprint 2.9.`,
			'info'
		);

		try {
			await updateDoc(doc(db, 'recruiters', row.id), {
				vettingStatus: 'processing',
				vettingRequestedAt: serverTimestamp(),
				vettingRequestedBy: authStore.user?.email || 'super_admin'
			});
			await logSecurityEvent('RECRUITER_BG_CHECK_REQUESTED', row.email, 'Strike 2 — vetting status → processing');
		} catch (e) {
			console.warn('[admin-recruiters] background-check persistence failed', e);
			// Roll back the optimistic patch on failure so the admin sees the
			// real Firestore state.
			const rollbackIdx = rows.findIndex((r) => r.id === row.id);
			if (rollbackIdx >= 0) {
				rows = [
					...rows.slice(0, rollbackIdx),
					{ ...rows[rollbackIdx], vettingStatus: row.vettingStatus },
					...rows.slice(rollbackIdx + 1)
				];
			}
			pushToast('Could not persist vetting status — see console.', 'warn');
		}
	}
</script>

<div class="ar-root">
	<div class="adm-toolbar">
		<div class="adm-toolbar__left">
			<h1 class="adm-toolbar__title">Recruiter Marketplace</h1>
			<div class="adm-toolbar__meta">
				<span class="adm-toolbar__sub">
					Super-admin oversight for NCAA, Pro and Club scouts. Approve, reject, and monitor
					subscription health. Every action is written to <code>security_audit</code>.
				</span>
				<span class="adm-toolbar__count">
					{filteredRows.length} of {rows.length} scouts
				</span>
			</div>
		</div>
		<div class="adm-toolbar__right">
			<AdminConsoleSearch
				bind:value={searchInput}
				narrow
				placeholder="Search by email, scout name, or agency"
				ariaLabel="Filter recruiters"
			/>
			<button
				type="button"
				class="ar-toolbar-refresh"
				onclick={() => void loadRecruiters()}
				disabled={loading}
				title={loading ? 'Syncing…' : 'Refresh'}
				aria-label="Refresh recruiter list from Firestore"
			>
				<Icon name={"nav.refresh" as IconName} class="tw-text-lg {loading ? 'ar-toolbar-sync__spin' : ''}" />
			</button>
			<div class="ar-tabs" role="tablist" aria-label="Verification filter">
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === ''}
					class="ar-tab"
					class:ar-tab--on={statusFilter === ''}
					onclick={() => (statusFilter = '')}
				>
					All <span class="ar-tab__n ar-tab__n--total">{counts.total}</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === 'pending'}
					class="ar-tab"
					class:ar-tab--on={statusFilter === 'pending'}
					onclick={() => (statusFilter = 'pending')}
				>
					Pending <span class="ar-tab__n ar-tab__n--pending text-amber-500">{counts.pending}</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === 'verified'}
					class="ar-tab"
					class:ar-tab--on={statusFilter === 'verified'}
					onclick={() => (statusFilter = 'verified')}
				>
					Verified <span class="ar-tab__n ar-tab__n--verified text-emerald-500">{counts.verified}</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={statusFilter === 'rejected'}
					class="ar-tab"
					class:ar-tab--on={statusFilter === 'rejected'}
					onclick={() => (statusFilter = 'rejected')}
				>
					Rejected <span class="ar-tab__n ar-tab__n--rejected text-rose-500">{counts.rejected}</span>
				</button>
			</div>
		</div>
	</div>

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
					<th class="ar-th">Vetting</th>
					<th class="ar-th">Last Active</th>
					<th class="ar-th ar-th--right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr>
						<td colspan="8" class="ar-td-empty">Loading recruiters…</td>
					</tr>
				{:else if filteredRows.length === 0}
					<tr>
						<td colspan="8" class="ar-td-empty">
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
										<Icon name={"sys.map-pin" as IconName} />
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
								{#if row.verificationStatus === 'verified'}
									<Icon name={"status.seal-check" as IconName} />
								{:else}
									{#if row.verificationStatus === 'rejected'}
									<Icon name={"sys.ban" as IconName} />
								{:else}
									<Icon name={"sys.hourglass" as IconName} />
								{/if}
								{/if}
								{row.verificationStatus}
							</span>
							</td>
							<!-- Strike 2 — Checkr Vetting Status column. -->
							<td class="ar-td">
							<span class="ar-vet-pill ar-vet-pill--{row.vettingStatus}">
								{#if row.vettingStatus === 'cleared'}
									<Icon name={"status.shield-check" as IconName} />
								{:else if row.vettingStatus === 'processing'}
									<Icon name={"status.loading" as IconName} class="ar-vet-pill__spin" />
								{:else}
									{#if row.vettingStatus === 'flagged'}
									<Icon name={"status.warning-octagon" as IconName} />
								{:else}
									<Icon name={"sys.hourglass" as IconName} />
								{/if}
								{/if}
								{row.vettingStatus}
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
										<Icon name={"status.verified" as IconName} />
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
										<Icon name={"sys.close" as IconName} />
											Reject
											</button>
										{/if}
										<div class="ar-menu-wrap">
											<button
												type="button"
												class="ar-btn ar-btn--ghost ar-menu-trigger"
												onclick={() => toggleMenu(row.id)}
												aria-haspopup="menu"
												aria-expanded={openMenuFor === row.id}
												aria-label="More actions for {row.email}"
												disabled={busyFor === row.id}
											>
												<Icon name={"nav.more-v" as IconName} />
											</button>
											{#if openMenuFor === row.id}
												<div
													class="ar-menu"
													role="menu"
													tabindex="-1"
													onclick={(e) => e.stopPropagation()}
													onkeydown={(e) => { if (e.key === 'Escape') closeMenu(); }}
												>
													<button
														type="button"
														role="menuitem"
														class="ar-menu__item"
														onclick={() => runBackgroundCheck(row)}
													>
														<Icon name={"status.shield-check" as IconName} />
														<span class="ar-menu__item-body">
															<span class="ar-menu__item-label">Run Background Check</span>
															<span class="ar-menu__item-hint">Checkr API — Sprint 2.9</span>
														</span>
													</button>
													{#if row.verificationStatus !== 'pending'}
														<button
															type="button"
															role="menuitem"
															class="ar-menu__item"
															onclick={() => { closeMenu(); resetPending(row); }}
														>
															<Icon name={"nav.rotate-ccw" as IconName} />
															<span class="ar-menu__item-body">
																<span class="ar-menu__item-label">Reset to Pending</span>
																<span class="ar-menu__item-hint">Return to queue</span>
															</span>
														</button>
													{/if}
													<a
														href="mailto:{row.email}"
														role="menuitem"
														class="ar-menu__item"
														onclick={() => closeMenu()}
													>
														<Icon name={"comm.send" as IconName} />
														<span class="ar-menu__item-body">
															<span class="ar-menu__item-label">Email Scout</span>
															<span class="ar-menu__item-hint">{row.email}</span>
														</span>
													</a>
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	{#if toasts.length > 0}
		<div class="ar-toast-stack" role="region" aria-live="polite" aria-label="Notifications">
			{#each toasts as t (t.id)}
				<div class="ar-toast ar-toast--{t.tone}" role="status">
				<Icon
					name={t.tone === 'ok'
						? ("status.verified" as IconName)
						: t.tone === 'warn'
							? ("status.warning" as IconName)
							: ("status.info" as IconName)}
				/>
				<span>{t.text}</span>
			</div>
			{/each}
		</div>
	{/if}
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

	.ar-toolbar-refresh {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		flex-shrink: 0;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #ffffff);
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			background 0.12s ease,
			border-color 0.12s ease,
			color 0.12s ease;
	}

	.ar-toolbar-refresh:hover:not(:disabled) {
		border-color: var(--brand-primary, #f59e0b);
		color: var(--text-primary);
		background: rgba(245, 158, 11, 0.08);
	}

	.ar-toolbar-refresh:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(html.dark) .ar-toolbar-refresh {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.1);
		color: #d4d4d8;
	}

	:global(html.dark) .ar-toolbar-refresh:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
		color: #fafafa;
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
		padding: 0 7px;
		border-radius: 999px;
		background: #e4e4e7;
		color: #3f3f46;
		font-size: 0.75rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	:global(html.dark) .ar-tab__n {
		background: rgba(255, 255, 255, 0.08);
		color: #d4d4d8;
	}

	/* Sprint 2.6.5 — Color-coded status counts (CTO mandate). Pills are tinted
	   glass so they read on BOTH the idle and active tab background. */
	.ar-tab__n--pending {
		background: rgba(245, 158, 11, 0.16);
		color: #f59e0b; /* amber-500 */
	}
	.ar-tab__n--verified {
		background: rgba(16, 185, 129, 0.18);
		color: #10b981; /* emerald-500 */
	}
	.ar-tab__n--rejected {
		background: rgba(244, 63, 94, 0.18);
		color: #f43f5e; /* rose-500 */
	}

	:global(html.dark) .ar-tab__n--pending  { background: rgba(245, 158, 11, 0.22); color: #fbbf24; }
	:global(html.dark) .ar-tab__n--verified { background: rgba(16, 185, 129, 0.22); color: #34d399; }
	:global(html.dark) .ar-tab__n--rejected { background: rgba(244, 63, 94, 0.22); color: #fb7185; }

	.ar-tab--on .ar-tab__n--total {
		background: #18181b;
		color: #fafafa;
	}

	:global(html.dark) .ar-tab--on .ar-tab__n--total {
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
		width: 100%;
		border-radius: 12px;
		border: 1px solid #e4e4e7;
		background: #ffffff;
		overflow-x: auto;
		overflow-y: visible;
		-webkit-overflow-scrolling: touch;
	}

	:global(html.dark) .ar-table-wrap {
		border-color: #27272a;
		background: #0f0f12;
	}

	.ar-toolbar-sync__spin {
		animation: ar-spin 0.85s linear infinite;
	}

	@keyframes ar-spin {
		to {
			transform: rotate(360deg);
		}
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

	/* Strike 2 — Checkr vetting status pill. Same visual treatment as the
	   verification pill so the admin can read both columns at a glance. */
	.ar-vet-pill {
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

	.ar-vet-pill i {
		font-size: 0.875rem;
	}

	.ar-vet-pill--pending {
		background: #f4f4f5;
		color: #52525b;
		border-color: #d4d4d8;
	}
	:global(html.dark) .ar-vet-pill--pending {
		background: rgba(161, 161, 170, 0.18);
		color: #e4e4e7;
		border-color: #3f3f46;
	}

	.ar-vet-pill--processing {
		background: #dbeafe;
		color: #1e3a8a;
		border-color: #93c5fd;
	}
	:global(html.dark) .ar-vet-pill--processing {
		background: rgba(59, 130, 246, 0.18);
		color: #bfdbfe;
		border-color: #1e3a8a;
	}

	.ar-vet-pill--cleared {
		background: #d1fae5;
		color: #065f46;
		border-color: #6ee7b7;
	}
	:global(html.dark) .ar-vet-pill--cleared {
		background: rgba(16, 185, 129, 0.18);
		color: #a7f3d0;
		border-color: #065f46;
	}

	.ar-vet-pill--flagged {
		background: #fee2e2;
		color: #991b1b;
		border-color: #fca5a5;
	}
	:global(html.dark) .ar-vet-pill--flagged {
		background: rgba(239, 68, 68, 0.18);
		color: #fecaca;
		border-color: #7f1d1d;
	}

	.ar-vet-pill__spin {
		animation: ar-vet-spin 0.9s linear infinite;
	}

	@keyframes ar-vet-spin {
		to { transform: rotate(360deg); }
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

	/* ── Sprint 2.6.5 — Actions menu (Background Check host) ────────────── */
	.ar-menu-wrap {
		position: relative;
		display: inline-flex;
	}

	.ar-menu-trigger {
		padding: 6px 8px;
	}

	.ar-menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		z-index: 40;
		min-width: 240px;
		padding: 6px;
		border-radius: 10px;
		border: 1px solid #e4e4e7;
		background: #ffffff;
		box-shadow:
			0 10px 32px -8px rgba(24, 24, 27, 0.25),
			0 2px 4px rgba(24, 24, 27, 0.08);
	}

	:global(html.dark) .ar-menu {
		border-color: #27272a;
		background: #0f0f12;
		box-shadow:
			0 10px 32px -8px rgba(0, 0, 0, 0.6),
			0 2px 4px rgba(0, 0, 0, 0.4);
	}

	.ar-menu__item {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		width: 100%;
		padding: 8px 10px;
		border-radius: 7px;
		border: 0;
		background: transparent;
		color: #18181b;
		font: inherit;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
	}

	:global(html.dark) .ar-menu__item {
		color: #fafafa;
	}

	.ar-menu__item:hover,
	.ar-menu__item:focus-visible {
		background: #f4f4f5;
		outline: none;
	}

	:global(html.dark) .ar-menu__item:hover,
	:global(html.dark) .ar-menu__item:focus-visible {
		background: rgba(255, 255, 255, 0.06);
	}

	.ar-menu__item i {
		flex-shrink: 0;
		font-size: 1.05rem;
		color: #4f46e5;
		margin-top: 1px;
	}

	:global(html.dark) .ar-menu__item i {
		color: #a5b4fc;
	}

	.ar-menu__item-body {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.ar-menu__item-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: inherit;
	}

	.ar-menu__item-hint {
		font-size: 0.7rem;
		color: #71717a;
		letter-spacing: 0.02em;
	}

	:global(html.dark) .ar-menu__item-hint {
		color: #d4d4d8;
	}

	/* ── Sprint 2.6.5 — Toast stack (Run Background Check, etc.) ────────── */
	.ar-toast-stack {
		position: fixed;
		right: 24px;
		bottom: 24px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		z-index: 90;
		pointer-events: none;
	}

	.ar-toast {
		pointer-events: auto;
		display: inline-flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 10px;
		border: 1px solid #e4e4e7;
		background: #ffffff;
		color: #18181b;
		box-shadow:
			0 16px 40px -8px rgba(24, 24, 27, 0.25),
			0 2px 4px rgba(24, 24, 27, 0.08);
		font-size: 0.8125rem;
		font-weight: 500;
		max-width: 380px;
		animation: ar-toast-in 160ms ease-out;
	}

	:global(html.dark) .ar-toast {
		background: #0f0f12;
		border-color: #27272a;
		color: #fafafa;
		box-shadow:
			0 16px 40px -8px rgba(0, 0, 0, 0.6),
			0 2px 4px rgba(0, 0, 0, 0.4);
	}

	.ar-toast i {
		flex-shrink: 0;
		font-size: 1.05rem;
		color: #4f46e5;
	}

	:global(html.dark) .ar-toast i {
		color: #a5b4fc;
	}

	.ar-toast--ok   i { color: #10b981; }
	.ar-toast--warn i { color: #f59e0b; }

	@keyframes ar-toast-in {
		from { opacity: 0; transform: translateY(6px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── Responsive ──────────────────────────────────────────────────────── */
	@media (max-width: 960px) {
		.adm-toolbar__right {
			width: 100%;
		}

		.ar-tabs {
			overflow-x: auto;
		}
	}
</style>
