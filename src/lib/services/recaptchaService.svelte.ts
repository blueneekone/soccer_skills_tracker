/**
 * recaptchaService.svelte.ts
 * ───────────────────────────
 * Phase 2, Epic 3 — Native Firebase Phone Number Verification.
 *
 * Provides a safe wrapper around Firebase `RecaptchaVerifier` for use with
 * `linkWithPhoneNumber` / `signInWithPhoneNumber` in Svelte components.
 *
 * Design decisions
 * ─────────────────
 * • size: 'invisible'  — No "I'm not a robot" checkbox; reCAPTCHA is solved
 *   silently in the background before the SMS is dispatched.
 *
 * • tearDownRecaptcha() — Must be called in Svelte `onDestroy` (or a returned
 *   cleanup fn from $effect) to clear the verifier widget.  Without this,
 *   navigating back to the phone page causes:
 *   "reCAPTCHA has already been rendered in this element."
 *
 * App Check (follow-on)
 * ──────────────────────
 * Enabling Firebase App Check with reCAPTCHA Enterprise on top of Phone Auth
 * requires:
 *   1. Call `initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey) })`
 *      in `src/lib/firebase.js` before any Auth call.
 *   2. Set `enforceAppCheck: true` in Cloud Functions (see functions/index.js).
 *   3. Register the reCAPTCHA Enterprise site key in the Firebase Console →
 *      App Check → Apps.
 * Reference: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
 *
 * This is intentionally NOT implemented in this epic — App Check requires a
 * separate Firebase Console configuration step and billing enablement.
 */

import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '$lib/firebase.js';
import { browser } from '$app/environment';

/**
 * Create and render an invisible reCAPTCHA verifier bound to a DOM element.
 *
 * @param containerId  The `id` attribute of the container `<div>` in the DOM.
 *                     Must already be mounted when this function is called.
 * @returns            A `RecaptchaVerifier` instance ready to pass to
 *                     `linkWithPhoneNumber`.
 *
 * @example
 *   // In a Svelte component:
 *   import { createInvisibleRecaptcha, tearDownRecaptcha } from '$lib/services/recaptchaService.svelte.js';
 *   let verifier: RecaptchaVerifier | null = null;
 *   onMount(() => { verifier = createInvisibleRecaptcha('phone-recaptcha'); });
 *   onDestroy(() => { if (verifier) tearDownRecaptcha(verifier); });
 */
export function createInvisibleRecaptcha(containerId: string): RecaptchaVerifier {
	if (!browser) {
		throw new Error('createInvisibleRecaptcha must only be called in the browser.');
	}
	const verifier = new RecaptchaVerifier(auth, containerId, {
		size: 'invisible',
		callback: () => {
			// reCAPTCHA solved — Firebase will automatically proceed with the
			// SMS dispatch.  No user action required.
		},
		'expired-callback': () => {
			// Token expired before the user submitted.  The verifier must be
			// cleared and re-rendered; PhoneLinkEngine handles this by calling
			// tearDownRecaptcha + recreating when the user retries.
		},
	});
	return verifier;
}

/**
 * Safely destroy a `RecaptchaVerifier` instance.
 *
 * Call this from `onDestroy` in your component, or from the cleanup function
 * returned by a `$effect`, to prevent the "already rendered" error.
 *
 * @param verifier  The verifier returned by `createInvisibleRecaptcha`.
 */
export function tearDownRecaptcha(verifier: RecaptchaVerifier): void {
	try {
		verifier.clear();
	} catch {
		// Silently swallow — the widget may have already been destroyed if the
		// user navigated away before the reCAPTCHA iframe finished loading.
	}
}
