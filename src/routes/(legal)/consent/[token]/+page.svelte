<script lang="ts">
	/**
	 * /consent/[token] — Parental Consent Verification Page
	 * ───────────────────────────────────────────────────────
	 * NO LOGIN REQUIRED. This page is designed to be opened by a parent who
	 * has received the consent request email. They may not have a VANGUARD
	 * account, so authentication is intentionally NOT required.
	 *
	 * Security model:
	 *   The 64-char hex token IS the authentication (128-bit entropy).
	 *   Single-use (consumed flag), 72-hour TTL, server-side atomic transaction.
	 *
	 * Phase 2, Epic 3 — WebAuthn Biometric Attestation:
	 *   1. On mount: call generateConsentAttestationChallenge → get challenge.
	 *   2. Parent clicks GRANT or DENY → navigator.credentials.create() fires.
	 *   3. OS biometric prompt (TouchID / FaceID / Windows Hello).
	 *   4. attestParentalConsent CF verifies challenge + RP ID + origin, writes
	 *      coppa_attestations/{tokenId}, commits coppaStatus, stamps JWT claim.
	 *
	 * Fallback (webauthn_unsupported):
	 *   If navigator.credentials / PublicKeyCredential not available, the page
	 *   falls back to the classical verifyParentalConsent callable with a
	 *   warning banner.  The consent is still legally binding; biometric proof
	 *   is the stronger audit trail but not the only valid path.
	 */

	import '$lib/styles/consent-tokens.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { httpsCallable } from 'firebase/functions';
	import { functions as fns } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type {
		VerifyConsentInput,
		VerifyConsentResult,
		GenerateConsentChallengeInput,
		GenerateConsentChallengeResult,
		AttestParentalConsentInput,
		AttestParentalConsentResult,
	} from '$lib/types/coppa.js';

	// ── State ──────────────────────────────────────────────────────────────────

	type Phase =
		| 'idle'
		| 'requesting_challenge'
		| 'awaiting_biometric'
		| 'submitting_attestation'
		| 'processing'
		| 'granted'
		| 'denied'
		| 'expired'
		| 'user_cancelled'
		| 'webauthn_unsupported'
		| 'error';

	const token = $derived(page.params.token ?? '');
	let phase = $state<Phase>('idle');
	let childDisplayName = $state('');
	let errorMsg = $state('');
	let webAuthnSupported = $state(false);
	let fellBackToClassical = $state(false);

	// WebAuthn challenge data (set after generateConsentAttestationChallenge succeeds).
	let challengeB64 = $state('');
	let rpId         = $state('');
	let userIdHandle = $state('');
	let userName     = $state('');
	let userDisplayName = $state('');

	const isTokenValid = $derived(token.length === 64 && /^[0-9a-f]+$/.test(token));
	const isBusy = $derived(
		phase === 'requesting_challenge' ||
		phase === 'awaiting_biometric' ||
		phase === 'submitting_attestation' ||
		phase === 'processing',
	);

	const generateChallengeFn = httpsCallable<GenerateConsentChallengeInput, GenerateConsentChallengeResult>(
		fns,
		'generateConsentAttestationChallenge',
	);
	const attestFn = httpsCallable<AttestParentalConsentInput, AttestParentalConsentResult>(
		fns,
		'attestParentalConsent',
	);
	const verifyConsentFn = httpsCallable<VerifyConsentInput, VerifyConsentResult>(
		fns,
		'verifyParentalConsent',
	);

	// ── Mount: detect WebAuthn support + fetch challenge ──────────────────────

	onMount(() => {
		webAuthnSupported =
			typeof window !== 'undefined' &&
			'credentials' in navigator &&
			typeof (window as Window & { PublicKeyCredential?: unknown }).PublicKeyCredential !== 'undefined';

		if (isTokenValid && webAuthnSupported) {
			void fetchChallenge();
		}
	});

	async function fetchChallenge() {
		phase = 'requesting_challenge';
		try {
			const res = await generateChallengeFn({ token });
			challengeB64    = res.data.challenge;
			rpId            = res.data.rpId;
			userIdHandle    = res.data.userIdHandle;
			userName        = res.data.userName;
			userDisplayName = res.data.userDisplayName;
			phase = 'idle';
		} catch (err: unknown) {
			const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
			if (msg.includes('deadline-exceeded') || msg.includes('expired')) {
				phase = 'expired';
			} else if (msg.includes('already-exists')) {
				errorMsg = 'This consent link has already been used.';
				phase = 'error';
			} else {
				// Challenge fetch failed — fall back to classical path.
				webAuthnSupported = false;
				phase = 'idle';
			}
		}
	}

	// ── Helpers: base64url encode/decode ──────────────────────────────────────

	function base64urlToBuffer(b64: string): ArrayBuffer {
		const padded = b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(
			b64.length + (4 - (b64.length % 4)) % 4, '=',
		);
		const bin = atob(padded);
		const buf = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
		return buf.buffer;
	}

	function bufferToBase64url(buf: ArrayBuffer): string {
		const bytes = new Uint8Array(buf);
		let binary = '';
		for (const b of bytes) binary += String.fromCharCode(b);
		return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	}

	// ── Main handler ──────────────────────────────────────────────────────────

	async function handleVerify(action: 'granted' | 'denied') {
		if (!isTokenValid || isBusy) return;
		errorMsg = '';

		if (webAuthnSupported && challengeB64) {
			await handleWebAuthn(action);
		} else {
			await handleClassical(action);
		}
	}

	async function handleWebAuthn(action: 'granted' | 'denied') {
		phase = 'awaiting_biometric';

		let credential: PublicKeyCredential | null = null;
		try {
			// Encode the user ID handle as a Uint8Array (opaque bytes, not a UID).
			const enc = new TextEncoder();
			credential = await navigator.credentials.create({
				publicKey: {
					challenge: base64urlToBuffer(challengeB64),
					rp: { id: rpId, name: 'VANGUARD COPPA Consent' },
					user: {
						id: enc.encode(userIdHandle),
						name: userName,
						displayName: userDisplayName,
					},
					pubKeyCredParams: [
						{ type: 'public-key', alg: -7  },  // ES256
						{ type: 'public-key', alg: -257 }, // RS256
					],
					authenticatorSelection: {
						userVerification: 'required',
						residentKey: 'preferred',
					},
					attestation: 'direct',
					timeout: 90_000,
				},
			}) as PublicKeyCredential | null;
		} catch (err: unknown) {
			const name = (err as { name?: string }).name ?? '';
			if (name === 'NotAllowedError' || name === 'AbortError') {
				phase = 'user_cancelled';
				return;
			}
			// Any other WebAuthn error → classical fallback.
			webAuthnSupported = false;
			fellBackToClassical = true;
			await handleClassical(action);
			return;
		}

		if (!credential) {
			phase = 'user_cancelled';
			return;
		}

		const response = credential.response as AuthenticatorAttestationResponse;
		const attestationObjectB64 = bufferToBase64url(response.attestationObject);
		const clientDataJSONB64    = bufferToBase64url(response.clientDataJSON);
		const credentialIdB64      = bufferToBase64url(credential.rawId);

		phase = 'submitting_attestation';
		try {
			const result = await attestFn({
				token,
				action,
				attestationObjectB64,
				clientDataJSONB64,
				credentialIdB64,
			});
			childDisplayName = result.data.childDisplayName ?? 'your child';
			phase = action;
		} catch (err: unknown) {
			handleServerError(err);
		}
	}

	async function handleClassical(action: 'granted' | 'denied') {
		phase = 'processing';
		try {
			const result = await verifyConsentFn({ token, action });
			childDisplayName = result.data.childDisplayName ?? 'your child';
			phase = action;
		} catch (err: unknown) {
			handleServerError(err);
		}
	}

	function handleServerError(err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes('deadline-exceeded') || msg.includes('expired')) {
			phase = 'expired';
		} else if (msg.includes('already-exists')) {
			errorMsg = 'This consent link has already been used.';
			phase = 'error';
		} else {
			errorMsg = msg || 'An unexpected error occurred. Please try again.';
			phase = 'error';
		}
	}
