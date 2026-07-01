<script>
	import { onDestroy } from 'svelte';
	import { FeeLedgerEngine } from '$lib/services/feeLedger.svelte.ts';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { centsToUsd, bpToPercentLabel } from '$lib/types/pricing';

	/** @type {{ clubId?: string }} */
	let { clubId = '' } = $props();

	const legacyTier = $derived(
		typeof licenseEntitlementStore.entitlement?.tier === 'string'
			? String(licenseEntitlementStore.entitlement.tier).toLowerCase()
			: null,
	);
	const legacySeats = $derived(
		typeof licenseEntitlementStore.entitlement?.seats_limit === 'number'
			? licenseEntitlementStore.entitlement.seats_limit
			: 0,
	);

	const engine = new FeeLedgerEngine(legacyTier, legacySeats);

	$effect(() => {
		if (clubId) {
			engine.connect(clubId);
		} else {
			engine.disconnect();
		}
	});

	onDestroy(() => engine.disconnect());

	const sparklinePath = $derived.by(() => {
		const pts = engine.monthlySparkline;
		if (!pts || pts.length < 2) return '';
		const max = Math.max(1, ...pts.map((p) => p.feesCents));
		const w = 100;
		const h = 28;
		const step = w / (pts.length - 1);
		return pts
			.map((p, i) => {
				const x = (i * step).toFixed(2);
				const y = (h - (p.feesCents / max) * h).toFixed(2);
				return `${i === 0 ? 'M' : 'L'}${x},${y}`;
			})
			.join(' ');
	});

	const savings = $derived(engine.savingsCentsVsLegacy());
	const breakdown = $derived(engine.breakdownByType);

	function rateLabel(/** @type {number} */ bp) {
		if (bp === 0) return '—';
		return bpToPercentLabel(bp);
	}

	function typeLabel(/** @type {string} */ type) {
		const map = {
			season_registration: 'Registrations',
			digital_ticketing: 'Tickets',
			hotel_rebate: 'Hotel rebate',
			merch_sale: 'Merch',
			tournament_entry: 'Tournament entry',
			recruiter_lead_export: 'Recruiter exports',
		};
		return map[type] || type;
	}
</script>

