<script lang="ts">
	/**
	 * Pricing page — SSTracker (pre-commercial)
	 * Illustrative tiers — production billing not sign-off yet (see TRACTION.md).
	 * Stripe stub checkout for QA only.
	 */
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';

	// ── Tiers config ──────────────────────────────────────────────────────────

	type Tier = {
		id: string;
		name: string;
		tagline: string;
		price: string;
		priceSub: string;
		accentColor: string;
		badge?: string;
		features: { label: string; highlight?: boolean }[];
		cta: string;
		ctaHref: string;
		priceId: string;
	};

	const TIERS: Tier[] = [
		{
			id: 'basecamp',
			name: 'BASE CAMP',
			tagline: 'For small clubs and individual teams getting started.',
			price: '$99',
			priceSub: '/ month per team',
			accentColor: '#8b5cf6',
			features: [
				{ label: 'Up to 30 players' },
				{ label: 'Tactical War Room' },
				{ label: 'XP & Vanguard Rating system' },
				{ label: 'Roster ingestion (CSV / JSON)' },
				{ label: 'Coach + parent portals' },
				{ label: 'COPPA compliance gate' },
				{ label: 'Community support' },
			],
			cta: 'START FREE TRIAL',
			ctaHref: '/setup?tier=basecamp',
			priceId: 'price_basecamp',
		},
		{
			id: 'pro',
			name: 'CLUB PRO',
			tagline: 'Full clubs — development OS + director ops (illustrative tier).',
			price: '$299',
			priceSub: '/ month per club · not billed in prod yet',
			accentColor: '#fbbf24',
			badge: 'TARGET TIER',
			features: [
				{ label: 'Unlimited players (when billing live)', highlight: true },
				{ label: 'Everything in Base Camp' },
				{ label: 'Tryout lifecycle OS + registration-lite' },
				{ label: 'Field weather lock (Open-Meteo + NWS)' },
				{ label: 'Media pipeline stub (EXIF strip + quarantine path)', highlight: true },
				{ label: 'Director compliance + eligibility matrix' },
				{ label: 'Parent push + calendar parity' },
				{ label: 'QA support — no production SLA yet' },
			],
			cta: 'JOIN QA WAITLIST',
			ctaHref: '/setup?tier=pro',
			priceId: 'price_vanguard_pro',
		},
		{
			id: 'enterprise',
			name: 'ENTERPRISE',
			tagline: 'Multi-club orgs and federation-scale tenants (custom).',
			price: 'Custom',
			priceSub: 'contact for pricing',
			accentColor: '#334155',
			features: [
				{ label: 'Multi-club tenant isolation', highlight: true },
				{ label: 'Everything in Club Pro' },
				{ label: 'Cell routing + dedicated shard path' },
				{ label: 'Federation CSV export (API Phases 2–4 roadmap)' },
				{ label: 'Custom domain + white-labelling (planned)' },
				{ label: 'No uptime SLA until commercial launch' },
				{ label: 'Dedicated success engineer (post-close)' },
				{ label: 'Security review pack on request' },
			],
			cta: 'CONTACT ACQUISITION',
			ctaHref: 'mailto:acquisition@sstracker.com',
			priceId: 'price_enterprise',
		},
	];

	// ── Mock checkout ─────────────────────────────────────────────────────────

	type CheckoutPhase = 'idle' | 'processing' | 'success' | 'error';

	let checkoutPhase = $state<CheckoutPhase>('idle');
	let checkoutTierId = $state<string | null>(null);
	let checkoutError = $state('');

	const isLoggedIn = $derived(browser && !authStore.isLoading && authStore.isAuthenticated);
	const tenantId = $derived(browser ? (authStore.tenantId ?? '') : '');

	async function handleSubscribe(tier: Tier): Promise<void> {
		if (!isLoggedIn) {
			// Redirect to setup with tier pre-selected
			window.location.href = tier.ctaHref;
			return;
		}
		if (tier.id === 'enterprise') {
			window.location.href = tier.ctaHref;
			return;
		}

		checkoutPhase = 'processing';
		checkoutTierId = tier.id;
		checkoutError = '';

		try {
			// STRIPE STUB — calls Cloud Function which sets subscriptionStatus: 'active'
			// and stores the priceId against the tenant's Firestore document.
			// Replace the CF stub with real Stripe Checkout session creation
			// when going live: create a Stripe Checkout Session → redirect to Stripe.
		const createSubscription = httpsCallable<
			{ priceId: string; tenantId: string; tierId: string },
			{ sessionUrl?: string; status: string }
		>(functions, 'createSubscription');

			const result = await createSubscription({
				priceId: tier.priceId,
				tenantId,
				tierId: tier.id,
			});

			if (result.data.sessionUrl) {
				// Production: redirect to Stripe Checkout
				window.location.href = result.data.sessionUrl;
			} else {
				// Stub success — subscription activated in Firestore
				checkoutPhase = 'success';
			}
		} catch (err: unknown) {
			checkoutError = err instanceof Error ? err.message : 'Checkout failed. Please try again.';
			checkoutPhase = 'error';
			checkoutTierId = null;
		}
	}

	// ── Scroll reveal ─────────────────────────────────────────────────────────

	function reveal(node: Element, { delay = 0 }: { delay?: number } = {}) {
		if (!browser) return;
		(node as HTMLElement).style.transitionDelay = `${delay}ms`;
		const obs = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) { node.classList.add('is-revealed'); obs.disconnect(); }
			},
			{ threshold: 0.1 },
		);
		obs.observe(node);
		return { destroy: () => obs.disconnect() };
	}
