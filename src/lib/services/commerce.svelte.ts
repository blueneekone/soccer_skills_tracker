/**
 * commerce.svelte.ts — Vanguard Commerce Service
 * ────────────────────────────────────────────────
 * Svelte 5 reactive service managing season registration payments.
 *
 * USAGE
 * ─────
 *   const reg = new CommerceEngine(playerEmail, tenantId, seasonId);
 *   reg.init();              // starts real-time payment status listener
 *   // show <SeasonRegistration armory={reg} /> when reg.paymentStatus !== 'paid'
 *   reg.destroy();
 *
 * STRIPE INTEGRATION NOTES
 * ────────────────────────
 * This service manages the payment flow:
 *   1. Calls createRegistrationIntent CF → gets { clientSecret, registrationId }
 *   2. Uses Stripe.js (loaded lazily) to confirmCardPayment with the clientSecret
 *   3. After confirmation, the Stripe webhook (handleRegistrationWebhook) fires
 *      and flips paymentStatus → 'paid' in Firestore
 *   4. The real-time onSnapshot listener here picks up the change immediately
 *
 * STRIPE.JS LAZY LOAD
 * ──────────────────
 * We load Stripe.js from https://js.stripe.com/v3/ on demand (never in SSR)
 * to comply with Stripe's PCI DSS requirement that Stripe.js is loaded from
 * their CDN. Import it via the loadStripe() function below.
 */

import { browser } from '$app/environment';
import {
	doc,
	onSnapshot,
	collection,
	query,
	where,
	orderBy,
	limit,
	type Unsubscribe,
} from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ── Public types ──────────────────────────────────────────────────────────────

export type PaymentStatus = 'none' | 'pending' | 'processing' | 'paid' | 'failed';

export interface RegistrationRecord {
	registrationId: string;
	paymentStatus: PaymentStatus;
	feeAmountCents: number;
	paidAt: number | null;
	seasonId: string;
}

// ── Stripe.js loader ──────────────────────────────────────────────────────────

let _stripe: unknown = null;

/**
 * Lazily loads Stripe.js from the official CDN (PCI DSS compliant).
 * Returns a Stripe instance ready for confirmCardPayment().
 */
async function loadStripe(publishableKey: string): Promise<unknown> {
	if (_stripe) return _stripe;
	if (!browser) return null;

	// Dynamically inject Stripe.js script tag (CDN only, never bundled)
	if (!(window as Window & { Stripe?: unknown }).Stripe) {
		await new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'https://js.stripe.com/v3/';
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load Stripe.js'));
			document.head.appendChild(script);
		});
	}
	_stripe = (window as unknown as { Stripe: (key: string) => unknown }).Stripe(publishableKey);
	return _stripe;
}

// ── CommerceEngine ────────────────────────────────────────────────────────────

export class CommerceEngine {
	// ── State ─────────────────────────────────────────────────────────────────

	registration = $state<RegistrationRecord | null>(null);
	paymentStatus = $state<PaymentStatus>('none');
	clientSecret = $state<string | null>(null);
	registrationId = $state<string | null>(null);
	feeAmountCents = $state<number>(0);
	isLoading = $state(false);
	isConfirming = $state(false);
	error = $state<string | null>(null);

	// ── Derived ───────────────────────────────────────────────────────────────

	readonly isPaid = $derived(this.paymentStatus === 'paid');
	readonly needsPayment = $derived(
		this.paymentStatus === 'none' || this.paymentStatus === 'failed',
	);
	readonly feeLabel = $derived(
		this.feeAmountCents > 0
			? `$${(this.feeAmountCents / 100).toFixed(2)}`
			: '—',
	);

	// ── Private ───────────────────────────────────────────────────────────────

	private _unsub: Unsubscribe | null = null;

	constructor(
		private readonly playerEmail: string,
		private readonly tenantId: string,
		private readonly seasonId: string,
		private readonly stripePublishableKey: string = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
	) {}

	// ── Lifecycle ─────────────────────────────────────────────────────────────

	init(): void {
		if (!browser || !this.playerEmail || !this.seasonId) return;
		this._startListener();
	}

	destroy(): void {
		this._unsub?.();
		this._unsub = null;
	}

	// ── Public API ────────────────────────────────────────────────────────────

	/**
	 * Calls `createRegistrationIntent` CF and stores the client secret for Stripe.js.
	 */
	async createIntent(feeAmountDollars: number): Promise<void> {
		this.isLoading = true;
		this.error = null;
		try {
			const fns = getFunctions(undefined, 'us-east1');
			const createFn = httpsCallable<
				{ seasonId: string; feeAmountDollars: number; playerEmail?: string },
				{ clientSecret: string; registrationId: string; feeAmountCents: number }
			>(fns, 'createRegistrationIntent');

			const res = await createFn({
				seasonId: this.seasonId,
				feeAmountDollars,
				playerEmail: this.playerEmail,
			});
			this.clientSecret = res.data.clientSecret;
			this.registrationId = res.data.registrationId;
			this.feeAmountCents = res.data.feeAmountCents;
			this.paymentStatus = 'pending';
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to create payment intent.';
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Calls Stripe.js `confirmCardPayment()` with the stored client secret.
	 * On success, the Stripe webhook fires and the real-time listener updates paymentStatus.
	 *
	 * @param cardElement — A mounted Stripe CardElement from your UI
	 * @param billingName — Cardholder name for the PaymentMethod
	 */
	async confirmPayment(cardElement: unknown, billingName: string): Promise<void> {
		if (!this.clientSecret) {
			this.error = 'No payment intent. Call createIntent() first.';
			return;
		}
		this.isConfirming = true;
		this.error = null;
		try {
			const stripe = await loadStripe(this.stripePublishableKey);
			if (!stripe) throw new Error('Stripe.js failed to load.');

			const result = await (
				stripe as {
					confirmCardPayment: (
						secret: string,
						opts: { payment_method: { card: unknown; billing_details: { name: string } } },
					) => Promise<{ error?: { message: string } }>;
				}
			).confirmCardPayment(this.clientSecret, {
				payment_method: {
					card: cardElement,
					billing_details: { name: billingName },
				},
			});

			if (result.error) {
				this.error = result.error.message ?? 'Payment failed.';
				this.paymentStatus = 'failed';
			} else {
				// Webhook will fire shortly; optimistically set to processing
				this.paymentStatus = 'processing';
			}
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Payment confirmation failed.';
			this.paymentStatus = 'failed';
		} finally {
			this.isConfirming = false;
		}
	}

	// ── Private ───────────────────────────────────────────────────────────────

	private _startListener(): void {
		const regQuery = query(
			collection(db, 'season_registrations'),
			where('playerEmail', '==', this.playerEmail),
			where('tenantId', '==', this.tenantId),
			where('seasonId', '==', this.seasonId),
			orderBy('createdAt', 'desc'),
			limit(1),
		);

		this._unsub = onSnapshot(
			regQuery,
			(snap) => {
				if (snap.empty) {
					this.registration = null;
					this.paymentStatus = 'none';
					return;
				}
				const data = snap.docs[0].data();
				this.registration = {
					registrationId: snap.docs[0].id,
					paymentStatus: data.paymentStatus as PaymentStatus,
					feeAmountCents: data.feeAmountCents ?? 0,
					paidAt: data.paidAt?.toMillis?.() ?? null,
					seasonId: data.seasonId,
				};
				this.paymentStatus = data.paymentStatus as PaymentStatus;
				this.feeAmountCents = data.feeAmountCents ?? 0;
			},
			(err) => {
				this.error = err.message;
			},
		);
	}
}