<section class="revenue-ledger" aria-labelledby="revenue-ledger-title">
	<header class="revenue-ledger__head">
		<span class="revenue-ledger__eyebrow">platform fees · ytd</span>
		<h3 id="revenue-ledger-title" class="revenue-ledger__title">Revenue ledger</h3>
		<p class="revenue-ledger__lede">
			Vanguard charges only when money moves through the platform.
			Below is what your club has run year-to-date.
		</p>
	</header>

	{#if engine.loading}
		<p class="revenue-ledger__status">Loading ledger…</p>
	{:else if engine.error}
		<p class="revenue-ledger__status revenue-ledger__status--err" role="alert">
			{engine.error}
		</p>
	{:else if !engine.hasData}
		<p class="revenue-ledger__status">
			No transactions yet this year. As registrations, tickets, or rebates flow,
			they will appear here.
		</p>
	{:else}
		<div class="revenue-ledger__tiles">
			<article class="revenue-tile">
				<span class="revenue-tile__label">Gross volume</span>
				<strong class="revenue-tile__value">{centsToUsd(engine.ytdGrossCents)}</strong>
				<span class="revenue-tile__hint">{engine.ytdTxnCount} transactions</span>
			</article>
			<article class="revenue-tile">
				<span class="revenue-tile__label">Platform fees</span>
				<strong class="revenue-tile__value">{centsToUsd(engine.ytdFeesCents)}</strong>
				<span class="revenue-tile__hint">eff. {rateLabel(engine.effectiveRateBp)}</span>
			</article>
			<article class="revenue-tile">
				<span class="revenue-tile__label">Net to club</span>
				<strong class="revenue-tile__value">
					{centsToUsd(engine.ytdGrossCents - engine.ytdFeesCents)}
				</strong>
				<span class="revenue-tile__hint">after platform fee</span>
			</article>
			{#if savings !== null}
				<article class="revenue-tile revenue-tile--savings">
					<span class="revenue-tile__label">Savings vs subscription</span>
					<strong class="revenue-tile__value">
						{centsToUsd(savings)}
					</strong>
					<span class="revenue-tile__hint">vs legacy plan ytd</span>
				</article>
			{/if}
		</div>

		{#if sparklinePath}
			<svg
				class="revenue-ledger__spark"
				viewBox="0 0 100 28"
				preserveAspectRatio="none"
				aria-label="Monthly platform fees over the last 12 months"
				role="img"
			>
				<path d={sparklinePath} fill="none" stroke="currentColor" stroke-width="1.4" />
			</svg>
		{/if}

		{#if breakdown.length > 0}
			<table class="revenue-ledger__breakdown">
				<thead>
					<tr>
						<th scope="col">Channel</th>
						<th scope="col">Gross</th>
						<th scope="col">Fee</th>
						<th scope="col">Txns</th>
					</tr>
				</thead>
				<tbody>
					{#each breakdown as row (row.transactionType)}
						<tr>
							<td class="revenue-ledger__chan">{typeLabel(row.transactionType)}</td>
							<td>{centsToUsd(row.grossCents)}</td>
							<td>{centsToUsd(row.feesCents)}</td>
							<td>{row.count}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{/if}
</section>

<style>
	.revenue-ledger {
		position: relative;
		padding: clamp(1rem, 1.4vw + 0.5rem, 1.6rem);
		border-radius: 24px;
		border: 1px solid var(--vanguard-border, rgba(20, 184, 166, 0.18));
		background:
			linear-gradient(135deg, rgba(8, 17, 28, 0.78), rgba(2, 6, 12, 0.92));
		backdrop-filter: blur(var(--vanguard-blur, 24px));
		-webkit-backdrop-filter: blur(var(--vanguard-blur, 24px));
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.04) inset,
			0 18px 48px rgba(2, 6, 12, 0.4),
			0 0 0 1px rgba(20, 184, 166, 0.06);
		color: rgba(226, 232, 240, 0.92);
	}

	.revenue-ledger__head {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-bottom: 1.1rem;
	}

	.revenue-ledger__eyebrow {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(20, 184, 166, 0.7);
	}

	.revenue-ledger__title {
		margin: 0;
		font-size: clamp(1rem, 1.1vw + 0.5rem, 1.25rem);
		font-weight: 900;
		letter-spacing: 0.02em;
		color: #f8fafc;
	}

	.revenue-ledger__lede {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.45;
		color: rgba(148, 163, 184, 0.85);
		max-width: 56ch;
	}

	.revenue-ledger__status {
		margin: 0;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 11px;
		letter-spacing: 0.06em;
		color: rgba(148, 163, 184, 0.85);
	}

	.revenue-ledger__status--err {
		color: #fecaca;
	}

	.revenue-ledger__tiles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));
		gap: clamp(0.5rem, 1vw, 0.9rem);
		margin-bottom: 1rem;
	}

	.revenue-tile {
		display: flex;
		flex-direction: column;
		gap: 0.18rem;
		padding: 0.7rem 0.8rem;
		border-radius: 18px;
		border: 1px solid rgba(20, 184, 166, 0.1);
		background: rgba(1, 4, 9, 0.55);
	}

	.revenue-tile--savings {
		border-color: rgba(34, 197, 94, 0.32);
		background: linear-gradient(135deg, rgba(2, 44, 24, 0.55), rgba(1, 4, 9, 0.55));
	}

	.revenue-tile__label {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 9px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(148, 163, 184, 0.7);
	}

	.revenue-tile__value {
		font-size: clamp(1.05rem, 1.6vw + 0.4rem, 1.4rem);
		font-weight: 900;
		color: #f8fafc;
		letter-spacing: -0.01em;
	}

	.revenue-tile__hint {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		letter-spacing: 0.04em;
		color: rgba(148, 163, 184, 0.65);
	}

	.revenue-ledger__spark {
		display: block;
		width: 100%;
		height: 36px;
		color: rgba(20, 184, 166, 0.8);
		margin-bottom: 0.6rem;
	}

	.revenue-ledger__breakdown {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}

	.revenue-ledger__breakdown th,
	.revenue-ledger__breakdown td {
		padding: 0.42rem 0.6rem;
		text-align: right;
	}

	.revenue-ledger__breakdown th:first-child,
	.revenue-ledger__breakdown td:first-child {
		text-align: left;
	}

	.revenue-ledger__breakdown thead th {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 9px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 700;
		color: rgba(148, 163, 184, 0.65);
		border-bottom: 1px solid rgba(20, 184, 166, 0.1);
	}

	.revenue-ledger__breakdown tbody tr + tr td {
		border-top: 1px dashed rgba(148, 163, 184, 0.12);
	}

	.revenue-ledger__chan {
		font-weight: 700;
		color: rgba(226, 232, 240, 0.95);
	}
</style>
