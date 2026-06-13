<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db } from '$lib/firebase.js';
	import { collection, query, where, getDocs } from 'firebase/firestore';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { getApp } from 'firebase/app';
	import Icon from '$lib/components/ui/Icon.svelte';
	import {
		getCheckrCandidateDashboardUrl,
		getCheckrDashboardBaseUrl,
		getClearanceStatusSubLabel,
		clearanceStatusSubLabelTitle,
	} from '$lib/compliance/checkrCoachClearance.js';

	interface Props {
		headerLabel?: string;
		pageTitle?: string;
		/** When set (e.g. from context switcher), scopes coach queries to this club. */
		clubId?: string;
	}

	let {
		headerLabel = 'DIRECTOR PORTAL — COMPLIANCE PANOPTICON',
		pageTitle = 'Staff Clearance Matrix',
		clubId: clubIdProp = '',
	}: Props = $props();

	const effectiveClubId = $derived(
		clubIdProp?.trim() ||
			(typeof authStore.userProfile?.clubId === 'string' ? authStore.userProfile.clubId.trim() : '') ||
			(typeof authStore.tenantId === 'string' ? authStore.tenantId.trim() : ''),
	);

	/** @typedef {{ email: string, displayName?: string, role?: string, clubId?: string, clearance?: Record<string,unknown> }} CoachRow */

	/** @type {CoachRow[]} */
	let coaches = $state([]);
	let loading = $state(true);
	let loadError = $state('');
	let search = $state('');

	// Per-row action state
	/** @type {Record<string, { verifying: boolean, simulating: boolean, ordering: boolean, error: string }>} */
	let rowActions = $state({});

	const emptyRowState = { verifying: false, simulating: false, ordering: false, error: '' };

	let toastMsg = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	function showToast(msg: string) {
		toastMsg = msg;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => {
			toastMsg = '';
		}, 6000);
	}

	/** @param {CoachRow[]} rows */
	function initRowActions(rows) {
		const next = { ...rowActions };
		for (const coach of rows) {
			if (!next[coach.email]) {
				next[coach.email] = { verifying: false, simulating: false, ordering: false, error: '' };
			}
		}
		rowActions = next;
	}

	// ── Load coaches ─────────────────────────────────────────────────────────
	$effect(() => {
		if (authStore.isLoading) return;
		if (!authStore.isAuthenticated) {
			loading = false;
			return;
		}
		const clubId = effectiveClubId;
		if (!clubId && !['super_admin', 'global_admin'].includes(authStore.role ?? '')) {
			loading = false;
			return;
		}
		let q;
		if (['super_admin', 'global_admin'].includes(authStore.role ?? '')) {
			q = query(
				collection(db, 'users'),
				where('role', 'in', ['coach', 'recruiter']),
			);
		} else {
			q = query(
				collection(db, 'users'),
				where('role', 'in', ['coach', 'recruiter']),
				where('clubId', '==', clubId),
			);
		}
		getDocs(q)
			.then((snap) => {
				coaches = snap.docs.map((d) => /** @type {CoachRow} */ ({ email: d.id, ...d.data() }));
				initRowActions(coaches);
			})
			.catch((e) => {
				loadError = e.message ?? 'Failed to load coaches.';
			})
			.finally(() => {
				loading = false;
			});
	});

	// ── Filtered rows ─────────────────────────────────────────────────────────
	const filtered = $derived(
		coaches.filter((c) => {
			if (!search.trim()) return true;
			const s = search.toLowerCase();
			return c.email.toLowerCase().includes(s) || (c.displayName ?? '').toLowerCase().includes(s);
		}),
	);

	// ── Helpers ───────────────────────────────────────────────────────────────
	/** @param {CoachRow} coach */
	function getStatus(coach) {
		const status = /** @type {string|undefined} */ (coach.clearance?.status);
		return status ?? 'pending';
	}

	/**
	 * Format a Firestore Timestamp-like object or null as a readable string.
	 * @param {unknown} ts
	 */
	function fmtTimestamp(ts) {
		if (!ts || typeof ts !== 'object') return '—';
		try {
			const t = /** @type {Record<string,unknown>} */ (ts);
			const ms = typeof t.toMillis === 'function' ? t.toMillis() :
				typeof t.seconds === 'number' ? t.seconds * 1000 : null;
			if (!ms) return '—';
			return new Intl.DateTimeFormat('en-US', {
				month: 'short', day: 'numeric', year: 'numeric',
				hour: '2-digit', minute: '2-digit',
			}).format(new Date(ms));
		} catch {
			return '—';
		}
	}

	/** @param {string} email */
	function getRowState(email) {
		return rowActions[email] ?? emptyRowState;
	}

	/** @param {string} email */
	function ensureRowState(email) {
		if (!rowActions[email]) {
			rowActions[email] = { verifying: false, simulating: false, ordering: false, error: '' };
		}
		return rowActions[email];
	}

	/** @param {CoachRow} coach */
	function needsScreeningOrder(coach) {
		const status = getStatus(coach);
		const cl = /** @type {Record<string, unknown>} */ (coach.clearance ?? {});
		const invited = Boolean(cl.invitationId || cl.invitationUrl);
		return ['pending', 'unsubmitted'].includes(status) && !invited;
	}

	/** @param {unknown} err */
	function callableErrMsg(err) {
		if (err && typeof err === 'object') {
			if ('message' in err && typeof err.message === 'string' && err.message) {
				return err.message;
			}
			if ('details' in err && typeof err.details === 'string' && err.details) {
				return err.details;
			}
		}
		return 'Request failed.';
	}

	/** @param {CoachRow} coach */
	async function orderScreening(coach) {
		const rs = ensureRowState(coach.email);
		rs.ordering = true;
		rs.error = '';
		try {
			const fns = getFunctions(getApp(), 'us-east1');
			const initiate = httpsCallable(fns, 'directorInitiateCoachClearance');
			const result = await initiate({ coachEmail: coach.email });
			const data = /** @type {Record<string, unknown>} */ (result.data ?? {});
			coach.clearance = {
				.../** @type {object} */ (coach.clearance ?? {}),
				status: 'pending',
				source: 'checkr',
				invitationId:
					typeof data.invitationId === 'string' ? data.invitationId : 'ordered',
				invitationUrl:
					typeof data.invitationUrl === 'string' ? data.invitationUrl : null,
				lastVerified: { seconds: Math.floor(Date.now() / 1000) },
			};
		} catch (err) {
			rs.error = callableErrMsg(err);
		} finally {
			rs.ordering = false;
		}
	}

	/** @param {CoachRow} coach */
	async function simulateClearance(coach) {
		const rs = ensureRowState(coach.email);
		rs.simulating = true;
		rs.error = '';
		try {
			const fns = getFunctions(getApp(), 'us-east1');
			const simulate = httpsCallable(fns, 'simulateClearance');
			await simulate({ email: coach.email });
			coach.clearance = {
				.../** @type {object} */ (coach.clearance ?? {}),
				status: 'cleared',
				source: 'qa_simulate',
				lastVerified: { seconds: Math.floor(Date.now() / 1000) },
			};
			showToast('Coach must sign out and back in.');
		} catch (err) {
			rs.error = callableErrMsg(err);
		} finally {
			rs.simulating = false;
		}
	}

	/** @param {CoachRow} coach */
	async function revokeCoach(coach) {
		const rs = ensureRowState(coach.email);
		rs.verifying = true;
		rs.error = '';
		try {
			const fns = getFunctions(getApp(), 'us-east1');
			const revoke = httpsCallable(fns, 'revokeCoachClearance');
			await revoke({ email: coach.email, reason: 'Director initiated revocation via Panopticon' });
			coach.clearance = { .../** @type {object} */ (coach.clearance ?? {}), status: 'flagged' };
		} catch (err) {
			rs.error = callableErrMsg(err);
		} finally {
			rs.verifying = false;
		}
	}

	const checkrDashboardUrl = getCheckrDashboardBaseUrl();

	// Totals
	const counts = $derived({
		total: coaches.length,
		cleared: coaches.filter((c) => getStatus(c) === 'cleared').length,
		pending: coaches.filter((c) => ['pending', 'unsubmitted'].includes(getStatus(c))).length,
		flagged: coaches.filter((c) => getStatus(c) === 'flagged').length,
	});