</script>

<svelte:head>
	<title>Pricing — SSTracker (pre-commercial)</title>
	<meta name="description" content="Illustrative SSTracker pricing tiers. Production billing and paid pilots are not live yet — see acquisition brief for stage." />
</svelte:head>

<div class="pricing-root">
	<div class="pricing-banner" role="status">
		<strong>Pre-commercial.</strong> Tiers below are illustrative — no production billing path sign-off yet ($0 ARR documented).
		Registration and Stripe callables exist for QA on dev only.
	</div>

	<!-- ── Header ────────────────────────────────────────────────────────────── -->
	<header class="pricing-header" use:reveal>
		<span class="pricing-eyebrow">ILLUSTRATIVE PRICING</span>
		<h1 class="pricing-h1">Transaction-aligned club pricing (target).</h1>
		<p class="pricing-sub">
			$0 platform fee target · fractional fee on registration payments when billing goes live.
			QA clubs use dev tenant provisioning — not self-serve paid checkout yet.
		</p>
	</header>

	<!-- ── Tier cards ────────────────────────────────────────────────────────── -->
	<div class="pricing-grid">
		{#each TIERS as tier, i}
			<article
				class="tier-card"
				class:tier-card--featured={tier.badge != null}
				use:reveal={{ delay: i * 90 }}
				aria-labelledby="tier-{tier.id}-name"
				style:--accent={tier.accentColor}
			>
				{#if tier.badge}
					<div class="tier-card__badge" aria-label={tier.badge}>{tier.badge}</div>
				{/if}

				<div class="tier-card__header">
					<h2 class="tier-card__name" id="tier-{tier.id}-name">{tier.name}</h2>
					<p class="tier-card__tagline">{tier.tagline}</p>
				</div>

				<div class="tier-card__price">
					<span class="tier-card__price-val">{tier.price}</span>
					<span class="tier-card__price-sub">{tier.priceSub}</span>
				</div>

				<ul class="tier-card__features" aria-label="Features included in {tier.name}">
					{#each tier.features as feat}
						<li class="tier-card__feat" class:tier-card__feat--highlight={feat.highlight}>
							<span class="tier-card__feat-check" aria-hidden="true">✓</span>
							{feat.label}
						</li>
					{/each}
				</ul>

				<!-- ── Subscribe button ────────────────────────────────────────── -->
				{#if checkoutPhase === 'success' && checkoutTierId === tier.id}
					<div class="tier-card__success" role="status" aria-live="polite">
						<span aria-hidden="true">✓</span> SUBSCRIPTION ACTIVATED
					</div>
				{:else}
					<button
						class="tier-card__cta"
						onclick={() => handleSubscribe(tier)}
						disabled={checkoutPhase === 'processing' && checkoutTierId === tier.id}
						aria-label="Subscribe to {tier.name}"
					>
						{#if checkoutPhase === 'processing' && checkoutTierId === tier.id}
							<span class="tier-cta-dots">
								<span></span><span></span><span></span>
							</span>
						{:else}
							{tier.cta}
						{/if}
					</button>
				{/if}

				{#if checkoutPhase === 'error' && checkoutTierId === tier.id}
					<p class="tier-card__error" role="alert">{checkoutError}</p>
				{/if}
			</article>
		{/each}
	</div>

	<!-- ── FAQ strip ─────────────────────────────────────────────────────────── -->
	<section class="faq" aria-labelledby="faq-heading" use:reveal>
		<h2 class="faq__heading" id="faq-heading">Common questions.</h2>
		<div class="faq__grid">
			{#each [
				{ q: 'Can I switch plans later?', a: 'Yes. Upgrade or downgrade at any time. Prorated billing is applied automatically.' },
				{ q: 'Is billing live?', a: 'No. Stripe registration and stub subscription callables exist for QA on sports-skill-tracker-dev. Paid pilots are post-owner QA.' },
				{ q: 'Is COPPA compliance automatic?', a: 'Yes. The parental consent gate, PII burn protocol, and SafeSport messaging rules activate on your account automatically for any athlete under 13.' },
				{ q: 'Strategic acquisition?', a: 'See /acquisition for PDF briefs and data room paths. acquisition@sstracker.com for diligence.' },
			] as item}
				<div class="faq__item">
					<h3 class="faq__q">{item.q}</h3>
					<p class="faq__a">{item.a}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- ── Final CTA strip ───────────────────────────────────────────────────── -->
	<div class="pricing-cta-strip" use:reveal>
		<p class="pricing-cta-strip__text">
			Not sure which tier is right for your club?
		</p>
		<a href="/acquisition" class="pricing-cta-strip__link">
			Acquisition brief + PDFs → /acquisition
		</a>
	</div>
</div>

<style>
	:global(.is-revealed) { opacity: 1 !important; transform: none !important; }

	/* ── Root ────────────────────────────────────────────────────────────────── */
	.pricing-root {
		padding: 8rem 1.5rem 4rem;
		max-width: 1180px;
		margin: 0 auto;
		font-family: 'Geist Mono', ui-monospace, monospace;
	}

	.pricing-banner {
		margin-bottom: 2rem;
		padding: 0.85rem 1rem;
		border: 1px solid rgb(251 191 36 / 0.35);
		border-radius: 6px;
		background: rgb(251 191 36 / 0.06);
		font-size: 0.62rem;
		line-height: 1.65;
		color: rgb(226 232 240 / 0.85);
	}

	.pricing-banner strong {
		color: #fbbf24;
		letter-spacing: 0.06em;
	}

	/* ── Header ──────────────────────────────────────────────────────────────── */
	.pricing-header {
		text-align: center;
		margin-bottom: 4rem;
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 0.7s, transform 0.7s;
	}
	.pricing-eyebrow {
		display: inline-block;
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: rgba(251, 191, 36, 0.65);
		margin-bottom: 1rem;
	}
	.pricing-h1 {
		font-size: clamp(1.8rem, 4.5vw, 3rem);
		font-weight: 900;
		color: white;
		margin: 0 0 0.85rem;
		line-height: 1.1;
	}
	.pricing-sub {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.35);
		margin: 0;
	}

	/* ── Tier grid ───────────────────────────────────────────────────────────── */
	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		align-items: stretch;
		margin-bottom: 5rem;
	}

	/* Tier card */
	.tier-card {
		position: relative;
		opacity: 0;
		transform: translateY(24px);
		transition: opacity 0.65s ease, transform 0.65s ease, border-color 0.25s, box-shadow 0.25s;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.025);
		backdrop-filter: blur(14px);
		padding: 2rem 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.tier-card--featured {
		border-color: rgba(251, 191, 36, 0.35);
		background: rgba(251, 191, 36, 0.04);
		box-shadow: 0 0 48px rgba(251, 191, 36, 0.12);
	}
	.tier-card:hover:not(.tier-card--featured) {
		border-color: color-mix(in srgb, var(--accent) 30%, transparent);
	}
	.tier-card--featured:hover {
		box-shadow: 0 0 72px rgba(251, 191, 36, 0.22);
	}

	/* Badge */
	.tier-card__badge {
		position: absolute;
		top: -12px;
		left: 50%;
		transform: translateX(-50%);
		padding: 3px 14px;
		border-radius: 20px;
		background: rgba(251, 191, 36, 0.12);
		border: 1px solid rgba(251, 191, 36, 0.45);
		font-size: 0.45rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		color: #fbbf24;
		white-space: nowrap;
	}

	/* Header */
	.tier-card__header { display: flex; flex-direction: column; gap: 0.35rem; }
	.tier-card__name {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		color: color-mix(in srgb, var(--accent) 80%, white);
	}
	.tier-card__tagline {
		margin: 0;
		font-size: 0.58rem;
		color: rgba(255, 255, 255, 0.35);
		line-height: 1.6;
	}

	/* Price */
	.tier-card__price {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		padding: 0.85rem 0;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.tier-card__price-val {
		font-size: 2.5rem;
		font-weight: 900;
		color: white;
		line-height: 1;
	}
	.tier-card__price-sub {
		font-size: 0.55rem;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.06em;
	}

	/* Features list */
	.tier-card__features {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}
	.tier-card__feat {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.58rem;
		color: rgba(255, 255, 255, 0.45);
		line-height: 1.4;
	}
	.tier-card__feat--highlight { color: rgba(255, 255, 255, 0.75); font-weight: 600; }
	.tier-card__feat-check {
		color: color-mix(in srgb, var(--accent) 70%, white);
		font-size: 0.6rem;
		flex-shrink: 0;
		margin-top: 1px;
	}

	/* CTA button */
	.tier-card__cta {
		width: 100%;
		padding: 0.8rem;
		border-radius: 9px;
		border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
		background: color-mix(in srgb, var(--accent) 8%, transparent);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: var(--accent);
		cursor: pointer;
		min-height: 48px;
		transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
	}
	.tier-card__cta:hover:not(:disabled) {
		background: color-mix(in srgb, var(--accent) 16%, transparent);
		box-shadow: 0 0 24px color-mix(in srgb, var(--accent) 25%, transparent);
		transform: translateY(-2px);
	}
	.tier-card__cta:disabled { opacity: 0.6; cursor: not-allowed; }

	/* Loading dots */
	.tier-cta-dots { display: flex; gap: 4px; justify-content: center; }
	.tier-cta-dots span {
		width: 5px; height: 5px; border-radius: 50%;
		background: currentColor;
		animation: tier-dot 1.2s ease-in-out infinite;
	}
	.tier-cta-dots span:nth-child(2) { animation-delay: 0.2s; }
	.tier-cta-dots span:nth-child(3) { animation-delay: 0.4s; }

	.tier-card__success {
		padding: 0.7rem;
		border-radius: 8px;
		border: 1px solid rgba(34, 197, 94, 0.3);
		background: rgba(34, 197, 94, 0.06);
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #22c55e;
		text-align: center;
	}
	.tier-card__error {
		margin: 0;
		font-size: 0.52rem;
		color: #ff6070;
		text-align: center;
	}

	/* ── FAQ ─────────────────────────────────────────────────────────────────── */
	.faq {
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		padding: 3.5rem 0;
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 0.7s ease, transform 0.7s ease;
		margin-bottom: 3rem;
	}
	.faq__heading {
		font-size: clamp(1.2rem, 3vw, 1.8rem);
		font-weight: 900;
		color: white;
		margin: 0 0 2rem;
	}
	.faq__grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
	}
	.faq__item { display: flex; flex-direction: column; gap: 0.4rem; }
	.faq__q {
		font-size: 0.68rem;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
	}
	.faq__a {
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.33);
		margin: 0;
		line-height: 1.7;
	}

	/* ── CTA strip ───────────────────────────────────────────────────────────── */
	.pricing-cta-strip {
		text-align: center;
		opacity: 0;
		transform: translateY(16px);
		transition: opacity 0.7s ease, transform 0.7s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding-bottom: 2rem;
	}
	.pricing-cta-strip__text {
		margin: 0;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.3);
	}
	.pricing-cta-strip__link {
		font-size: 0.6rem;
		font-weight: 700;
		color: rgba(20, 184, 166, 0.6);
		text-decoration: none;
		letter-spacing: 0.06em;
		transition: color 0.15s;
	}
	.pricing-cta-strip__link:hover { color: #fbbf24; }

	/* ── Keyframes ───────────────────────────────────────────────────────────── */
	@keyframes tier-dot {
		0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
		40% { transform: scale(1); opacity: 1; }
	}

	/* ── Responsive ─────────────────────────────────────────────────────────── */
	@media (max-width: 900px) {
		.pricing-grid { grid-template-columns: 1fr; max-width: 480px; margin-left: auto; margin-right: auto; }
		.faq__grid { grid-template-columns: 1fr; }
	}
</style>
