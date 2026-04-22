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

	// ── Derived KPIs from stores (fast — no additional fetch) ────────────────────
	const clubCount  = $derived(teamsStore.clubs.length);
	const adminCount = $derived(teamsStore.admins.length);

	// ── Telemetry state ───────────────────────────────────────────────────────────
	let userCount        = $state(0);
	let licenseCount     = $state(0);
	let pastDueCount     = $state(0);
	let totalSeatsLic    = $state(0);   // sum of license_entitlements[*].seats_limit
	let totalSeatsUsed   = $state(0);   // sum of license_entitlements[*].active_seats
	let pendingVpcCount  = $state(0);
	let telLoading       = $state(false);
	let telErr           = $state('');

	// ── Single consolidated fetch — all telemetry data in one $effect ────────────
	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		let cancelled = false;
		telLoading = true;
		telErr = '';

		void (async () => {
			try {
				// Run all counts in parallel — no sequential blocking
				const [
					usersSnap,
					licensesSnap,
					entitlementsSnap,
					vpcCountResult,
				] = await Promise.all([
					getDocs(collection(db, 'users')),
					getDocs(collection(db, 'licenses')),
					getDocs(collection(db, 'license_entitlements')),
					getCountFromServer(
						query(
							collection(db, 'vpc_requests'),
							where('status', '==', 'pending_verification'),
						),
					).catch(() =>
						// Fallback to getDocs count if getCountFromServer is unavailable
						getDocs(
							query(
								collection(db, 'vpc_requests'),
								where('status', '==', 'pending_verification'),
							),
						).then((s) => ({ data: () => ({ count: s.size }) })),
					),
				]);

				if (cancelled) return;

				userCount    = usersSnap.size;
				licenseCount = licensesSnap.size;

				// Past-due count — licenses with status 'past_due'
				let pastDue = 0;
				licensesSnap.forEach((d) => {
					if (d.data().status === 'past_due') pastDue++;
				});
				pastDueCount = pastDue;

				// Seat aggregates — sum across all entitlement documents
				let lic = 0;
				let used = 0;
				entitlementsSnap.forEach((d) => {
					const data = d.data();
					if (data.isInfinite === true) return; // skip unlimited promos
					lic  += typeof data.seats_limit  === 'number' ? data.seats_limit  : 0;
					used += typeof data.active_seats === 'number' ? data.active_seats : 0;
				});
				totalSeatsLic  = lic;
				totalSeatsUsed = used;

				pendingVpcCount = vpcCountResult.data().count;
			} catch (e) {
				if (!cancelled) telErr = e instanceof Error ? e.message : 'Could not load telemetry.';
			} finally {
				if (!cancelled) telLoading = false;
			}
		})();

		return () => { cancelled = true; };
	});

	// ── Derived display values ────────────────────────────────────────────────────
	/** Placeholder MRR — $49/license, clearly labeled as estimate */
	const mrrEstimate = $derived(licenseCount * 49);

	/** Seat utilization 0–100 */
	const seatUtilPct = $derived(
		totalSeatsLic > 0 ? Math.min(100, Math.round((totalSeatsUsed / totalSeatsLic) * 100)) : 0,
	);

	/** Color tier for seat bar */
	const seatBarColor = $derived(
		seatUtilPct >= 90 ? '#ef4444'
		: seatUtilPct >= 70 ? '#f59e0b'
		: '#22c55e',
	);
</script>

