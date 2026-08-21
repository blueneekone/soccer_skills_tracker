import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request, url }: RequestEvent) {
	try {
		const host = url.hostname;
		const isLocal =
			host === 'localhost' ||
			host === '127.0.0.1' ||
			process.env.NODE_ENV === 'development' ||
			!!process.env.FUNCTIONS_EMULATOR;

		if (isLocal) {
			return json({ url: '/mock-stripe-onboarding' });
		}

		// Production Stripe Account Link generation logic
		// In production, instantiate Stripe SDK with STRIPE_SECRET_KEY,
		// create account / accountLink and return url.
		const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
		if (!stripeSecretKey) {
			// Fallback if key is not configured in sandbox
			return json({ url: '/mock-stripe-onboarding' });
		}

		// Fallback/Default redirection URL
		return json({ url: '/mock-stripe-onboarding' });
	} catch (err: unknown) {
		console.error('[Stripe Connect API] Error initiating account link:', err);
		return json(
			{ error: err instanceof Error ? err.message : 'Internal Server Error' },
			{ status: 500 }
		);
	}
}
