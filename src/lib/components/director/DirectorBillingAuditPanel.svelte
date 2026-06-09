<script lang="ts">
	/**
	 * DirectorBillingAuditPanel.svelte
	 * ──────────────────────────────────
	 * DIRECTOR VIEW — Stripe Connect status + tenant audit log reader.
	 *
	 * Stripe Connect status: reads organizations/{clubId} fields:
	 *   stripeAccountId, stripeOnboardingComplete, stripePayoutsEnabled, stripeUpdatedAt
	 *
	 * Audit log: queries audit_logs where tenantId == clubId, ordered by
	 * timestamp desc, limit 50.  Firestore rule: isDirector() && isAuthorized(tenantId).
	 */

	import { browser } from '$app/environment';
	import {
		doc,
		getDoc,
		collection,
		query,
		where,
		orderBy,
		limit,
		getDocs,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';

	// ── Props ──────────────────────────────────────────────────────────────────
	interface Props {
		clubId: string;
	}
	const { clubId }: Props = $props();

	// ── Types ──────────────────────────────────────────────────────────────────
	interface StripeData {
		stripeAccountId: string | null;
		stripeOnboardingComplete: boolean | null;
		stripePayoutsEnabled: boolean | null;
		stripeUpdatedAt: Date | null;
	}

	interface AuditRow {
		id: string;
		action: string;
		actorEmail: string | null;
		targetEmail: string | null;
		timestamp: Date | null;
	}

	// ── State ──────────────────────────────────────────────────────────────────
	let stripeData = $state<StripeData>({
		stripeAccountId: null,
		stripeOnboardingComplete: null,
		stripePayoutsEnabled: null,
		stripeUpdatedAt: null,
	});
	let auditRows = $state<AuditRow[]>([]);
	let loading = $state(false);
	let error = $state('');

	// ── Derived ────────────────────────────────────────────────────────────────
	const connectStatus = $derived.by((): 'NOT_STARTED' | 'PENDING' | 'RESTRICTED' | 'CONNECTED' => {
		if (!stripeData.stripeAccountId) return 'NOT_STARTED';
		if (stripeData.stripeOnboardingComplete === true) {
			if (stripeData.stripePayoutsEnabled === false) return 'RESTRICTED';
			return 'CONNECTED';
		}
		return 'PENDING';
	});

	// ── Load ───────────────────────────────────────────────────────────────────
	$effect(() => {
		if (!browser || !clubId) return;
		void load(clubId);
	});

	async function load(id: string) {
		loading = true;
		error = '';
		try {
			const [orgSnap, auditSnap] = await Promise.all([
				getDoc(doc(db, 'organizations', id)),
				getDocs(
					query(
						collection(db, 'audit_logs'),
						where('tenantId', '==', id),
						orderBy('timestamp', 'desc'),
						limit(50),
					),
				),
			]);

			if (orgSnap.exists()) {
				const d = orgSnap.data();
				stripeData = {
					stripeAccountId: typeof d.stripeAccountId === 'string' ? d.stripeAccountId : null,
					stripeOnboardingComplete:
						typeof d.stripeOnboardingComplete === 'boolean' ? d.stripeOnboardingComplete : null,
					stripePayoutsEnabled:
						typeof d.stripePayoutsEnabled === 'boolean' ? d.stripePayoutsEnabled : null,
					stripeUpdatedAt: d.stripeUpdatedAt?.toDate?.() ?? null,
				};
			}

			auditRows = auditSnap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					action: String(data.action ?? ''),
					actorEmail: data.actorEmail ? String(data.actorEmail) : null,
					targetEmail: data.targetEmail ? String(data.targetEmail) : null,
					timestamp: data.timestamp?.toDate?.() ?? null,
				};
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load billing / audit data.';
		} finally {
			loading = false;
		}
	}

	function fmtDate(d: Date | null): string {
		if (!d) return '—';
		return d.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	const STATUS_LABEL: Record<string, string> = {
		NOT_STARTED: 'NOT STARTED',
		PENDING: 'PENDING',
		RESTRICTED: 'RESTRICTED',
		CONNECTED: 'CONNECTED',
	};

	const STATUS_COLOR: Record<string, string> = {
		NOT_STARTED: 'rgba(148,163,184,0.7)',
		PENDING: 'rgba(251,191,36,0.85)',
		RESTRICTED: 'rgba(248,113,113,0.85)',
		CONNECTED: 'rgba(20,184,166,0.9)',
	};
</script>

<div class="dbap-root">
	<!-- ── Stripe Connect Status ───────────────────────────────────────────── -->
	<section class="dbap-card">
		<header class="dbap-card__header">
			<span class="dbap-eyebrow">BILLING · STRIPE CONNECT STATUS</span>
		</header>

		{#if loading}
			<div class="dbap-loading">
				<span class="dbap-spin" aria-hidden="true"></span>
				Loading…
			</div>
		{:else if error}
			<div class="dbap-error" role="alert">{error}</div>
		{:else}
			<div class="dbap-stripe-row">
				<span
					class="dbap-status-badge"
					style:color={STATUS_COLOR[connectStatus]}
					style:border-color={STATUS_COLOR[connectStatus]}
				>
					<span
						class="dbap-status-dot"
						style:background={STATUS_COLOR[connectStatus]}
						aria-hidden="true"
					></span>
					{STATUS_LABEL[connectStatus]}
				</span>
				{#if stripeData.stripeAccountId}
					<span class="dbap-account-id" title={stripeData.stripeAccountId}>
						{stripeData.stripeAccountId.slice(0, 18)}…
					</span>
				{/if}
				{#if stripeData.stripeUpdatedAt}
					<span class="dbap-updated">Last sync: {fmtDate(stripeData.stripeUpdatedAt)}</span>
				{/if}
			</div>
			<p class="dbap-hint">
				{#if connectStatus === 'NOT_STARTED'}
					Payout account not yet connected. Use the onboarding link to set up Stripe Express.
				{:else if connectStatus === 'PENDING'}
					Onboarding in progress. Complete all Stripe steps to enable season-fee payouts.
				{:else if connectStatus === 'RESTRICTED'}
					Account onboarded but payouts are currently restricted by Stripe. Check the Stripe dashboard.
				{:else}
					Payout account connected and payouts enabled. Season registration fees will route to this account.
				{/if}
			</p>
		{/if}
	</section>

	<!-- ── Tenant Audit Log ────────────────────────────────────────────────── -->
	<section class="dbap-card">
		<header class="dbap-card__header dbap-card__header--audit">
			<span class="dbap-eyebrow">COMPLIANCE · TENANT AUDIT LOG</span>
			<button
				class="dbap-refresh"
				onclick={() => { if (clubId) void load(clubId); }}
				disabled={loading}
				aria-label="Refresh audit log"
			>
				{#if loading}
					<span class="dbap-spin dbap-spin--sm" aria-hidden="true"></span>
				{:else}
					↺
				{/if}
			</button>
		</header>

		{#if loading}
			<div class="dbap-loading">
				<span class="dbap-spin" aria-hidden="true"></span>
				Loading audit trail…
			</div>
		{:else if error}
			<div class="dbap-error" role="alert">{error}</div>
		{:else if auditRows.length === 0}
			<div class="dbap-empty">
				<span aria-hidden="true">◈</span>
				<p>No tenant audit events found.</p>
			</div>
		{:else}
			<div class="dbap-table-wrap" role="table" aria-label="Tenant audit log">
				<div class="dbap-thead" role="row">
					<span role="columnheader">ACTION</span>
					<span role="columnheader">ACTOR</span>
					<span role="columnheader">TARGET</span>
					<span role="columnheader">TIMESTAMP</span>
				</div>
				{#each auditRows as row (row.id)}
					<div class="dbap-row" role="row">
						<span class="dbap-cell dbap-cell--action">{row.action}</span>
						<span class="dbap-cell dbap-cell--mono">{row.actorEmail ?? '— system —'}</span>
						<span class="dbap-cell dbap-cell--dim">{row.targetEmail ?? '—'}</span>
						<span class="dbap-cell dbap-cell--mono dbap-cell--dim">{fmtDate(row.timestamp)}</span>
					</div>
				{/each}
			</div>
			<p class="dbap-legal">
				Showing up to 50 most recent tenant-scoped events. Records are immutable.
			</p>
		{/if}
	</section>
</div>

<style>
	.dbap-root {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.dbap-card {
		background: rgba(6, 8, 16, 0.92);
		border: 1px solid rgba(20, 184, 166, 0.15);
		border-radius: 12px;
		overflow: hidden;
		font-family: 'JetBrains Mono', monospace;
	}

	.dbap-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.1rem 1.5rem 0.9rem;
		background: rgba(20, 184, 166, 0.04);
		border-bottom: 1px solid rgba(20, 184, 166, 0.1);
	}

	.dbap-card__header--audit {
		justify-content: space-between;
	}

	.dbap-eyebrow {
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(20, 184, 166, 0.65);
	}

	/* ── Stripe status ───────────────────────────────────────────────────── */
	.dbap-stripe-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 1rem 1.5rem 0.5rem;
	}

	.dbap-status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.75rem;
		border: 1px solid;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.dbap-status-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		box-shadow: 0 0 5px currentColor;
		flex-shrink: 0;
	}

	.dbap-account-id {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.dbap-updated {
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.25);
		margin-left: auto;
	}

	.dbap-hint {
		margin: 0;
		padding: 0.5rem 1.5rem 1rem;
		font-size: 0.68rem;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.3);
	}

	/* ── Audit table ─────────────────────────────────────────────────────── */
	.dbap-table-wrap {
		display: grid;
	}

	.dbap-thead,
	.dbap-row {
		display: grid;
		grid-template-columns: 200px 1fr 1fr 160px;
		gap: 0;
		padding: 0.5rem 1.5rem;
		align-items: center;
	}

	.dbap-thead {
		font-size: 0.52rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.2);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.dbap-row {
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: background 0.12s;
	}

	.dbap-row:hover {
		background: rgba(20, 184, 166, 0.03);
	}

	.dbap-cell {
		font-size: 0.65rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: rgba(255, 255, 255, 0.75);
	}

	.dbap-cell--action {
		font-weight: 700;
		font-size: 0.6rem;
		letter-spacing: 0.06em;
		color: rgba(20, 184, 166, 0.85);
	}

	.dbap-cell--mono {
		font-family: 'JetBrains Mono', monospace;
	}

	.dbap-cell--dim {
		color: rgba(255, 255, 255, 0.35);
	}

	.dbap-legal {
		margin: 0;
		padding: 0.6rem 1.5rem;
		font-size: 0.58rem;
		color: rgba(255, 255, 255, 0.18);
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	/* ── States ──────────────────────────────────────────────────────────── */
	.dbap-loading,
	.dbap-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2.5rem 2rem;
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.72rem;
	}

	.dbap-empty p {
		margin: 0;
	}

	.dbap-error {
		margin: 1rem 1.5rem;
		padding: 0.55rem 0.875rem;
		background: rgba(248, 113, 113, 0.08);
		border: 1px solid rgba(248, 113, 113, 0.2);
		border-radius: 6px;
		color: rgba(248, 113, 113, 0.85);
		font-size: 0.7rem;
	}

	.dbap-refresh {
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.35);
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.dbap-refresh:hover:not(:disabled) {
		border-color: rgba(20, 184, 166, 0.3);
		color: #14b8a6;
	}

	.dbap-refresh:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.dbap-spin {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(20, 184, 166, 0.2);
		border-top-color: #14b8a6;
		border-radius: 50%;
		animation: dbap-spin 0.7s linear infinite;
		display: inline-block;
	}

	.dbap-spin--sm {
		width: 12px;
		height: 12px;
	}

	@keyframes dbap-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 640px) {
		.dbap-thead,
		.dbap-row {
			grid-template-columns: 160px 1fr;
		}

		.dbap-cell:nth-child(3),
		.dbap-cell:nth-child(4),
		[role='columnheader']:nth-child(3),
		[role='columnheader']:nth-child(4) {
			display: none;
		}
	}
</style>