<div class="tel-page">

	<!-- ── Executive stat bar ────────────────────────────────────────────────── -->
	<section class="tel-stats" aria-label="Platform metrics">
		<div class="tel-stat">
			<span class="tel-stat__label">Total Users</span>
			<span class="tel-stat__value">{telLoading ? '—' : userCount.toLocaleString()}</span>
		</div>
		<div class="tel-stats__div" aria-hidden="true"></div>
		<div class="tel-stat">
			<span class="tel-stat__label">Organizations</span>
			<span class="tel-stat__value">{clubCount.toLocaleString()}</span>
		</div>
		<div class="tel-stats__div" aria-hidden="true"></div>
		<div class="tel-stat">
			<span class="tel-stat__label">Active Licenses</span>
			<span class="tel-stat__value">{telLoading ? '—' : licenseCount.toLocaleString()}</span>
		</div>
		<div class="tel-stats__div" aria-hidden="true"></div>
		<div class="tel-stat">
			<span class="tel-stat__label">Platform Admins</span>
			<span class="tel-stat__value">{adminCount}</span>
		</div>
	</section>

	{#if telErr}
		<p class="tel-err" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			{telErr}
		</p>
	{/if}

	<!-- ── Telemetry widgets ──────────────────────────────────────────────────── -->
	<div class="tel-grid">

		<!-- Widget 1: Revenue Health -->
		<div class="tel-widget" aria-labelledby="tel-w1-title">
			<div class="tel-widget__header">
				<span class="tel-widget__icon tel-widget__icon--revenue">
					<i class="ph ph-currency-dollar" aria-hidden="true"></i>
				</span>
				<h2 id="tel-w1-title" class="tel-widget__title">Revenue Health</h2>
			</div>

			{#if telLoading}
				<div class="tel-widget__loading" aria-busy="true">
					<span class="tel-spinner" aria-hidden="true"></span>
					Loading…
				</div>
			{:else}
				<div class="tel-widget__body">
					<div class="tel-kv">
						<span class="tel-kv__label">Est. MRR</span>
						<span class="tel-kv__value tel-kv__value--large">
							${mrrEstimate.toLocaleString()}
							<span class="tel-kv__unit">/mo</span>
						</span>
						<span class="tel-kv__hint">@ $49 × {licenseCount} active licenses</span>
					</div>

					<div class="tel-kv tel-kv--sep">
						<span class="tel-kv__label">Past Due</span>
						<span
							class="tel-kv__value"
							class:tel-kv__value--danger={pastDueCount > 0}
							class:tel-kv__value--ok={pastDueCount === 0}
						>
							{#if pastDueCount === 0}
								<i class="ph ph-check-circle" aria-hidden="true"></i>
								None
							{:else}
								<i class="ph ph-warning" aria-hidden="true"></i>
								{pastDueCount}
								<span class="tel-kv__unit">accounts</span>
							{/if}
						</span>
						{#if pastDueCount > 0}
							<span class="tel-kv__hint tel-kv__hint--danger">
								Review overdue accounts in billing.
							</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Widget 2: Ecosystem Activity -->
		<div class="tel-widget" aria-labelledby="tel-w2-title">
			<div class="tel-widget__header">
				<span class="tel-widget__icon tel-widget__icon--ecosystem">
					<i class="ph ph-users-three" aria-hidden="true"></i>
				</span>
				<h2 id="tel-w2-title" class="tel-widget__title">Ecosystem Activity</h2>
			</div>

			{#if telLoading}
				<div class="tel-widget__loading" aria-busy="true">
					<span class="tel-spinner" aria-hidden="true"></span>
					Loading…
				</div>
			{:else}
				<div class="tel-widget__body">
					<div class="tel-kv">
						<span class="tel-kv__label">Seat Utilization</span>
						<span class="tel-kv__value tel-kv__value--large" style="--bar-color: {seatBarColor}">
							{seatUtilPct}%
						</span>
					</div>
					<!-- Utilization fill bar -->
					<div class="tel-seat-bar" role="progressbar" aria-valuenow={seatUtilPct} aria-valuemin="0" aria-valuemax="100" aria-label="Seat utilization">
						<div
							class="tel-seat-bar__fill"
							style="width: {seatUtilPct}%; background: {seatBarColor}"
						></div>
					</div>
					<div class="tel-seat-legend">
						<span class="tel-seat-legend__item">
							<span class="tel-seat-legend__dot tel-seat-legend__dot--used"></span>
							{totalSeatsUsed.toLocaleString()} used
						</span>
						<span class="tel-seat-legend__sep">/</span>
						<span class="tel-seat-legend__item">
							{totalSeatsLic.toLocaleString()} licensed
						</span>
						{#if totalSeatsLic === 0}
							<span class="tel-kv__hint">No entitlement records found. Promo licenses may be excluded.</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Widget 3: Compliance Bottlenecks -->
		<div
			class="tel-widget"
			class:tel-widget--alert={pendingVpcCount > 0}
			aria-labelledby="tel-w3-title"
		>
			<div class="tel-widget__header">
				<span class="tel-widget__icon tel-widget__icon--compliance">
					<i class="ph ph-shield-warning" aria-hidden="true"></i>
				</span>
				<h2 id="tel-w3-title" class="tel-widget__title">Compliance Bottlenecks</h2>
			</div>

			{#if telLoading}
				<div class="tel-widget__loading" aria-busy="true">
					<span class="tel-spinner" aria-hidden="true"></span>
					Loading…
				</div>
			{:else}
				<div class="tel-widget__body">
					<div class="tel-vpc-count" class:tel-vpc-count--zero={pendingVpcCount === 0}>
						{pendingVpcCount}
					</div>
					<p class="tel-vpc-label">
						{#if pendingVpcCount === 0}
							<i class="ph ph-check-circle" aria-hidden="true"></i>
							All parental consents verified
						{:else}
							Pending Parental Consents (VPC)
						{/if}
					</p>
					{#if pendingVpcCount > 0}
						<a href="/admin/organizations" class="tel-vpc-cta">
							Review organizations <i class="ph ph-arrow-right" aria-hidden="true"></i>
						</a>
					{/if}
				</div>
			{/if}
		</div>

	</div>

</div>

<style>
	.tel-page {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* ── Executive stat bar ─────────────────────────────────────────── */
	.tel-stats {
		display: flex;
		align-items: stretch;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 10px;
		background: var(--glass-bg, #fff);
		overflow: hidden;
		margin-bottom: 28px;
		flex-wrap: wrap;
	}

	:global(html.dark) .tel-stats {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.tel-stat {
		flex: 1 1 0;
		min-width: 120px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 20px 24px;
	}

	.tel-stats__div {
		flex-shrink: 0;
		width: 1px;
		background: var(--border-subtle, #e5e5e5);
		margin: 14px 0;
	}

	:global(html.dark) .tel-stats__div {
		background: rgba(255, 255, 255, 0.08);
	}

	.tel-stat__label {
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.tel-stat__value {
		font-size: 1.875rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	/* ── Error banner ───────────────────────────────────────────────── */
	.tel-err {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 20px;
		padding: 12px 14px;
		border-radius: 10px;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--danger-red, #b91c1c);
		background: rgba(185, 28, 28, 0.08);
		border: 1px solid rgba(185, 28, 28, 0.25);
	}

	/* ── Telemetry widget grid ──────────────────────────────────────── */
	.tel-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
		align-items: start;
	}

	@media (max-width: 900px) { .tel-grid { grid-template-columns: 1fr 1fr; } }
	@media (max-width: 560px) { .tel-grid { grid-template-columns: 1fr; } }

	/* ── Widget card ────────────────────────────────────────────────── */
	.tel-widget {
		display: flex;
		flex-direction: column;
		gap: 0;
		padding: 20px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 12px;
		background: var(--glass-bg, #fff);
		transition: border-color 0.15s ease;
	}

	:global(html.dark) .tel-widget {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.tel-widget--alert {
		border-color: rgba(245, 158, 11, 0.4);
	}

	:global(html.dark) .tel-widget--alert {
		border-color: rgba(245, 158, 11, 0.35);
		background: rgba(245, 158, 11, 0.04);
	}

	/* Widget header */
	.tel-widget__header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 16px;
	}

	.tel-widget__icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		flex-shrink: 0;
	}

	.tel-widget__icon--revenue   { background: rgba(16, 185, 129, 0.1); color: #059669; }
	.tel-widget__icon--ecosystem { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
	.tel-widget__icon--compliance{ background: rgba(245, 158, 11, 0.1); color: #d97706; }

	:global(html.dark) .tel-widget__icon--revenue    { background: rgba(16,185,129,0.12); color: #6ee7b7; }
	:global(html.dark) .tel-widget__icon--ecosystem  { background: rgba(99,102,241,0.12); color: #a5b4fc; }
	:global(html.dark) .tel-widget__icon--compliance { background: rgba(245,158,11,0.12); color: #fbbf24; }

	.tel-widget__title {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	/* Widget body */
	.tel-widget__body {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.tel-widget__loading {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.8125rem;
		color: var(--text-secondary);
		padding: 8px 0;
	}

	/* Loading spinner */
	.tel-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-top-color: var(--brand-primary, #f59e0b);
		animation: tel-spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	:global(html.dark) .tel-spinner {
		border-color: rgba(255, 255, 255, 0.1);
		border-top-color: var(--brand-primary, #f59e0b);
	}

	@keyframes tel-spin { to { transform: rotate(360deg); } }

	/* ── Key-value rows inside widgets ─────────────────────────────── */
	.tel-kv {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.tel-kv--sep {
		padding-top: 12px;
		border-top: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .tel-kv--sep {
		border-top-color: rgba(255, 255, 255, 0.07);
	}

	.tel-kv__label {
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
	}

	.tel-kv__value {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.tel-kv__value--large {
		font-size: 1.75rem;
		letter-spacing: -0.04em;
		color: var(--action-color, var(--text-primary));
	}

	.tel-kv__value--ok    { color: #15803d; }
	.tel-kv__value--danger{ color: var(--danger-red, #b91c1c); }

	:global(html.dark) .tel-kv__value--ok     { color: #86efac; }
	:global(html.dark) .tel-kv__value--danger { color: #fca5a5; }

	.tel-kv__unit {
		font-size: 0.75rem;
		font-weight: 500;
		opacity: 0.7;
		letter-spacing: 0;
	}

	.tel-kv__hint {
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.4;
		margin-top: 2px;
	}

	.tel-kv__hint--danger {
		color: var(--danger-red, #b91c1c);
	}

	:global(html.dark) .tel-kv__hint--danger { color: #fca5a5; }

	/* ── Seat utilization bar ───────────────────────────────────────── */
	.tel-seat-bar {
		width: 100%;
		height: 6px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.07);
		overflow: hidden;
	}

	:global(html.dark) .tel-seat-bar {
		background: rgba(255, 255, 255, 0.1);
	}

	.tel-seat-bar__fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.tel-seat-legend {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.tel-seat-legend__item {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.tel-seat-legend__dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #6366f1;
		flex-shrink: 0;
	}

	.tel-seat-legend__dot--used { background: #22c55e; }
	.tel-seat-legend__sep { opacity: 0.5; }

	/* ── VPC (pending consents) widget ─────────────────────────────── */
	.tel-vpc-count {
		font-size: 3.5rem;
		font-weight: 900;
		letter-spacing: -0.06em;
		line-height: 1;
		color: #d97706;
		font-variant-numeric: tabular-nums;
		transition: color 0.2s ease;
	}

	.tel-vpc-count--zero {
		color: #15803d;
	}

	:global(html.dark) .tel-vpc-count       { color: #fbbf24; }
	:global(html.dark) .tel-vpc-count--zero { color: #86efac; }

	.tel-vpc-label {
		margin: 8px 0 0;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.tel-vpc-cta {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 12px;
		padding: 7px 14px;
		border-radius: 7px;
		border: 1px solid rgba(245, 158, 11, 0.4);
		background: rgba(245, 158, 11, 0.06);
		color: #d97706;
		font-size: 0.8125rem;
		font-weight: 700;
		text-decoration: none;
		transition: background 0.1s ease;
	}

	.tel-vpc-cta:hover {
		background: rgba(245, 158, 11, 0.12);
	}

	:global(html.dark) .tel-vpc-cta {
		color: #fbbf24;
		border-color: rgba(245, 158, 11, 0.3);
	}

	@media (max-width: 680px) {
		.tel-stats { display: grid; grid-template-columns: 1fr 1fr; }
		.tel-stats__div { display: none; }
		.tel-stat { padding: 16px; border-bottom: 1px solid var(--border-subtle, #e5e5e5); }
		:global(html.dark) .tel-stat { border-bottom-color: rgba(255, 255, 255, 0.08); }
	}
</style>
