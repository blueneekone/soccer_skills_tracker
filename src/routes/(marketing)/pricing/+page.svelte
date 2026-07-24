<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';



	// ── Tiers config ──────────────────────────────────────────────────────────
	type Tier = {
		id: string;
		name: string;
		seats: string;
		price: string;
		priceSub: string;
		accentColor: string;
		badge?: string;
		features: string[];
		cta: string;
		ctaHref: string;
		priceId: string;
	};

	const TIERS: Tier[] = [
		{
			id: 'solo-tutor',
			name: 'SOLO TUTOR',
			seats: '1-15 Seats',
			price: '$49',
			priceSub: '/ month',
			accentColor: '#8b5cf6',
			features: [
				'Drill logging focus',
				'Private session tracking',
				'Client progress portal'
			],
			cta: 'PROCEED TO CHECKOUT',
			ctaHref: '/setup?tier=tutor',
			priceId: import.meta.env.PUBLIC_STRIPE_PRICE_TUTOR || 'price_solo_tutor',
		},
		{
			id: 'single-team',
			name: 'SINGLE TEAM',
			seats: '15-25 Seats',
			price: '$99',
			priceSub: '/ month per team',
			accentColor: '#fbbf24',
			badge: 'POPULAR',
			features: [
				'Roster & match stats focus',
				'Tactical War Room',
				'XP & Vanguard Rating system',
				'Coach + parent portals'
			],
			cta: 'PROCEED TO CHECKOUT',
			ctaHref: '/setup?tier=team',
			priceId: import.meta.env.PUBLIC_STRIPE_PRICE_TEAM || 'price_single_team',
		},
		{
			id: 'pro-club',
			name: 'PRO CLUB',
			seats: '100+ Seats',
			price: '$299',
			priceSub: '/ month per club',
			accentColor: '#3b82f6',
			features: [
				'Director OS Panopticon',
				'Field scheduling ops',
				'Tryout lifecycle & Reg-lite',
				'Compliance & eligibility matrix'
			],
			cta: 'PROCEED TO CHECKOUT',
			ctaHref: '/setup?tier=club',
			priceId: import.meta.env.PUBLIC_STRIPE_PRICE_CLUB || 'price_pro_club',
		},
		{
			id: 'recruiter-portal',
			name: 'RECRUITER / SCOUT PORTAL',
			seats: 'B2B Access',
			price: '$199',
			priceSub: '/ month per seat',
			accentColor: '#10b981',
			features: [
				'Read-only B2B access',
				'Sanitized global talent index',
				'Advanced filtering & analytics',
				'Custom scouting reports'
			],
			cta: 'PROCEED TO CHECKOUT',
			ctaHref: '/setup?tier=recruiter',
			priceId: import.meta.env.PUBLIC_STRIPE_PRICE_RECRUITER || 'price_recruiter',
		}
	];

	// ── Checkout Logic ────────────────────────────────────────────────────────
	type CheckoutPhase = 'idle' | 'processing' | 'success' | 'error';
	let checkoutPhase = $state<CheckoutPhase>('idle');
	let checkoutTierId = $state<string | null>(null);
	let checkoutError = $state('');

	const isLoggedIn = $derived(browser && !authStore.isLoading && authStore.isAuthenticated);
	const tenantId = $derived(browser ? (authStore.tenantId ?? '') : '');

	async function handleSubscribe(tier: Tier): Promise<void> {
		if (!isLoggedIn) {
			window.location.href = tier.ctaHref;
			return;
		}

		checkoutPhase = 'processing';
		checkoutTierId = tier.id;
		checkoutError = '';

		try {
			const createStripeCheckoutSession = httpsCallable<
				{ priceId: string; tenantId: string; tierId: string },
				{ sessionUrl?: string; status: string }
			>(functions, 'createStripeCheckoutSession');

			const result = await createStripeCheckoutSession({
				priceId: tier.priceId,
				tenantId,
				tierId: tier.id,
			});

			if (result.data.sessionUrl) {
				window.location.href = result.data.sessionUrl;
			} else {
				checkoutPhase = 'success';
			}
		} catch (err: unknown) {
			checkoutError = err instanceof Error ? err.message : 'Checkout failed. Please try again.';
			checkoutPhase = 'error';
			checkoutTierId = null;
		}
	}
</script>

