/**
 * PhoneLinkEngine.svelte.ts
 * ──────────────────────────
 * Phase 2, Epic 3 — Native Firebase Phone Number Verification.
 *
 * Brain layer (Vanguard Trinity pattern).
 * Pure TypeScript Svelte 5 state machine for the phone-linking flow.
 * No DOM references; no Svelte markup.
 *
 * States
 * ───────
 *   idle              — initial state; user has not started the flow
 *   sending_code      — awaiting linkWithPhoneNumber response
 *   awaiting_code     — SMS sent; waiting for 6-digit code input
 *   verifying         — calling confirmationResult.confirm(code)
 *   success           — phone linked + mirror CF called
 *   already_linked    — this user already has a phone linked (pre-check)
 *   invalid_phone     — E.164 parse failed or Firebase auth/invalid-phone-number
 *   quota_exceeded    — auth/too-many-requests from Firebase
 *   code_expired      — auth/code-expired (user waited too long)
 *   wrong_code        — auth/invalid-verification-code
 *   error             — unexpected error
 *
 * Dependencies
 * ─────────────
 *   firebase/auth     — linkWithPhoneNumber, ConfirmationResult, RecaptchaVerifier
 *   $lib/firebase.js  — auth singleton
 *   $lib/services/recaptchaService.svelte.js — createInvisibleRecaptcha / tearDownRecaptcha
 */

import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { linkWithPhoneNumber, getIdToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '$lib/firebase.js';
import type {
	MirrorPhoneVerificationInput,
	MirrorPhoneVerificationResult,
} from '$lib/types/phoneVerification.js';

export type PhoneLinkState =
	| 'idle'
	| 'sending_code'
	| 'awaiting_code'
	| 'verifying'
	| 'success'
	| 'already_linked'
	| 'invalid_phone'
	| 'quota_exceeded'
	| 'code_expired'
	| 'wrong_code'
	| 'error';

/** Maps Firebase error codes → engine states. */
const ERROR_CODE_MAP: Record<string, PhoneLinkState> = {
	'auth/invalid-phone-number':      'invalid_phone',
	'auth/too-many-requests':         'quota_exceeded',
	'auth/code-expired':              'code_expired',
	'auth/invalid-verification-code': 'wrong_code',
	'auth/credential-already-in-use': 'already_linked',
	'auth/provider-already-linked':   'already_linked',
};

export class PhoneLinkEngine {
	state = $state<PhoneLinkState>('idle');
	errorMessage = $state('');
	/** E.164 number the code was sent to — used for display ("SMS sent to +1 ···· 0123"). */
	sentToPhone = $state('');
	/** Mirrored E.164 after successful verification. */
	verifiedPhone = $state('');

	/** Web OTP AbortController — aborted when the user leaves awaiting_code. */
	#otpAbort: AbortController | null = null;

	#confirmationResult: ConfirmationResult | null = null;

	readonly #mirrorFn = httpsCallable<MirrorPhoneVerificationInput, MirrorPhoneVerificationResult>(
		getFunctions(undefined, 'us-east1'),
		'mirrorPhoneVerification',
	);

	/**
	 * Step 1 — send the verification SMS.
	 * @param phoneE164  E.164 number (e.g. "+15555550123")
	 * @param verifier   Invisible RecaptchaVerifier bound to the container div.
	 */
	async sendCode(phoneE164: string, verifier: RecaptchaVerifier): Promise<void> {
		if (this.state === 'sending_code') return;

		const currentUser = auth.currentUser;
		if (!currentUser) {
			this.state = 'error';
			this.errorMessage = 'You must be signed in to link a phone number.';
			return;
		}

		// Guard: already has a phone linked.
		if (currentUser.phoneNumber) {
			this.state = 'already_linked';
			return;
		}

		this.state = 'sending_code';
		this.errorMessage = '';
		this.#confirmationResult = null;

		try {
			this.#confirmationResult = await linkWithPhoneNumber(currentUser, phoneE164, verifier);
			this.sentToPhone = phoneE164;
			this.state = 'awaiting_code';
		} catch (err: unknown) {
			this.#handleError(err);
		}
	}

	/**
	 * Step 2 — confirm the 6-digit code (from SMS or Web OTP API auto-fill).
	 * @param code  6-digit string (e.g. "123456")
	 */
	async confirm(code: string): Promise<void> {
		if (!this.#confirmationResult || this.state !== 'awaiting_code') return;

		this.#abortOtpListener();
		this.state = 'verifying';
		this.errorMessage = '';

		try {
			await this.#confirmationResult.confirm(code);
			// Force-refresh the ID token so the JWT reflects the new phone credential.
			if (auth.currentUser) {
				await getIdToken(auth.currentUser, /* forceRefresh */ true);
			}
			// Mirror to Firestore + stamp phoneVerified JWT claim.
			const result = await this.#mirrorFn({});
			this.verifiedPhone = result.data.phoneE164;
			this.state = 'success';
		} catch (err: unknown) {
			this.#handleError(err);
		}
	}

	/**
	 * Reset the engine back to idle (e.g. when the user wants to change the number).
	 */
	reset(): void {
		this.#abortOtpListener();
		this.#confirmationResult = null;
		this.state = 'idle';
		this.errorMessage = '';
		this.sentToPhone = '';
	}

	/**
	 * Called by the Web OTP API integration (D5) to register the AbortController
	 * so we can cancel it when the user leaves the awaiting_code state.
	 */
	setOtpAbort(ctrl: AbortController): void {
		this.#otpAbort = ctrl;
	}

	/**
	 * Start the Web OTP API listener for Chrome Android auto-fill.
	 *
	 * Call this immediately after the engine transitions to `awaiting_code`.
	 * When the device receives the Firebase SMS, Chrome intercepts it and
	 * resolves the credential — the 6-digit code is extracted and `confirm()`
	 * is called automatically.
	 *
	 * Feature-detected via `'OTPCredential' in window`.  No-ops silently on
	 * iOS / Firefox / desktop; the user types the code manually in all other cases.
	 *
	 * The SMS body must end with:
	 *   \n\n@<domain> #<6-digit-code>
	 * Firebase Auth generates this format automatically when Phone Auth is
	 * enabled in the Firebase Console.
	 */
	startWebOtpListener(): void {
		if (typeof window === 'undefined' || !('OTPCredential' in window)) return;

		const ctrl = new AbortController();
		this.#otpAbort = ctrl;

		// OTPCredential is not yet in the standard TypeScript lib; cast through
		// unknown to safely access the `code` property at runtime.
		(
			navigator.credentials.get({
				otp: { transport: ['sms'] },
				signal: ctrl.signal,
			} as unknown as CredentialRequestOptions) as unknown as Promise<{ code: string } | null>
		)
			.then((credential) => {
				if (!credential) return;
				// Auto-fill the code and submit.
				this.confirm(credential.code);
			})
			.catch((err: unknown) => {
				// AbortError is expected when the user leaves the step or types manually.
				const name = (err as { name?: string }).name ?? '';
				if (name !== 'AbortError') {
					console.warn('[PhoneLinkEngine] Web OTP error', err);
				}
			});
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	#abortOtpListener(): void {
		if (this.#otpAbort) {
			this.#otpAbort.abort();
			this.#otpAbort = null;
		}
	}

	#handleError(err: unknown): void {
		const code = (err as { code?: string }).code ?? '';
		const msg  = (err as { message?: string }).message ?? 'An unexpected error occurred.';
		const mapped = ERROR_CODE_MAP[code];
		if (mapped) {
			this.state = mapped;
		} else {
			this.state = 'error';
			this.errorMessage = msg;
		}
	}
}
