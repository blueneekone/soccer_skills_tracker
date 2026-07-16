/**
 * ticketCheckout.svelte.ts
 * ─────────────────────────
 * Phase 2, Epic 2 — Session A3: Public buyer page checkout engine.
 *
 * Wraps the `createTicketSaleIntent` callable and Stripe.js payment flow.
 * Exposes a reactive state object for the buyer page to bind to.
 *
 * Usage:
 *   import { createTicketCheckout } from '$lib/services/ticketCheckout.svelte.ts';
 *   const checkout = createTicketCheckout();
 *   await checkout.init(eventId, tierId, quantity, buyerEmail);
 *   // mount checkout.elements into a <div id="payment-element">
 *   // on submit: await checkout.confirm(returnUrl);
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';
import { browser } from '$app/environment';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';

// Singleton Stripe promise so we don't re-init on every checkout.
let stripePromise: Promise<Stripe | null> | null = null;
function getStripeJs(): Promise<Stripe | null> {
	if (!browser) return Promise.resolve(null);
	if (!stripePromise) stripePromise = loadStripe(STRIPE_PK);
	return stripePromise;
}

export interface TicketCheckoutState {
	/** Phase: idle → loading → ready → confirming → success | error */
	phase: 'idle' | 'loading' | 'ready' | 'confirming' | 'success' | 'error';
	errorMsg: string;
	ticketId: string;
	grossCents: number;
	platformFeeCents: number;
	clientSecret: string;
}

export function createTicketCheckout() {
	let state = $state<TicketCheckoutState>({
		phase: 'idle',
		errorMsg: '',
		ticketId: '',
		grossCents: 0,
		platformFeeCents: 0,
		clientSecret: '',
	});

	let _stripe: Stripe | null = null;
	let _elements: StripeElements | null = null;

	/**
	 * Call `createTicketSaleIntent` and mount Stripe Elements into `mountId`.
	 */
	async function init(
		eventId: string,
		tierId: string,
		quantity: number,
		buyerEmail: string,
		mountId = 'payment-element',
	) {
		state.phase = 'loading';
		state.errorMsg = '';
		try {
			const fns = functions;
			const createIntent = httpsCallable<
				{ eventId: string; tierId: string; quantity: number },
				{ clientSecret: string; ticketId: string; grossCents: number; platformFeeCents: number }
			>(fns, 'createTicketSaleIntent');

			const res = await createIntent({ eventId, tierId, quantity });
			const { clientSecret, ticketId, grossCents, platformFeeCents } = res.data;
			state.ticketId = ticketId;
			state.grossCents = grossCents;
			state.platformFeeCents = platformFeeCents;
			state.clientSecret = clientSecret;

			_stripe = await getStripeJs();
			if (!_stripe) throw new Error('Stripe.js failed to load.');

			_elements = _stripe.elements({
				clientSecret,
				appearance: {
					theme: 'night',
					variables: {
						colorPrimary: '#6366f1',
						colorBackground: 'rgba(15,15,30,0.7)',
						borderRadius: '12px',
						fontFamily: 'Inter, system-ui, sans-serif',
					},
				},
			});

			const paymentEl = _elements.create('payment', {
				defaultValues: { billingDetails: { email: buyerEmail || undefined } },
			});

			const mountTarget = document.getElementById(mountId);
			if (!mountTarget) throw new Error(`Mount target #${mountId} not found.`);
			paymentEl.mount(mountTarget);

			state.phase = 'ready';
		} catch (e: unknown) {
			state.phase = 'error';
			state.errorMsg = e instanceof Error ? e.message : String(e);
		}
	}

	/**
	 * Confirm the payment.  On success, Stripe redirects to `returnUrl`.
	 */
	async function confirm(returnUrl: string) {
		if (!_stripe || !_elements) {
			state.errorMsg = 'Checkout not initialised.';
			return;
		}
		state.phase = 'confirming';
		state.errorMsg = '';
		try {
			const { error } = await _stripe.confirmPayment({
				elements: _elements,
				confirmParams: { return_url: returnUrl },
			});
			if (error) {
				state.phase = 'error';
				state.errorMsg = error.message ?? 'Payment failed. Please try again.';
			}
			// On success Stripe redirects; we only land here on error.
		} catch (e: unknown) {
			state.phase = 'error';
			state.errorMsg = e instanceof Error ? e.message : String(e);
		}
	}

	function reset() {
		state = {
			phase: 'idle',
			errorMsg: '',
			ticketId: '',
			grossCents: 0,
			platformFeeCents: 0,
			clientSecret: '',
		};
		_stripe = null;
		_elements = null;
	}

	return {
		get state() { return state; },
		init,
		confirm,
		reset,
	};
}
