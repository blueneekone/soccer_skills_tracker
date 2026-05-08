<script>
	import '$lib/styles/director-os.css';
	import PricingTable from '$lib/components/pricing/PricingTable.svelte';
	import { page } from '$app/state';

	const checkoutHint = $derived(page.url.searchParams.get('checkout'));
</script>

<svelte:head>
	<title>Pricing — SSTRACKER</title>
</svelte:head>

<div class="pricing-page">
	<header class="pricing-hero glass-panel">
		<h1 class="pricing-hero-title">Choose your organization tier</h1>
		<p class="pricing-hero-lead">
			Secure Stripe checkout. Your club’s subscription unlocks the full platform for coaches,
			players, and staff under one license pool.
		</p>
		{#if checkoutHint === 'success'}
			<p class="pricing-banner pricing-banner--ok" role="status">
				Checkout completed — your license will update in a few seconds. You can refresh if the
				dashboard doesn’t unlock immediately.
			</p>
		{:else if checkoutHint === 'cancel'}
			<p class="pricing-banner" role="status">Checkout canceled — no charges were made.</p>
		{/if}
	</header>

	<PricingTable />
</div>

<style>
	.pricing-page {
		display: flex;
		flex-direction: column;
		gap: clamp(20px, 3vw, 32px);
		padding-bottom: clamp(32px, 6vw, 72px);
	}

	.pricing-hero {
		padding: clamp(20px, 3vw, 32px);
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
</style>
