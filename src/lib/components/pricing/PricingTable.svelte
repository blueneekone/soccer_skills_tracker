<script>
	import { onMount } from 'svelte';
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { pricingPolicyStore } from '$lib/services/pricingEngine.svelte.ts';
	import { bpToPercentLabel, centsToUsd } from '$lib/types/pricing';

	/**
	 * Phase 2, Epic 2 — Session N rewrite.
	 * Two-card Bento:
	 *   1. Clubs / NGBs — transaction-based ($0 to start; rateBp × volume)
	 *   2. Recruiters   — hybrid (annual access + per-export flat fee)
	 * The legacy four-tier seat checkout has been retired.  Clubs onboard by
	 * connecting Stripe (Connect destination charges) — no SaaS sub.
	 */

	const createStripeCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');

	let recruiterBusy = $state(false);
	let errorMsg = $state('');

	const role = $derived(authStore.role);
	const isRecruiter = $derived(role === 'recruiter');
	const callerEmail = $derived(
		typeof authStore.userProfile?.email === 'string' ?
			authStore.userProfile.email.toLowerCase() :
			'',
	);

	onMount(() => {
		pricingPolicyStore.ensureSubscribed();
	});

	const policy = $derived(pricingPolicyStore.policy);
	const seasonRateBp = $derived(policy.rateCard.season_registration?.rateBp ?? null);
	const ticketRateBp = $derived(policy.rateCard.digital_ticketing?.rateBp ?? null);
	const exportFlatCents = $derived(policy.rateCard.recruiter_lead_export?.flatFeeCents ?? null);
	const annualCents = $derived(policy.recruiterAnnualCents ?? null);

	const rateLine = $derived.by(() => {
		if (seasonRateBp === null) return 'Rate publishes shortly';
		return `${bpToPercentLabel(seasonRateBp)} of every registration`;
	});

	async function recruiterCheckout() {
		errorMsg = '';
		if (!callerEmail) {
			errorMsg = 'Sign in with your recruiting email before checkout.';
			return;
		}
		recruiterBusy = true;
		const origin = typeof window !== 'undefined' ? window.location.origin : '';
		try {
			const res = await createStripeCheckoutSession({
				tierType: 'recruiter',
				successUrl: `${origin}/pricing?checkout=success`,
				cancelUrl: `${origin}/pricing?checkout=cancel`,
			});
			const url = res.data && typeof res.data.url === 'string' ? res.data.url : '';
			if (url) {
				window.location.assign(url);
			} else {
				errorMsg = 'Checkout did not return a URL. Try again or contact support.';
			}
		} catch (e) {
			const err = /** @type {{ message?: string }} */ (e);
			errorMsg = err.message || 'Checkout failed.';
		} finally {
			recruiterBusy = false;
		}
	}
</script>

