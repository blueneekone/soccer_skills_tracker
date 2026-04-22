<script>
	import { db } from '$lib/firebase.js';
	import {
		collection,
		query,
		where,
		getDocs,
		getCountFromServer,
	} from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import '$lib/styles/enterprise-console.css';

	// ── KPI group 1: Gross Revenue & Receivables ─────────────────────────────────
	let licenseCount        = $state(0);
	let pastDueCount        = $state(0);
	let outstandingInstalls = $state(0); // payment_plans count (graceful fallback)

	// ── KPI group 2: Platform Health ─────────────────────────────────────────────
	let totalClubs     = $state(0);
	let totalTeams     = $state(0);
	let totalAthletes  = $state(0);

	// ── KPI group 3: Compliance & Logistics ──────────────────────────────────────
	let pendingVpcCount    = $state(0);
	let activeBookingCount = $state(0); // field_bookings count (graceful fallback)

	// ── Loading / error ───────────────────────────────────────────────────────────
	let telLoading = $state(false);
	let telErr     = $state('');

	// ── Single consolidated fetch — all telemetry data in one $effect ─────────────
	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		let destroyed = false;
		telLoading = true;
		telErr = '';

		void (async () => {
			try {
				// All queries fire in parallel. New collections (payment_plans, field_bookings)
				// use .catch(() => { data: () => ({ count: 0 }) }) so the entire Promise.all
				// never rejects just because a collection doesn't exist yet.
				const [
					licensesSnap,
					clubsSnap,
					teamsCountSnap,
					athletesCountSnap,
					vpcCountSnap,
					installmentsCountSnap,
					bookingsCountSnap,
				] = await Promise.all([
					// Group 1 — Revenue
					getDocs(collection(db, 'licenses')),
					// Group 2 — Platform Health
					getDocs(collection(db, 'clubs')),
					getCountFromServer(collection(db, 'teams'))
						.catch(() => getDocs(collection(db, 'teams'))
							.then((s) => ({ data: () => ({ count: s.size }) }))
							.catch(() => ({ data: () => ({ count: 0 }) })),
						),
					getCountFromServer(collection(db, 'player_lookup'))
						.catch(() => getDocs(collection(db, 'player_lookup'))
							.then((s) => ({ data: () => ({ count: s.size }) }))
							.catch(() => ({ data: () => ({ count: 0 }) })),
						),
					// Group 3 — Compliance & Logistics
					getCountFromServer(
						query(collection(db, 'vpc_requests'), where('status', '==', 'pending_verification')),
					).catch(() =>
						getDocs(
							query(collection(db, 'vpc_requests'), where('status', '==', 'pending_verification')),
						).then((s) => ({ data: () => ({ count: s.size }) }))
						 .catch(() => ({ data: () => ({ count: 0 }) })),
					),
					// Outstanding player installments — payment_plans collection may not exist yet
					getCountFromServer(collection(db, 'payment_plans'))
						.catch(() => ({ data: () => ({ count: 0 }) })),
					// Active field/facility bookings — field_bookings collection may not exist yet
					getCountFromServer(
						query(collection(db, 'field_bookings'), where('status', '==', 'active')),
					).catch(() => ({ data: () => ({ count: 0 }) })),
				]);

				if (destroyed) return;

				// ── Group 1: Revenue & Receivables ────────────────────────────
				licenseCount = licensesSnap.size;
				let pastDue = 0;
				licensesSnap.forEach((d) => {
					if (d.data().status === 'past_due') pastDue++;
				});
				pastDueCount        = pastDue;
				outstandingInstalls = installmentsCountSnap.data().count;

				// ── Group 2: Platform Health ──────────────────────────────────
				totalClubs    = clubsSnap.size;
				totalTeams    = teamsCountSnap.data().count;
				totalAthletes = athletesCountSnap.data().count;

				// ── Group 3: Compliance & Logistics ──────────────────────────
				pendingVpcCount    = vpcCountSnap.data().count;
				activeBookingCount = bookingsCountSnap.data().count;

			} catch (e) {
				if (!destroyed) telErr = e instanceof Error ? e.message : 'Could not load telemetry.';
			} finally {
				if (!destroyed) telLoading = false;
			}
		})();

		return () => {
			destroyed = true;
		};
	});

	// ── Derived display values ────────────────────────────────────────────────────
	/** Estimated MRR at $49/license — clearly labeled as estimate in the UI */
	const mrrEstimate = $derived(licenseCount * 49);

	/** Stripe-style MRR formatted string */
	const mrrDisplay = $derived(
		mrrEstimate >= 1000
			? `$${(mrrEstimate / 1000).toFixed(1)}k`
			: `$${mrrEstimate.toLocaleString()}`,
	);

	const adminCount = $derived(teamsStore.admins.length);