</script>

<svelte:head>
	<title>{pageTitle} — Compliance</title>
</svelte:head>

<div class="dp-root coach-clearance-panopticon">
	{#if toastMsg}
		<div class="dp-toast" role="status" aria-live="polite">{toastMsg}</div>
	{/if}
	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<header class="dp-header">
		<div class="dp-header__left">
			<div class="dp-label">{headerLabel}</div>
			<h1 class="dp-title">{pageTitle}</h1>
		</div>
		<div class="dp-stats-rail">
			<div class="dp-stat dp-stat--total">
				<span class="dp-stat__val">{counts.total}</span>
				<span class="dp-stat__key">TOTAL</span>
			</div>
			<div class="dp-stat dp-stat--cleared">
				<span class="dp-stat__val">{counts.cleared}</span>
				<span class="dp-stat__key">CLEARED</span>
			</div>
			<div class="dp-stat dp-stat--pending">
				<span class="dp-stat__val">{counts.pending}</span>
				<span class="dp-stat__key">PENDING</span>
			</div>
			<div class="dp-stat dp-stat--flagged">
				<span class="dp-stat__val">{counts.flagged}</span>
				<span class="dp-stat__key">FLAGGED</span>
			</div>
		</div>
	</header>

	<!-- ── Search ─────────────────────────────────────────────────────────── -->
	<div class="dp-search-row">
		<div class="dp-search">
		<Icon name="action.search" />
		<input
				type="search"
				class="dp-search__input"
				placeholder="SEARCH STAFF…"
				bind:value={search}
				aria-label="Search coaches"
			/>
		</div>
		<div class="dp-alpha-badge">
			<span class="dp-pulse-dot"></span>
			QA bypass available when live Checkr unavailable
		</div>
	</div>

	<!-- ── Grid ───────────────────────────────────────────────────────────── -->
	{#if loading}
		<div class="dp-loading" role="status" aria-live="polite">
			<div class="dp-spinner"></div>
			<span>LOADING COMPLIANCE ROSTER…</span>
		</div>
	{:else if loadError}
		<div class="dp-error">{loadError}</div>
	{:else if filtered.length === 0}
		<div class="dp-empty">
		<Icon name="user.group" size={40} />
		<p>NO STAFF RECORDS FOUND</p>
		</div>
	{:else}
		<div class="dp-table-wrap" role="region" aria-label="Compliance roster">
			<table class="dp-table">
				<thead>
					<tr>
						<th>COACH / ROLE</th>
						<th>CLEARANCE STATUS</th>
						<th>LAST SYNCED</th>
						<th>CHECKR</th>
						<th>ACTIONS</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as coach (coach.email)}
						{@const status = getStatus(coach)}
						{@const rs = getRowState(coach.email)}
						{@const statusSubLabel = getClearanceStatusSubLabel(
							/** @type {import('$lib/types/backgroundCheck.js').ClearanceDoc|undefined} */ (
								coach.clearance
							),
						)}
						{@const invitationUrl = /** @type {string|undefined} */ (coach.clearance?.invitationUrl)}
						{@const checkrCandidateId = /** @type {string|undefined} */ (
							coach.clearance?.checkrCandidateId
						)}
						{@const lastVerified = coach.clearance?.lastVerified}
						<tr class="dp-row dp-row--{status}">
							<!-- Coach identity -->
							<td class="dp-cell dp-cell--identity">
								<div class="dp-identity__name">
									{coach.displayName ?? coach.email.split('@')[0]}
								</div>
								<div class="dp-identity__email">{coach.email}</div>
								<div class="dp-identity__role">{coach.role ?? 'coach'}</div>
							</td>

							<!-- Clearance status -->
							<td class="dp-cell dp-cell--status">
								<div class="dp-status dp-status--{status}">
								{#if status === 'cleared'}
									<Icon name="status.verified" />
								{:else if status === 'flagged'}
									<Icon name="status.warning-circle" />
									{:else}
										<span class="dp-pulse-dot dp-pulse-dot--sm"></span>
									{/if}
									{status.toUpperCase()}
								</div>
								{#if statusSubLabel}
									<div
										class="dp-clearance-ref"
										title={clearanceStatusSubLabelTitle(statusSubLabel.kind)}
									>
										{#if statusSubLabel.kind === 'legacyRecordId'}
											<span class="dp-clearance-ref__legacy">legacy</span>
										{/if}
										{statusSubLabel.value}
									</div>
								{/if}
							</td>

							<!-- Last synced -->
							<td class="dp-cell dp-cell--synced">
								<span class="dp-synced-ts">{fmtTimestamp(lastVerified)}</span>
							</td>

							<!-- Checkr actions -->
							<td class="dp-cell dp-cell--dashboard">
								{#if needsScreeningOrder(coach)}
									<button
										class="dp-btn dp-btn--order"
										disabled={rs.ordering}
										onclick={() => orderScreening(coach)}
										aria-label="Order Checkr screening for {coach.email}"
									>
										{#if rs.ordering}
											<span class="dp-btn-spin">↻</span> Ordering…
										{:else}
											<Icon name="status.shield-check" />
											Order screening
										{/if}
									</button>
								{/if}
								{#if status !== 'cleared'}
									<button
										class="dp-btn dp-btn--simulate"
										disabled={rs.simulating}
										onclick={() => simulateClearance(coach)}
										aria-label="Simulate clearance (QA) for {coach.email}"
									>
										{#if rs.simulating}
											<span class="dp-btn-spin">↻</span> SYNCING…
										{:else}
										<Icon name="game.zap" />
										Simulate clearance (QA)
										{/if}
									</button>
								{/if}
								{#if invitationUrl}
									<a
										href={invitationUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="dp-btn dp-btn--checkr"
										aria-label="Open Checkr invitation for {coach.email}"
									>
										<Icon name="nav.external" />
										Open Checkr invitation
									</a>
								{/if}
								{#if checkrCandidateId}
									<a
										href={getCheckrCandidateDashboardUrl(checkrCandidateId)}
										target="_blank"
										rel="noopener noreferrer"
										class="dp-btn dp-btn--checkr"
										aria-label="Open Checkr candidate for {coach.email}"
									>
										<Icon name="nav.external" />
										Open Checkr candidate
									</a>
								{/if}
								<a
									href={checkrDashboardUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="dp-btn dp-btn--checkr"
									aria-label="Open Checkr dashboard"
								>
								<Icon name="nav.external" />
								Open Checkr dashboard
								</a>
							</td>

							<!-- Actions -->
							<td class="dp-cell dp-cell--actions">
								{#if rs.error}
									<span class="dp-row-error">{rs.error}</span>
								{/if}
								{#if status === 'cleared'}
									<button
										class="dp-btn dp-btn--revoke"
										disabled={rs.verifying}
										onclick={() => revokeCoach(coach)}
										aria-label="Revoke clearance for {coach.email}"
									>
									<Icon name="sys.ban" />
									REVOKE
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
