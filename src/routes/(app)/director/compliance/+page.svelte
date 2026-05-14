<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db } from '$lib/firebase.js';
	import { collection, query, where, getDocs } from 'firebase/firestore';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { getApp } from 'firebase/app';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	export const ssr = false;

	// ── Access gate ─────────────────────────────────────────────────────────
	$effect(() => {
		if (authStore.isLoading) return;
		const allowed = ['director', 'registrar', 'super_admin', 'global_admin'];
		if (!authStore.isAuthenticated || !allowed.includes(authStore.role ?? '')) {
			if (browser) untrack(() => goto('/home', { replaceState: true }));
		}
	});

	// ── State ────────────────────────────────────────────────────────────────
	/** @typedef {{ email: string, displayName?: string, role?: string, clubId?: string, clearance?: Record<string,unknown> }} CoachRow */

	/** @type {CoachRow[]} */
	let coaches = $state([]);
	let loading = $state(true);
	let loadError = $state('');
	let search = $state('');

	// Per-row action state
	/** @type {Record<string, { verifying: boolean, simulating: boolean, error: string }>} */
	let rowActions = $state({});

	// ── Load coaches ─────────────────────────────────────────────────────────
	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		const clubId = authStore.userProfile?.clubId;
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
	function rowState(email) {
		if (!rowActions[email]) {
			rowActions[email] = { verifying: false, simulating: false, error: '' };
		}
		return rowActions[email];
	}

	/** @param {CoachRow} coach */
	async function simulateClearance(coach) {
		const rs = rowState(coach.email);
		rs.simulating = true;
		rs.error = '';
		try {
			const fns = getFunctions(getApp(), 'us-east1');
			const simulate = httpsCallable(fns, 'simulateClearance');
			await simulate({ email: coach.email });
			coach.clearance = {
				.../** @type {object} */ (coach.clearance ?? {}),
				status: 'cleared',
				ankoredId: 'ANKORED-SIM',
				lastVerified: { seconds: Math.floor(Date.now() / 1000) },
			};
		} catch (err) {
			rs.error = /** @type {Error} */ (err).message ?? 'Simulation failed.';
		} finally {
			rs.simulating = false;
		}
	}

	/** @param {CoachRow} coach */
	async function revokeCoach(coach) {
		const rs = rowState(coach.email);
		rs.verifying = true;
		rs.error = '';
		try {
			const fns = getFunctions(getApp(), 'us-east1');
			const revoke = httpsCallable(fns, 'revokeCoachClearance');
			await revoke({ email: coach.email, reason: 'Director initiated revocation via Panopticon' });
			coach.clearance = { .../** @type {object} */ (coach.clearance ?? {}), status: 'flagged' };
		} catch (err) {
			rs.error = /** @type {Error} */ (err).message ?? 'Revoke failed.';
		} finally {
			rs.verifying = false;
		}
	}

	// Totals
	const counts = $derived({
		total: coaches.length,
		cleared: coaches.filter((c) => getStatus(c) === 'cleared').length,
		pending: coaches.filter((c) => ['pending', 'unsubmitted'].includes(getStatus(c))).length,
		flagged: coaches.filter((c) => getStatus(c) === 'flagged').length,
	});
</script>

<svelte:head>
	<title>Compliance Panopticon — Director Portal</title>
</svelte:head>

