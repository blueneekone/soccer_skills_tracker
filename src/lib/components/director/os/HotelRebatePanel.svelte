<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

	interface Props {
		clubId: string;
	}

	const { clubId }: Props = $props();

	interface RebateDoc {
		rebateId: string;
		hotelPartnerId: string;
		partnerName?: string;
		status: 'submitted' | 'approved' | 'transferred' | 'rejected';
		partnerCommissionCents: number;
		ngbCreditCents: number;
		vanguardRetentionCents?: number;
		roomNights?: number | null;
		periodStart?: string | null;
		periodEnd?: string | null;
		linkedEventId?: string | null;
		submittedAt?: unknown;
	}

	type BucketKey = 'submitted' | 'approved' | 'transferred';
	interface Bucket {
		key: BucketKey;
		label: string;
		color: string;
		rows: RebateDoc[];
		totalNgbCents: number;
	}

	let rebates = $state<RebateDoc[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');
	let activeBucket = $state<BucketKey>('submitted');

	let unsubscribe: (() => void) | null = null;

	$effect(() => {
		if (!clubId) return;
		loading = true;
		const db = getFirestore();
		const q = query(
			collection(db, 'hotel_rebates'),
			where('tenantId', '==', clubId),
			orderBy('submittedAt', 'desc'),
		);
		unsubscribe = onSnapshot(
			q,
			(snap) => {
				rebates = snap.docs.map((d) => ({
					rebateId: d.id,
					...(d.data() as Omit<RebateDoc, 'rebateId'>),
				}));
				loading = false;
			},
			(err) => {
				errorMsg = err.message;
				loading = false;
			},
		);
		return () => unsubscribe?.();
	});

	onDestroy(() => unsubscribe?.());

	const buckets = $derived<Bucket[]>([
		{
			key: 'submitted',
			label: 'Pending',
			color: '#fbbf24',
			rows: rebates.filter((r) => r.status === 'submitted'),
			totalNgbCents: rebates
				.filter((r) => r.status === 'submitted')
				.reduce((s, r) => s + Math.abs(r.ngbCreditCents), 0),
		},
		{
			key: 'approved',
			label: 'Approved',
			color: '#a5b4fc',
			rows: rebates.filter((r) => r.status === 'approved'),
			totalNgbCents: rebates
				.filter((r) => r.status === 'approved')
				.reduce((s, r) => s + Math.abs(r.ngbCreditCents), 0),
		},
		{
			key: 'transferred',
			label: 'Paid Out',
			color: '#34d399',
			rows: rebates.filter((r) => r.status === 'transferred'),
			totalNgbCents: rebates
				.filter((r) => r.status === 'transferred')
				.reduce((s, r) => s + Math.abs(r.ngbCreditCents), 0),
		},
	]);

	const activeRows = $derived(buckets.find((b) => b.key === activeBucket)?.rows ?? []);

	function formatCents(cents: number): string {
		return (Math.abs(cents) / 100).toLocaleString('en-US', {
			style: 'currency',
			currency: 'USD',
		});
	}

	function formatDate(val: unknown): string {
		if (!val) return '';
		try {
			const d =
				typeof val === 'string'
					? new Date(val)
					: typeof (val as { toDate?: () => Date }).toDate === 'function'
					? (val as { toDate: () => Date }).toDate()
					: new Date(val as number);
			return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		} catch { return ''; }
	}
</script>

<div class="rebate-panel">
	<div class="panel-header">
		<h3 class="panel-title">🏨 Hotel Rebates</h3>
		<span class="panel-note">Read-only — contact platform support to dispute.</span>
	</div>

	{#if errorMsg}
		<div class="error-pill">{errorMsg}</div>
	{/if}

	<!-- Bucket tabs -->
	<div class="bucket-tabs">
		{#each buckets as bucket}
			<button
				class="bucket-tab"
				class:active={activeBucket === bucket.key}
				style="--tab-color: {bucket.color}"
				onclick={() => { activeBucket = bucket.key; }}
			>
				<span class="tab-label">{bucket.label}</span>
				<span class="tab-count">{bucket.rows.length}</span>
				<span class="tab-total">{formatCents(bucket.totalNgbCents)}</span>
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="skeleton-list">
			{#each [1, 2, 3] as _}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if activeRows.length === 0}
		<div class="empty-state">No {activeBucket} rebates for your organization.</div>
	{:else}
		<div class="rebate-list">
			{#each activeRows as rebate (rebate.rebateId)}
				<div class="rebate-row">
					<div class="rebate-main">
						<span class="rebate-partner">{rebate.partnerName ?? rebate.hotelPartnerId}</span>
						{#if rebate.periodStart || rebate.periodEnd}
							<span class="rebate-period">
								{rebate.periodStart ?? ''}{rebate.periodEnd ? ` → ${rebate.periodEnd}` : ''}
							</span>
						{/if}
						{#if rebate.linkedEventId}
							<span class="rebate-event">Event: {rebate.linkedEventId}</span>
						{/if}
					</div>
					<div class="rebate-amounts">
						<div class="amount-item">
							<span class="amount-lbl">Commission</span>
							<span class="amount-val">{formatCents(rebate.partnerCommissionCents)}</span>
						</div>
						<div class="amount-item">
							<span class="amount-lbl">NGB Credit</span>
							<span class="amount-val credit">{formatCents(rebate.ngbCreditCents)}</span>
						</div>
						{#if rebate.roomNights}
							<div class="amount-item">
								<span class="amount-lbl">Rooms</span>
								<span class="amount-val">{rebate.roomNights}</span>
							</div>
						{/if}
					</div>
					<div class="rebate-meta">
						<span class="rebate-date">{formatDate(rebate.submittedAt)}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.rebate-panel { display: flex; flex-direction: column; gap: 0.85rem; }

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.panel-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
		margin: 0;
	}

	.panel-note {
		font-size: 0.7rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.error-pill {
		background: rgba(239,68,68,0.12);
		border: 1px solid rgba(239,68,68,0.3);
		border-radius: 8px;
		padding: 0.35rem 0.75rem;
		color: #fca5a5;
		font-size: 0.78rem;
	}

	/* Bucket tabs */
	.bucket-tabs {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.bucket-tab {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 12px;
		padding: 0.5rem 0.9rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		text-align: left;
		transition: border-color 0.15s, background 0.15s;
		flex: 1;
		min-width: 90px;
	}
	.bucket-tab:hover { border-color: rgba(255,255,255,0.18); }
	.bucket-tab.active {
		border-color: var(--tab-color);
		background: color-mix(in srgb, var(--tab-color) 12%, transparent);
	}

	.tab-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--vanguard-text-muted, #94a3b8);
	}
	.bucket-tab.active .tab-label { color: var(--tab-color); }

	.tab-count {
		font-size: 1.3rem;
		font-weight: 800;
		color: var(--vanguard-text-primary, #e2e8f0);
		line-height: 1;
	}

	.tab-total {
		font-size: 0.72rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	/* List */
	.rebate-list { display: flex; flex-direction: column; gap: 0.5rem; }

	.rebate-row {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: 0.75rem 1rem;
		align-items: start;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.06);
		border-radius: 12px;
		padding: 0.75rem 1rem;
	}

	.rebate-main { display: flex; flex-direction: column; gap: 0.2rem; overflow: hidden; }

	.rebate-partner {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--vanguard-text-primary, #e2e8f0);
	}

	.rebate-period, .rebate-event {
		font-size: 0.72rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.rebate-amounts {
		display: flex;
		gap: 1rem;
		flex-shrink: 0;
	}

	.amount-item { display: flex; flex-direction: column; gap: 0.1rem; text-align: right; }

	.amount-lbl {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.amount-val {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--vanguard-text-primary, #e2e8f0);
	}
	.amount-val.credit { color: #34d399; }

	.rebate-meta { flex-shrink: 0; text-align: right; }

	.rebate-date {
		font-size: 0.7rem;
		color: var(--vanguard-text-muted, #94a3b8);
	}

	.skeleton-list { display: flex; flex-direction: column; gap: 0.5rem; }

	.skeleton-row {
		height: 68px;
		background: rgba(255,255,255,0.04);
		border-radius: 12px;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }

	.empty-state {
		text-align: center;
		padding: 1.5rem;
		color: var(--vanguard-text-muted, #94a3b8);
		font-size: 0.875rem;
		border: 1px dashed rgba(255,255,255,0.1);
		border-radius: 12px;
	}
</style>
