<script>
	import '$lib/styles/director-os.css';
	import PricingTable from '$lib/components/pricing/PricingTable.svelte';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';

	const checkoutHint = $derived(page.url.searchParams.get('checkout'));

	// Phase 2, Epic 2 — Session N.  Clubs already on the transaction-billing
	// model don't need to "upgrade" — they're on the live model and pay via
	// the ledger, not via a subscription.  Recruiters with an active hybrid
	// account see a "manage subscription" cue instead of a fresh pricing
	// table.  Everyone else sees the public PricingTable.
	const isTransactionBilled = $derived(licenseEntitlementStore.isTransactionBilled);
	const isRecruiter = $derived(authStore.role === 'recruiter');
</script>

<svelte:head>
	<title>Pricing — SSTRACKER</title>
</svelte:head>

<div class="pricing-page">
	<header class="pricing-hero glass-panel">
		<h1 class="pricing-hero-title">
			{#if isTransactionBilled}You're on the new pricing model.{:else}Vanguard pricing{/if}
		</h1>
		<p class="pricing-hero-lead">
			{#if isTransactionBilled}
				Your organization runs on transaction-based pricing — there's nothing to
				upgrade.  Open the Director OS Revenue Ledger to see fees as they're
				collected.
			{:else}
				Zero platform fees to start.  Money only flows to Vanguard when it flows
				through Vanguard — registrations, tickets, tournament events, and
				partner rebates.
			{/if}
		</p>
		{#if checkoutHint === 'success'}
			<p class="pricing-banner pricing-banner--ok" role="status">
				Checkout completed — your access will activate in a few seconds.
			</p>
		{:else if checkoutHint === 'cancel'}
			<p class="pricing-banner" role="status">Checkout canceled — no charges were made.</p>
		{/if}
	</header>

	{#if isTransactionBilled && !isRecruiter}
		<section class="upgrade-info glass-panel">
			<h2 class="upgrade-info-title">Manage your billing</h2>
			<p class="upgrade-info-body">
				Need Stripe Connect re-onboarding, a custom rate-card carve-out, or to
				review the platform fee ledger?  Open the Director OS Command Center —
				the Revenue Ledger module shows your YTD volume, fees paid, and the
				comparison vs the legacy seat plan.
			</p>
			<a class="upgrade-info-link" href="/director">Open Director OS →</a>
		</section>
	{:else}
		<PricingTable />
	{/if}
</div>

<style>
	.pricing-page {
		display: flex;
		flex-direction: column;
		gap: var(--bento-gap-lg);
		padding-bottom: var(--bento-gap-lg);
	}

	.pricing-hero {
		padding: var(--bento-pad);
		border-radius: 24px;
	}

	.pricing-hero-title {
		margin: 0 0 0.5rem;
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 900;
		letter-spacing: -0.02em;
	}

	.pricing-hero-lead {
		margin: 0;
		max-width: 52rem;
		line-height: 1.45;
		color: var(--muted-slate);
		font-size: 0.98rem;
	}

	.pricing-banner {
		margin: 1rem 0 0;
		padding: 0.65rem 0.85rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--muted-slate) 12%, transparent);
		border: 1px solid var(--glass-border);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.pricing-banner--ok {
		background: color-mix(in srgb, #22c55e 14%, transparent);
		border-color: color-mix(in srgb, #22c55e 35%, transparent);
	}

	.upgrade-info {
		padding: clamp(1rem, 1.6vw, 1.4rem);
		border-radius: 24px;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.upgrade-info-title {
		margin: 0;
		font-size: clamp(1.1rem, 1.4vw + 0.5rem, 1.35rem);
		font-weight: 900;
		letter-spacing: -0.01em;
	}

	.upgrade-info-body {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--muted-slate, rgba(148, 163, 184, 0.85));
		max-width: 64ch;
	}

	.upgrade-info-link {
		align-self: flex-start;
		font-weight: 800;
		color: var(--brand-primary, #14b8a6);
		text-decoration: none;
		padding: 0.4rem 0;
	}

	.upgrade-info-link:hover {
		text-decoration: underline;
	}
</style>