<svelte:head>
	<title>Live Licensing & Billing — SSTracker</title>
	<meta name="description" content="Secure your club's future with the $0 Platform Fee and our micro-percentage transaction model." />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#000000] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#14b8a6] tw-selection:text-[#000000] tw-pb-24">
	
	<!-- Header -->
	<header class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-6">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-[#14b8a6]">LIVE LICENSING & BILLING</span>
		<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight">
			Scale your academy with zero friction.
		</h1>
	</header>

	<!-- The PLG Hook (Brutalist Readout) -->
	<section class="tw-max-w-4xl tw-mx-auto tw-w-full tw-px-6 tw-mb-16">
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
			<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#1e293b] tw-pb-4 tw-mb-6">
				<span class="tw-font-mono tw-text-xs tw-text-[#f59e0b] tw-tracking-widest">SYS.PRICING_MODEL</span>
				<Icon name={"status.pulse" as IconName} size={20} class="tw-text-[#f59e0b]" />
			</div>
			<h3 class="tw-text-3xl tw-font-bold tw-text-[#f8fafc] tw-mb-4">The $0 Platform Fee.</h3>
			<p class="tw-text-[#94a3b8] tw-text-base tw-leading-relaxed">
				The core Nexus Command platform is $0 to deploy. We monetize purely via a brutalist, micro-percentage transaction model handled securely through Stripe Connect. 
				This eliminates off-season financial friction — you only pay a fraction when your athletes pay you.
			</p>
		</div>
	</section>

	<!-- Competitor Comparison Table -->
	<section class="tw-max-w-4xl tw-mx-auto tw-w-full tw-px-6 tw-mb-24">
		<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-overflow-x-auto">
			<table class="tw-w-full tw-text-left tw-border-collapse">
				<thead>
					<tr class="tw-border-b tw-border-[#1e293b]">
						<th class="tw-py-4 tw-px-6 tw-font-mono tw-text-xs tw-font-bold tw-text-[#64748b] tw-tracking-widest tw-uppercase">Metric</th>
						<th class="tw-py-4 tw-px-6 tw-font-mono tw-text-xs tw-font-bold tw-text-[#ef4444] tw-tracking-widest tw-uppercase">Legacy Competitors</th>
						<th class="tw-py-4 tw-px-6 tw-font-mono tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-tracking-widest tw-uppercase">SSTracker</th>
					</tr>
				</thead>
				<tbody class="tw-text-sm tw-text-[#cbd5e1]">
					<tr class="tw-border-b tw-border-[#1e293b]/50">
						<td class="tw-py-4 tw-px-6 tw-font-mono">Platform Fee</td>
						<td class="tw-py-4 tw-px-6">$1,000 - $3,000 / year</td>
						<td class="tw-py-4 tw-px-6 tw-text-[#14b8a6] tw-font-bold">$0 Flat</td>
					</tr>
					<tr class="tw-border-b tw-border-[#1e293b]/50">
						<td class="tw-py-4 tw-px-6 tw-font-mono">Processing Rate</td>
						<td class="tw-py-4 tw-px-6">3.5% + $1.50 per tx</td>
						<td class="tw-py-4 tw-px-6 tw-text-[#14b8a6] tw-font-bold">2.9% + 30¢ (Stripe Direct)</td>
					</tr>
					<tr class="tw-border-b tw-border-[#1e293b]/50">
						<td class="tw-py-4 tw-px-6 tw-font-mono">Hidden Payout Fees</td>
						<td class="tw-py-4 tw-px-6">0.5% withdrawal fee</td>
						<td class="tw-py-4 tw-px-6 tw-text-[#14b8a6] tw-font-bold">None</td>
					</tr>
					<tr>
						<td class="tw-py-4 tw-px-6 tw-font-mono">Off-Season Cost</td>
						<td class="tw-py-4 tw-px-6">Still pay monthly subscription</td>
						<td class="tw-py-4 tw-px-6 tw-text-[#14b8a6] tw-font-bold">Pay $0 when you aren't charging</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- Tiered Matrix (4-Column) -->
	<section class="tw-max-w-[1400px] tw-mx-auto tw-w-full tw-px-6 tw-mb-24">
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-6">
			{#each TIERS as tier}
				<article class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] hover:tw-border-[var(--accent)] tw-transition-all tw-duration-150 tw-relative tw-p-8 tw-flex tw-flex-col tw-rounded-sm" style:--accent={tier.accentColor}>
					
					{#if tier.badge}
						<div class="tw-absolute -tw-top-3 tw-left-1/2 -tw-translate-x-1/2 tw-bg-[#0B0F19] tw-border tw-border-[var(--accent)] tw-text-[var(--accent)] tw-text-[10px] tw-font-mono tw-font-bold tw-tracking-widest tw-uppercase tw-px-3 tw-py-1 tw-rounded-full">
							{tier.badge}
						</div>
					{/if}

					<div class="tw-mb-8">
						<h2 class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.2em] tw-text-[var(--accent)] tw-mb-2">{tier.name}</h2>
						<div class="tw-text-[#64748b] tw-text-sm tw-font-mono tw-mb-4">{tier.seats}</div>
						<div class="tw-flex tw-items-baseline tw-gap-2">
							<span class="tw-text-4xl tw-font-bold tw-text-white">{tier.price}</span>
							<span class="tw-text-xs tw-font-mono tw-text-[#64748b]">{tier.priceSub}</span>
						</div>
					</div>

					<ul class="tw-flex tw-flex-col tw-gap-4 tw-mb-8 tw-flex-1">
						{#each tier.features as feature}
							<li class="tw-flex tw-items-start tw-gap-3">
								<Icon name={"action.check" as IconName} size={16} class="tw-text-[var(--accent)] tw-shrink-0 tw-mt-0.5" />
								<span class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed">{feature}</span>
							</li>
						{/each}
					</ul>

					{#if checkoutPhase === 'success' && checkoutTierId === tier.id}
						<div class="tw-w-full tw-py-3 tw-text-center tw-bg-green-500/10 tw-border tw-border-green-500/30 tw-text-green-400 tw-font-mono tw-text-xs tw-font-bold tw-tracking-widest tw-rounded-sm">
							ACTIVATED
						</div>
					{:else}
						<button
							onclick={() => handleSubscribe(tier)}
							disabled={checkoutPhase === 'processing' && checkoutTierId === tier.id}
							class="tw-w-full tw-py-4 tw-text-center tw-bg-[#000000] tw-border tw-border-[#1e293b] hover:tw-bg-[var(--accent)] hover:tw-text-[#000000] tw-text-[var(--accent)] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.1em] tw-transition-colors tw-duration-150 tw-rounded-sm disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
						>
							{#if checkoutPhase === 'processing' && checkoutTierId === tier.id}
								PROCESSING...
							{:else}
								{tier.cta}
							{/if}
						</button>
					{/if}

					{#if checkoutPhase === 'error' && checkoutTierId === tier.id}
						<div class="tw-mt-3 tw-text-center tw-text-[#ef4444] tw-text-xs tw-font-mono">{checkoutError}</div>
					{/if}

				</article>
			{/each}
		</div>
	</section>

	<!-- Migration Concierge -->
	<section class="tw-max-w-4xl tw-mx-auto tw-w-full tw-px-6 tw-mb-24">
		<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-8 tw-flex tw-flex-col md:tw-flex-row tw-gap-8 tw-items-center">
			<div class="tw-shrink-0 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 tw-rounded-full">
				<Icon name={"user.settings" as IconName} size={32} class="tw-text-[#14b8a6]" />
			</div>
			<div class="tw-flex-1">
				<h3 class="tw-text-xl tw-font-bold tw-text-[#f8fafc] tw-mb-2">White-Glove Migration Concierge</h3>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-4">
					Switching platforms shouldn't mean losing years of historical data. Our elite onboarding team will manually map and migrate your legacy athlete data.
				</p>
				<div class="tw-inline-flex tw-items-center tw-gap-2 tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-px-3 tw-py-1.5 tw-rounded-sm">
					<Icon name={"action.upload" as IconName} size={16} class="tw-text-[#14b8a6]" />
					<span class="tw-font-mono tw-text-xs tw-text-[#cbd5e1] tw-tracking-widest">Powered by Automated CSV Vampire Importer</span>
				</div>
			</div>
		</div>
	</section>

	<!-- Single B2C Upsell / CTA (Replaced old CTA to ensure only ONE Action Gold button exists) -->
	<section class="tw-max-w-4xl tw-mx-auto tw-w-full tw-px-6 tw-flex tw-justify-center">
		<a href="/login" class="tw-bg-[#fbbf24] tw-text-[#0f172a] hover:tw-bg-[#f59e0b] tw-px-10 tw-py-4 tw-font-mono tw-font-bold tw-text-sm tw-uppercase tw-tracking-widest tw-transition-all tw-duration-150 tw-inline-block tw-text-center tw-rounded-sm active:tw-scale-[0.98]">
			Deploy Your Club
		</a>
	</section>

</div>