<div class="pricing-bento" aria-label="Vanguard pricing">
	{#if errorMsg}
		<p class="pricing-error" role="alert">{errorMsg}</p>
	{/if}

	<!-- Clubs / NGBs — transaction-based -->
	<article class="glass-panel pricing-card pricing-card--featured">
		<span class="pricing-badge">Now live</span>
		<p class="pricing-kicker">Clubs · NGBs · Tournaments</p>
		<h2 class="pricing-title">Transaction-based pricing</h2>
		<p class="pricing-desc">
			Zero platform fee to start. Pay a tiny percentage only when money moves
			through Vanguard — registrations, tickets, and tournament events.
		</p>

		<ul class="pricing-features">
			<li>
				<strong>$0</strong> to onboard — no seat caps, no SaaS subscription.
			</li>
			<li>
				<strong>{rateLine}</strong> sent to your Stripe-Connect account.
			</li>
			{#if ticketRateBp !== null}
				<li>
					Digital ticketing at <strong>{bpToPercentLabel(ticketRateBp)}</strong> per ticket sold.
				</li>
			{/if}
			<li>Real-time fee ledger inside the Director OS.</li>
			<li>Hotel block rebates routed back to your NGB.</li>
		</ul>

		<a class="btn-pricing btn-pricing--primary" href="/setup">
			Get started — connect Stripe
		</a>

		<p class="pricing-footnote">
			Already on the legacy seat plan?  Your subscription will cancel at period
			end automatically; access continues with no action needed.
		</p>
	</article>

	<!-- Recruiters — hybrid annual + per-export -->
	<article class="glass-panel pricing-card">
		<p class="pricing-kicker">Recruiters</p>
		<h2 class="pricing-title">Annual access + per-export</h2>
		<p class="pricing-desc">
			Search the verified Vanguard talent graph.  Annual access keeps the door
			open; you only pay per export when you actually pull contact data.
		</p>

		<ul class="pricing-features">
			<li>
				<strong>{annualCents !== null ? centsToUsd(annualCents) : 'Price set at checkout'}</strong>
				/ year — unlimited search.
			</li>
			<li>
				<strong>{exportFlatCents !== null ? centsToUsd(exportFlatCents) : 'Per-export fee TBA'}</strong>
				per lead export, billed on your invoice.
			</li>
			<li>
				<strong>Required:</strong> Vanguard Clearance — background check via
				Checkr before search access unlocks. See
				<a href="/clearance-policy">why we require this</a>.
			</li>
			<li>Searchable verified analytics across every linked club.</li>
		</ul>

		{#if isRecruiter}
			<button
				type="button"
				class="btn-pricing"
				disabled={recruiterBusy}
				onclick={recruiterCheckout}
			>
				{recruiterBusy ? 'Opening…' : 'Start recruiter access'}
			</button>
		{:else}
			<a class="btn-pricing" href="/signup?role=recruiter">
				Apply for recruiter access
			</a>
		{/if}
	</article>
</div>

<style>
	.pricing-bento {
		display: grid;
		grid-template-columns: 1fr;
		gap: clamp(1rem, 2vw, 1.6rem);
		align-items: stretch;
	}

	@media (min-width: 52rem) {
		.pricing-bento {
			grid-template-columns: 1.4fr 1fr;
		}
	}

	.pricing-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: clamp(1.1rem, 1.8vw, 1.6rem);
		border-radius: 24px;
		min-height: 100%;
		backdrop-filter: blur(var(--vanguard-blur, 24px));
		-webkit-backdrop-filter: blur(var(--vanguard-blur, 24px));
	}

	.pricing-card--featured {
		border: 1px solid color-mix(in srgb, var(--brand-primary, #00f0ff) 45%, var(--glass-border, rgba(0,240,255,0.18)));
		background: linear-gradient(
			155deg,
			color-mix(in srgb, var(--brand-primary, #00f0ff) 12%, var(--glass-bg, rgba(2,6,12,0.55))),
			var(--glass-bg, rgba(2,6,12,0.55))
		);
		box-shadow: var(--shadow-liquid, 0 18px 48px rgba(2, 6, 12, 0.4));
	}

	.pricing-badge {
		position: absolute;
		top: 14px;
		right: 14px;
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.35rem 0.6rem;
		border-radius: 999px;
		background: linear-gradient(135deg, var(--brand-primary, #00f0ff), var(--brand-accent, #8b5cf6));
		color: #021018;
	}

	.pricing-kicker {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted-slate, rgba(148, 163, 184, 0.85));
	}

	.pricing-title {
		margin: 0;
		font-size: clamp(1.2rem, 1.4vw + 0.6rem, 1.6rem);
		font-weight: 900;
		color: var(--text-primary, #f8fafc);
		letter-spacing: -0.01em;
	}

	.pricing-desc {
		margin: 0;
		font-size: 0.92rem;
		line-height: 1.5;
		color: var(--muted-slate, rgba(148, 163, 184, 0.85));
	}

	.pricing-features {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.88rem;
		line-height: 1.5;
		color: var(--text-primary, #f8fafc);
	}

	.pricing-features li + li {
		margin-top: 0.32rem;
	}

	.pricing-features a {
		color: var(--brand-primary, #00f0ff);
		text-decoration: underline;
	}

	.btn-pricing {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		padding: 0.7rem 1rem;
		border-radius: 14px;
		border: 1px solid var(--vanguard-border, rgba(0, 240, 255, 0.32));
		background: rgba(1, 4, 9, 0.55);
		color: var(--text-primary, #f8fafc);
		font-weight: 800;
		font-size: 0.92rem;
		letter-spacing: 0.02em;
		cursor: pointer;
		text-decoration: none;
		transition: transform 80ms ease, box-shadow 80ms ease, border-color 80ms ease;
		margin-top: auto;
	}

	.btn-pricing:hover:not(:disabled) {
		transform: translateY(-1px);
		border-color: var(--brand-primary, #00f0ff);
		box-shadow: 0 6px 14px rgba(0, 240, 255, 0.18);
	}

	.btn-pricing:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.btn-pricing--primary {
		background: linear-gradient(135deg, var(--brand-primary, #00f0ff), var(--brand-accent, #8b5cf6));
		color: #021018;
		border-color: transparent;
	}

	.pricing-error {
		grid-column: 1 / -1;
		padding: 0.6rem 0.8rem;
		border-radius: 14px;
		background: rgba(220, 38, 38, 0.12);
		border: 1px solid rgba(220, 38, 38, 0.32);
		color: #fecaca;
		font-size: 0.85rem;
	}

	.pricing-footnote {
		margin: 0.3rem 0 0 0;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 11px;
		letter-spacing: 0.04em;
		color: rgba(148, 163, 184, 0.65);
	}
</style>