</script>

<svelte:head>
	<title>Parental Consent — VANGUARD</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- ─── Root ─────────────────────────────────────────────────────────────── -->
<div class="cv-root">
	<div class="cv-scanlines" aria-hidden="true"></div>
	<div class="cv-grid tw-font-mono" aria-hidden="true"></div>

	<main class="cv-main">

		<!-- ── Platform mark ─────────────────────────────────────────────── -->
		<header class="cv-brand">
			<div class="cv-brand__mark" aria-hidden="true">
				<svg viewBox="0 0 32 32" fill="none">
					<polygon points="16,2 30,10 30,22 16,30 2,22 2,10"
						stroke="#14b8a6" stroke-width="1.2"
						fill="rgba(20, 184, 166,0.08)" />
					<text x="16" y="21" text-anchor="middle" font-size="11"
						fill="#14b8a6" font-family="'Geist Mono', monospace" font-weight="900">V</text>
				</svg>
			</div>
			<div>
				<p class="cv-brand__sub">VANGUARD · SPORTS SKILL TRACKER</p>
				<p class="cv-brand__law">COPPA 2026 · PRIVACY SHIELD COMPLIANCE</p>
			</div>
		</header>

		<!-- ── Panel ─────────────────────────────────────────────────────── -->
		<div class="cv-panel">

			<!-- PHASE: invalid token -->
			{#if !isTokenValid}
				<div class="cv-state cv-state--error">
					<div class="cv-state__icon" aria-hidden="true">⚠</div>
					<h1 class="cv-state__title">INVALID CONSENT LINK</h1>
					<p class="cv-state__body">
						This consent link appears to be malformed or incomplete.
						Please check the original email and try the full link again.
					</p>
				</div>

		<!-- PHASE: requesting_challenge — fetching WebAuthn challenge -->
		{:else if phase === 'requesting_challenge'}
			<div class="cv-state cv-state--loading">
				<div class="cv-state__spinner" aria-hidden="true"></div>
				<h1 class="cv-state__title">INITIALISING SECURE SESSION…</h1>
				<p class="cv-state__body">Preparing biometric attestation.</p>
			</div>

		<!-- PHASE: idle — awaiting parent decision -->
		{:else if phase === 'idle'}
			<div class="cv-eyebrow">PARENTAL CONSENT REQUEST</div>
			<h1 class="cv-title">Review & Respond</h1>
			<p class="cv-body">
				A child account on <strong class="cv-accent">VANGUARD</strong> has requested
				your consent to use this sports performance tracking platform.
			</p>

			{#if webAuthnSupported && challengeB64}
				<div class="cv-biometric-notice">
					<span class="cv-biometric-notice__icon" aria-hidden="true">🔐</span>
					<span>
						<strong>Biometric Verification Active.</strong>
						Your decision will be cryptographically bound to your device's
						biometric (fingerprint / face) for the strongest COPPA audit trail.
					</span>
				</div>
			{:else if !webAuthnSupported}
				<div class="cv-fallback-notice">
					<span>⚠ This browser cannot perform biometric attestation — your consent will
					be recorded by classical signature only. This is still legally valid.</span>
				</div>
			{/if}

			<div class="cv-legal-box">
				<p class="cv-legal-heading">CHILDREN'S ONLINE PRIVACY PROTECTION ACT (COPPA)</p>
				<p class="cv-legal-text">
					Under U.S. federal law, websites and online services are required to obtain
					verifiable parental consent before collecting, using, or disclosing personal
					information from children under the age of 13. By clicking <strong>"Grant
					Consent"</strong> below, you confirm that:
				</p>
				<ul class="cv-legal-list">
					<li>You are the parent or legal guardian of the child account.</li>
					<li>You consent to the collection and use of your child's sports
						performance data (workout logs, skill scores, game stats) solely
						for training and progress tracking.</li>
					<li>You understand that your child's information will not be sold
						or shared with third-party advertisers.</li>
					<li>You may revoke consent at any time by contacting your club
						administrator.</li>
				</ul>
			</div>

			<div class="cv-actions">
				<button
					class="cv-btn cv-btn--grant"
					onclick={() => handleVerify('granted')}
					disabled={isBusy}
				>
					<span class="cv-btn__icon" aria-hidden="true">✓</span>
					{webAuthnSupported && challengeB64 ? '🔐 GRANT WITH BIOMETRIC' : 'GRANT CONSENT'}
				</button>
				<button
					class="cv-btn cv-btn--deny"
					onclick={() => handleVerify('denied')}
					disabled={isBusy}
				>
					<span class="cv-btn__icon" aria-hidden="true">✕</span>
					DENY CONSENT
				</button>
			</div>

			<p class="cv-audit-notice">
				🔒 Your decision will be logged with a tamper-evident timestamp and IP address
				for COPPA compliance. This link is single-use and expires in 72 hours from when
				it was requested.
			</p>

		<!-- PHASE: awaiting_biometric -->
		{:else if phase === 'awaiting_biometric'}
			<div class="cv-state cv-state--loading">
				<div class="cv-state__biometric-icon" aria-hidden="true">🔐</div>
				<h1 class="cv-state__title">AWAITING BIOMETRIC…</h1>
				<p class="cv-state__body">
					Please complete the biometric prompt on your device
					(fingerprint, face ID, or security key).
				</p>
			</div>

		<!-- PHASE: submitting_attestation -->
		{:else if phase === 'submitting_attestation'}
			<div class="cv-state cv-state--loading">
				<div class="cv-state__spinner" aria-hidden="true"></div>
				<h1 class="cv-state__title">RECORDING ATTESTATION…</h1>
				<p class="cv-state__body">Binding your biometric signature to the consent record.</p>
			</div>

		<!-- PHASE: processing (classical fallback) -->
		{:else if phase === 'processing'}
			<div class="cv-state cv-state--loading">
				<div class="cv-state__spinner" aria-hidden="true"></div>
				<h1 class="cv-state__title">PROCESSING...</h1>
				<p class="cv-state__body">Recording your consent decision securely.</p>
			</div>

		<!-- PHASE: user_cancelled -->
		{:else if phase === 'user_cancelled'}
			<div class="cv-state cv-state--error">
				<div class="cv-state__icon" aria-hidden="true">✕</div>
				<h1 class="cv-state__title">BIOMETRIC CANCELLED</h1>
				<p class="cv-state__body">
					You cancelled the biometric prompt. Your consent was not recorded.
				</p>
				<button class="cv-btn cv-btn--grant" onclick={() => { phase = 'idle'; }}>
					TRY AGAIN
				</button>
			</div>

			<!-- PHASE: granted -->
			{:else if phase === 'granted'}
				<div class="cv-state cv-state--success">
				<div class="cv-state__icon cv-state__icon--success" aria-hidden="true">
					<Icon name="status.verified" size={60} class="tw-text-[#2dd4bf]" />
				</div>
					<h1 class="cv-state__title cv-state__title--success">CONSENT GRANTED</h1>
					<p class="cv-state__body">
						Thank you. Consent has been granted for <strong class="cv-accent-green">{childDisplayName}</strong>
						to use VANGUARD. The account is now active.
					</p>
					<p class="cv-state__body cv-state__body--small">
						Your child's app will update automatically within a few minutes.
						If they are currently on the consent screen, they can refresh the page.
					</p>
					{#if fellBackToClassical}
						<div class="cv-biometric-notice tw-mt-4">
							<span class="cv-biometric-notice__icon" aria-hidden="true">⚠</span>
							<span>
								<strong>Biometric Unavailable.</strong> Your device's scanner was not found or timed out.
								Your consent was successfully recorded using a classical signature instead.
							</span>
						</div>
					{/if}
					<div class="cv-confirmation-strip">
						<span class="cv-confirmation-strip__icon">🔒</span>
						<span class="cv-confirmation-strip__text">
							This decision has been logged with your IP address and a server timestamp
							for COPPA compliance records.
						</span>
					</div>
				</div>

			<!-- PHASE: denied -->
			{:else if phase === 'denied'}
				<div class="cv-state cv-state--denied">
				<div class="cv-state__icon" aria-hidden="true">
					<Icon name="status.error" size={60} class="tw-text-[rgba(255,77,106,0.8)]" />
				</div>
					<h1 class="cv-state__title">CONSENT DENIED</h1>
					<p class="cv-state__body">
						Your decision has been recorded. The account for
						<strong class="cv-accent">{childDisplayName}</strong> will remain
						locked until parental consent is provided.
					</p>
					<p class="cv-state__body cv-state__body--small">
						If this was a mistake, or if the child needs access at a later date,
						they can request a new consent email from the login screen.
					</p>
					<div class="cv-confirmation-strip">
						<span class="cv-confirmation-strip__icon">🔒</span>
						<span class="cv-confirmation-strip__text">
							This decision has been logged for COPPA compliance records.
						</span>
					</div>
				</div>

			<!-- PHASE: expired -->
			{:else if phase === 'expired'}
				<div class="cv-state cv-state--error">
					<div class="cv-state__icon" aria-hidden="true">⏱</div>
					<h1 class="cv-state__title">LINK EXPIRED</h1>
					<p class="cv-state__body">
						This consent link has expired (72-hour limit). Please ask the child
						to log into the app and request a new consent email.
					</p>
				</div>

			<!-- PHASE: error -->
			{:else if phase === 'error'}
				<div class="cv-state cv-state--error">
					<div class="cv-state__icon" aria-hidden="true">⚠</div>
					<h1 class="cv-state__title">VERIFICATION FAILED</h1>
					<p class="cv-state__body">{errorMsg}</p>
					<p class="cv-state__body cv-state__body--small">
						If this error persists, contact your child's sports club administrator.
					</p>
				</div>
			{/if}

		</div>

		<!-- ── Footer ────────────────────────────────────────────────────── -->
		<footer class="cv-footer">
			<p class="cv-footer__text">
				VANGUARD Soccer Skills Tracker · COPPA 2026 Compliance System ·
				This page is secured by token-based cryptographic verification.
				All consent events are immutably logged for legal compliance.
			</p>
		</footer>

	</main>
</div>