<div class="dp-root">
	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<header class="dp-header">
		<div class="dp-header__left">
			<div class="dp-label">DIRECTOR PORTAL — COMPLIANCE PANOPTICON</div>
			<h1 class="dp-title">Staff Clearance Matrix</h1>
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
			ALPHA — ANKORED INTEGRATION SIMULATED
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
						<th>ANKORED STATUS</th>
						<th>LAST SYNCED</th>
						<th>ANKORED DASHBOARD</th>
						<th>ACTIONS</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as coach (coach.email)}
						{@const status = getStatus(coach)}
						{@const rs = rowState(coach.email)}
						{@const ankoredId = /** @type {string|undefined} */ (coach.clearance?.ankoredId)}
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

							<!-- Ankored status -->
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
								{#if ankoredId}
									<div class="dp-ankored-id" title="Ankored record ID">{ankoredId}</div>
								{/if}
							</td>

							<!-- Last synced -->
							<td class="dp-cell dp-cell--synced">
								<span class="dp-synced-ts">{fmtTimestamp(lastVerified)}</span>
							</td>

							<!-- Open Ankored Dashboard -->
							<td class="dp-cell dp-cell--dashboard">
								{#if status !== 'cleared'}
									<button
										class="dp-btn dp-btn--simulate"
										disabled={rs.simulating}
										onclick={() => simulateClearance(coach)}
										aria-label="Simulate Ankored clearance for {coach.email}"
									>
										{#if rs.simulating}
											<span class="dp-btn-spin">↻</span> SYNCING…
										{:else}
										<Icon name="game.zap" />
										SIMULATE ANKORED CLEARANCE
										{/if}
									</button>
								{/if}
								<a
									href="https://app.ankored.com"
									target="_blank"
									rel="noopener noreferrer"
									class="dp-btn dp-btn--ankored"
									aria-label="Open Ankored Dashboard (external)"
								>
								<Icon name="nav.external" />
								OPEN DASHBOARD
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

<style>
	.dp-root {
		min-height: 100dvh;
		background: var(--vanguard-bg, #010409);
		color: #e5e7eb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem;
	}

	/* ── Header ─────────────────────────────────────────────────────────────── */
	.dp-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.dp-label {
		font-size: 0.6rem;
		letter-spacing: 0.22em;
		font-weight: 700;
		color: rgba(0, 240, 255, 0.5);
		margin-bottom: 0.3rem;
	}

	.dp-title {
		margin: 0;
		font-size: clamp(1.2rem, 3vw, 1.6rem);
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #e5e7eb;
	}

	.dp-stats-rail {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.dp-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(0, 240, 255, 0.1);
		border-radius: 6px;
		padding: 0.5rem 0.9rem;
		min-width: 60px;
	}

	.dp-stat__val {
		font-size: 1.25rem;
		font-weight: 900;
		line-height: 1;
	}

	.dp-stat__key {
		font-size: 0.55rem;
		letter-spacing: 0.14em;
		color: rgba(229, 231, 235, 0.4);
		margin-top: 0.2rem;
	}

	.dp-stat--total .dp-stat__val   { color: rgba(229, 231, 235, 0.8); }
	.dp-stat--cleared .dp-stat__val { color: var(--vanguard-cyan, #00f0ff); text-shadow: 0 0 10px rgba(0,240,255,0.5); }
	.dp-stat--pending .dp-stat__val { color: #fbbf24; }
	.dp-stat--flagged .dp-stat__val { color: var(--vanguard-red, #ff003c); text-shadow: 0 0 10px rgba(255,0,60,0.5); }

	/* ── Search row ──────────────────────────────────────────────────────────── */
	.dp-search-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.dp-search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(0, 240, 255, 0.15);
		border-radius: 6px;
		padding: 0.4rem 0.75rem;
		flex: 1;
		min-width: 200px;
		max-width: 360px;
		color: rgba(0, 240, 255, 0.5);
	}

	.dp-search__input {
		background: transparent;
		border: none;
		outline: none;
		color: #e5e7eb;
		font-family: inherit;
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		width: 100%;
	}

	.dp-search__input::placeholder {
		color: rgba(229, 231, 235, 0.25);
		font-size: 0.68rem;
	}

	.dp-alpha-badge {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #fbbf24;
		border: 1px solid rgba(251, 191, 36, 0.2);
		padding: 0.3rem 0.7rem;
		border-radius: 4px;
	}

	/* ── Pulse dot ────────────────────────────────────────────────────────────── */
	.dp-pulse-dot {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #fbbf24;
		box-shadow: 0 0 6px #fbbf24;
		animation: dpPulseDot 1.4s ease-in-out infinite;
	}

	.dp-pulse-dot--sm {
		width: 5px;
		height: 5px;
	}

	@keyframes dpPulseDot {
		0%, 100% { opacity: 1; transform: scale(1); }
		50%       { opacity: 0.35; transform: scale(0.5); }
	}

	/* ── Loading / empty / error ────────────────────────────────────────────── */
	.dp-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: rgba(229, 231, 235, 0.4);
		font-size: 0.72rem;
		letter-spacing: 0.12em;
	}

	.dp-spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid rgba(0, 240, 255, 0.15);
		border-top-color: var(--vanguard-cyan, #00f0ff);
		border-radius: 50%;
		animation: dpSpin 0.7s linear infinite;
	}

	@keyframes dpSpin { to { transform: rotate(360deg); } }

	.dp-error {
		padding: 1.5rem;
		color: var(--vanguard-red, #ff003c);
		font-size: 0.75rem;
		text-align: center;
	}

	.dp-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem;
		color: rgba(229, 231, 235, 0.25);
		font-size: 0.7rem;
		letter-spacing: 0.12em;
	}

	.dp-empty i { font-size: 2.5rem; }

	/* ── Table ───────────────────────────────────────────────────────────────── */
	.dp-table-wrap {
		overflow-x: auto;
		border-radius: 8px;
		border: 1px solid rgba(0, 240, 255, 0.1);
		background: rgba(255, 255, 255, 0.02);
	}

	.dp-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.72rem;
	}

	.dp-table thead th {
		padding: 0.65rem 0.9rem;
		text-align: left;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: rgba(0, 240, 255, 0.4);
		border-bottom: 1px solid rgba(0, 240, 255, 0.08);
		white-space: nowrap;
		background: rgba(0, 240, 255, 0.02);
	}

	.dp-row {
		border-bottom: 1px solid rgba(0, 240, 255, 0.05);
		transition: background 0.15s;
	}

	.dp-row:last-child { border-bottom: none; }

	.dp-row:hover { background: rgba(0, 240, 255, 0.03); }

	.dp-row--flagged {
		background: rgba(255, 0, 60, 0.02);
	}

	.dp-row--flagged:hover {
		background: rgba(255, 0, 60, 0.05);
	}

	.dp-cell {
		padding: 0.7rem 0.9rem;
		vertical-align: middle;
	}

	/* Identity cell */
	.dp-identity__name {
		font-weight: 700;
		color: #e5e7eb;
		font-size: 0.78rem;
	}

	.dp-identity__email {
		color: rgba(229, 231, 235, 0.4);
		font-size: 0.65rem;
		margin-top: 0.15rem;
	}

	.dp-identity__role {
		display: inline-block;
		margin-top: 0.25rem;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(0, 240, 255, 0.5);
		border: 1px solid rgba(0, 240, 255, 0.15);
		padding: 0.1rem 0.35rem;
		border-radius: 2px;
	}

	/* Status pill */
	.dp-status {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		white-space: nowrap;
	}

	.dp-status--cleared {
		color: var(--vanguard-cyan, #00f0ff);
		border: 1px solid rgba(0, 240, 255, 0.25);
		background: rgba(0, 240, 255, 0.06);
	}

	.dp-status--pending,
	.dp-status--unsubmitted {
		color: #fbbf24;
		border: 1px solid rgba(251, 191, 36, 0.2);
		background: rgba(251, 191, 36, 0.04);
	}

	.dp-status--flagged {
		color: var(--vanguard-red, #ff003c);
		border: 1px solid rgba(255, 0, 60, 0.3);
		background: rgba(255, 0, 60, 0.06);
		animation: dpFlaggedPulse 1.8s ease-in-out infinite;
	}

	@keyframes dpFlaggedPulse {
		0%, 100% { box-shadow: none; }
		50%       { box-shadow: 0 0 8px rgba(255, 0, 60, 0.25); }
	}

	/* Ankored ID sub-label */
	.dp-ankored-id {
		font-size: 0.55rem;
		color: rgba(0, 240, 255, 0.35);
		margin-top: 0.2rem;
		letter-spacing: 0.06em;
	}

	/* Last-synced cell */
	.dp-cell--synced { white-space: nowrap; }

	.dp-synced-ts {
		font-size: 0.65rem;
		color: rgba(229, 231, 235, 0.45);
		font-variant-numeric: tabular-nums;
	}

	/* Dashboard cell */
	.dp-cell--dashboard {
		white-space: nowrap;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		align-items: flex-start;
	}

	.dp-btn--ankored {
		color: var(--vanguard-cyan, #00f0ff);
		border: 1px solid rgba(0, 240, 255, 0.25);
		background: rgba(0, 240, 255, 0.04);
		text-decoration: none;
	}

	.dp-btn--ankored:hover {
		background: rgba(0, 240, 255, 0.1);
		box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
	}

	/* Buttons */
	.dp-btn {
		font-family: inherit;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		border-radius: 3px;
		padding: 0.28rem 0.6rem;
		transition: all 0.15s;
		min-height: 28px;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.dp-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	.dp-btn--verify {
		color: var(--vanguard-cyan, #00f0ff);
		border: 1px solid rgba(0, 240, 255, 0.3);
		background: transparent;
	}

	.dp-btn--verify:not(:disabled):hover {
		background: rgba(0, 240, 255, 0.08);
		box-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
	}

	.dp-btn--simulate {
		color: #fbbf24;
		border: 1px solid rgba(251, 191, 36, 0.35);
		background: rgba(251, 191, 36, 0.04);
	}

	.dp-btn--simulate:not(:disabled):hover {
		background: rgba(251, 191, 36, 0.1);
		box-shadow: 0 0 10px rgba(251, 191, 36, 0.2);
	}

	.dp-btn--revoke {
		color: var(--vanguard-red, #ff003c);
		border: 1px solid rgba(255, 0, 60, 0.3);
		background: transparent;
	}

	.dp-btn--revoke:not(:disabled):hover {
		background: rgba(255, 0, 60, 0.07);
		box-shadow: 0 0 8px rgba(255, 0, 60, 0.2);
	}

	.dp-btn-spin {
		display: inline-block;
		animation: dpSpin 0.7s linear infinite;
	}

	.dp-row-error {
		display: block;
		font-size: 0.6rem;
		color: var(--vanguard-red, #ff003c);
		margin-bottom: 0.3rem;
	}

	.dp-cell--actions { white-space: nowrap; }
</style>