</script>

<div class="ov-page">

	{#if telErr}
		<p class="ov-err" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			{telErr}
		</p>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- KPI Group 1: Gross Revenue & Receivables                              -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<section class="ov-group" aria-labelledby="ov-g1-title">
		<div class="ov-group__header">
			<span class="ov-group__icon ov-group__icon--revenue">
				<i class="ph ph-trend-up" aria-hidden="true"></i>
			</span>
			<h2 id="ov-g1-title" class="ov-group__title">Gross Revenue &amp; Receivables</h2>
			<span class="ov-group__badge">
				<span class="ov-group__badge-dot ov-group__badge-dot--live"></span>
				Estimates
			</span>
		</div>

		<div class="ov-kpi-row">
			<div class="ov-kpi">
				<span class="ov-kpi__label">Est. MRR</span>
				<span class="ov-kpi__value ov-kpi__value--xl">
					{telLoading ? '—' : mrrDisplay}
				</span>
				<span class="ov-kpi__sub">@ $49 × {licenseCount} licenses</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Active Licenses</span>
				<span class="ov-kpi__value">
					{telLoading ? '—' : licenseCount.toLocaleString()}
				</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Past Due Accounts</span>
				<span
					class="ov-kpi__value"
					class:ov-kpi__value--danger={pastDueCount > 0}
					class:ov-kpi__value--ok={!telLoading && pastDueCount === 0}
				>
					{#if telLoading}
						—
					{:else if pastDueCount === 0}
						<i class="ph ph-check-circle" aria-hidden="true"></i>
						None
					{:else}
						<i class="ph ph-warning" aria-hidden="true"></i>
						{pastDueCount}
					{/if}
				</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Installment Plans</span>
				<span
					class="ov-kpi__value"
					class:ov-kpi__value--muted={outstandingInstalls === 0}
				>
					{telLoading ? '—' : outstandingInstalls.toLocaleString()}
				</span>
				<span class="ov-kpi__sub">Outstanding payment plans</span>
			</div>
		</div>
	</section>

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- KPI Group 2: Platform Health                                           -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<section class="ov-group" aria-labelledby="ov-g2-title">
		<div class="ov-group__header">
			<span class="ov-group__icon ov-group__icon--health">
				<i class="ph ph-pulse" aria-hidden="true"></i>
			</span>
			<h2 id="ov-g2-title" class="ov-group__title">Platform Health</h2>
		</div>

		<div class="ov-kpi-row">
			<div class="ov-kpi">
				<span class="ov-kpi__label">Active Clubs</span>
				<span class="ov-kpi__value ov-kpi__value--xl">
					{telLoading ? '—' : totalClubs.toLocaleString()}
				</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Total Teams</span>
				<span class="ov-kpi__value">
					{telLoading ? '—' : totalTeams.toLocaleString()}
				</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Total Athletes</span>
				<span class="ov-kpi__value">
					{telLoading ? '—' : totalAthletes.toLocaleString()}
				</span>
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Platform Admins</span>
				<span class="ov-kpi__value">
					{adminCount}
				</span>
			</div>
		</div>
	</section>

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- KPI Group 3: Compliance & Logistics                                    -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<section
		class="ov-group"
		class:ov-group--alert={pendingVpcCount > 0}
		aria-labelledby="ov-g3-title"
	>
		<div class="ov-group__header">
			<span class="ov-group__icon ov-group__icon--compliance">
				<i class="ph ph-shield-warning" aria-hidden="true"></i>
			</span>
			<h2 id="ov-g3-title" class="ov-group__title">Compliance &amp; Logistics</h2>
			{#if pendingVpcCount > 0}
				<span class="ov-group__badge ov-group__badge--warn">
					<span class="ov-group__badge-dot ov-group__badge-dot--warn"></span>
					Action required
				</span>
			{/if}
		</div>

		<div class="ov-kpi-row">
			<div class="ov-kpi">
				<span class="ov-kpi__label">Pending VPC Approvals</span>
				<span
					class="ov-kpi__value ov-kpi__value--xl"
					class:ov-kpi__value--danger={pendingVpcCount > 0}
					class:ov-kpi__value--ok={!telLoading && pendingVpcCount === 0}
				>
					{#if telLoading}
						—
					{:else if pendingVpcCount === 0}
						<i class="ph ph-check-circle" aria-hidden="true"></i>
						0
					{:else}
						{pendingVpcCount}
					{/if}
				</span>
				<span class="ov-kpi__sub">Unverified parental consents</span>
				{#if pendingVpcCount > 0}
					<a href="/admin/organizations" class="ov-kpi__cta">
						Review organizations <i class="ph ph-arrow-right" aria-hidden="true"></i>
					</a>
				{/if}
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Active Field Bookings</span>
				<span
					class="ov-kpi__value"
					class:ov-kpi__value--muted={activeBookingCount === 0}
				>
					{telLoading ? '—' : activeBookingCount.toLocaleString()}
				</span>
				<span class="ov-kpi__sub">Active facility reservations</span>
				{#if activeBookingCount === 0 && !telLoading}
					<span class="ov-kpi__hint">No active bookings — Field Ops coming in Epic 3</span>
				{/if}
			</div>
			<div class="ov-kpi-divider" aria-hidden="true"></div>
			<div class="ov-kpi">
				<span class="ov-kpi__label">Compliance Rate</span>
				<span class="ov-kpi__value">
					{#if telLoading}
						—
					{:else if pendingVpcCount === 0}
						<span class="ov-kpi__value--ok">
							<i class="ph ph-check-circle" aria-hidden="true"></i>
							100%
						</span>
					{:else}
						{Math.max(0, Math.round((1 - pendingVpcCount / Math.max(pendingVpcCount, 1)) * 100))}%
					{/if}
				</span>
				<span class="ov-kpi__sub">VPC verification rate</span>
			</div>
		</div>
	</section>

</div>

<style>
	.ov-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* ── Error banner ───────────────────────────────────────────────── */
	.ov-err {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 12px 14px;
		border-radius: 10px;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--danger-red, #b91c1c);
		background: rgba(185, 28, 28, 0.08);
		border: 1px solid rgba(185, 28, 28, 0.25);
	}

	/* ── KPI Group section ──────────────────────────────────────────── */
	.ov-group {
		display: flex;
		flex-direction: column;
		gap: 0;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 12px;
		background: var(--glass-bg, #fff);
		overflow: hidden;
		transition: border-color 0.15s ease;
	}

	:global(html.dark) .ov-group {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ov-group--alert {
		border-color: rgba(245, 158, 11, 0.45);
	}

	:global(html.dark) .ov-group--alert {
		border-color: rgba(245, 158, 11, 0.35);
		background: rgba(245, 158, 11, 0.03);
	}

	/* ── Group header ───────────────────────────────────────────────── */
	.ov-group__header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 20px 10px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .ov-group__header {
		border-bottom-color: rgba(255, 255, 255, 0.07);
	}

	.ov-group__icon {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		flex-shrink: 0;
	}

	.ov-group__icon--revenue    { background: rgba(16,185,129,0.10); color: #059669; }
	.ov-group__icon--health     { background: rgba(99,102,241,0.10); color: #6366f1; }
	.ov-group__icon--compliance { background: rgba(245,158,11,0.10); color: #d97706; }

	:global(html.dark) .ov-group__icon--revenue    { background: rgba(16,185,129,0.14); color: #6ee7b7; }
	:global(html.dark) .ov-group__icon--health     { background: rgba(99,102,241,0.14); color: #a5b4fc; }
	:global(html.dark) .ov-group__icon--compliance { background: rgba(245,158,11,0.14); color: #fbbf24; }

	.ov-group__title {
		margin: 0;
		flex: 1;
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.ov-group__badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--text-secondary);
		background: rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.06);
	}

	:global(html.dark) .ov-group__badge {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
		color: #a1a1aa;
	}

	.ov-group__badge--warn {
		color: #b45309;
		background: rgba(245, 158, 11, 0.08);
		border-color: rgba(245, 158, 11, 0.25);
	}

	:global(html.dark) .ov-group__badge--warn {
		color: #fbbf24;
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.25);
	}

	.ov-group__badge-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		flex-shrink: 0;
		background: rgba(0, 0, 0, 0.25);
	}

	.ov-group__badge-dot--live { background: #22c55e; }
	.ov-group__badge-dot--warn { background: #f59e0b; animation: ov-pulse 1.8s ease infinite; }

	@keyframes ov-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
		50%       { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0); }
	}

	/* ── KPI row — horizontal strip of metrics ──────────────────────── */
	.ov-kpi-row {
		display: flex;
		align-items: stretch;
		flex-wrap: wrap;
	}

	.ov-kpi {
		flex: 1 1 0;
		min-width: 130px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 20px 24px;
	}

	.ov-kpi-divider {
		flex-shrink: 0;
		width: 1px;
		background: var(--border-subtle, #e5e5e5);
		margin: 16px 0;
		align-self: stretch;
	}

	:global(html.dark) .ov-kpi-divider {
		background: rgba(255, 255, 255, 0.07);
	}

	/* ── KPI label ──────────────────────────────────────────────────── */
	.ov-kpi__label {
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	/* ── KPI value ──────────────────────────────────────────────────── */
	.ov-kpi__value {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 1.625rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}

	.ov-kpi__value--xl {
		font-size: 2.25rem;
	}

	.ov-kpi__value--ok     { color: #15803d; }
	.ov-kpi__value--danger { color: var(--danger-red, #b91c1c); }
	.ov-kpi__value--muted  { color: var(--text-secondary); font-size: 1.25rem; font-weight: 600; }

	:global(html.dark) .ov-kpi__value--ok     { color: #86efac; }
	:global(html.dark) .ov-kpi__value--danger { color: #fca5a5; }

	/* ── Sub-label / hint ───────────────────────────────────────────── */
	.ov-kpi__sub {
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.4;
		margin-top: 2px;
	}

	.ov-kpi__hint {
		font-size: 0.72rem;
		color: var(--text-secondary);
		opacity: 0.65;
		font-style: italic;
		line-height: 1.4;
	}

	/* ── CTA link inside KPI ────────────────────────────────────────── */
	.ov-kpi__cta {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 10px;
		padding: 6px 12px;
		border-radius: 7px;
		border: 1px solid rgba(245, 158, 11, 0.4);
		background: rgba(245, 158, 11, 0.06);
		color: #d97706;
		font-size: 0.75rem;
		font-weight: 700;
		text-decoration: none;
		transition: background 0.1s ease;
		width: fit-content;
	}

	.ov-kpi__cta:hover { background: rgba(245, 158, 11, 0.12); }

	:global(html.dark) .ov-kpi__cta {
		color: #fbbf24;
		border-color: rgba(245, 158, 11, 0.3);
	}

	/* ── Responsive — stack KPI rows on narrow viewports ───────────── */
	@media (max-width: 680px) {
		.ov-kpi-row { flex-direction: column; }
		.ov-kpi-divider { width: 100%; height: 1px; margin: 0; }
		.ov-kpi { padding: 16px; }
	}
</style>
