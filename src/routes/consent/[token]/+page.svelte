<script lang="ts">
	/**
	 * /consent/[token] — Parental Consent Verification Page
	 * ───────────────────────────────────────────────────────
	 * NO LOGIN REQUIRED. This page is designed to be opened by a parent who
	 * has received the consent request email. They may not have a VANGUARD
	 * account, so authentication is intentionally NOT required.
	 *
	 * Security model:
	 *   The 32-char (64 hex chars) token IS the authentication.
	 *   It has 128-bit entropy and is:
	 *     • Single-use (consumed flag, enforced server-side)
	 *     • Time-limited (72-hour TTL, enforced server-side)
	 *     • Stored server-side only (never returned to any client)
	 *     • Validated atomically in a Firestore transaction
	 *
	 * The verifyParentalConsent Cloud Function:
	 *   1. Validates the token
	 *   2. Updates users/{childEmail}: coppaStatus, consentDate, vpcStatus
	 *   3. Sets JWT custom claim vpcVerified: true (if granted)
	 *   4. Writes an immutable consent_logs entry with the parent's IP
	 */

	import { page } from '$app/state';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import type { VerifyConsentInput, VerifyConsentResult } from '$lib/types/coppa.js';

	// ── State ──────────────────────────────────────────────────────────────────
	type Phase = 'idle' | 'processing' | 'granted' | 'denied' | 'expired' | 'error';

	const token = $derived(page.params.token ?? '');
	let phase = $state<Phase>('idle');
	let childDisplayName = $state('');
	let errorMsg = $state('');

	const isTokenValid = $derived(token.length === 64 && /^[0-9a-f]+$/.test(token));
	const isProcessing = $derived(phase === 'processing');

	const functions = getFunctions();
	const verifyConsentFn = httpsCallable<VerifyConsentInput, VerifyConsentResult>(
		functions,
		'verifyParentalConsent',
	);

	// ── Handlers ───────────────────────────────────────────────────────────────

	async function handleVerify(action: 'granted' | 'denied') {
		if (!isTokenValid) return;
		phase = 'processing';
		errorMsg = '';

		try {
			const result = await verifyConsentFn({ token, action });
			childDisplayName = result.data.childDisplayName ?? 'your child';
			phase = action;
		} catch (err: unknown) {
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
	}
</script>

<svelte:head>
	<title>Parental Consent — VANGUARD</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- ─── Root ─────────────────────────────────────────────────────────────── -->
<div class="cv-root">
	<div class="cv-scanlines" aria-hidden="true"></div>
	<div class="cv-grid" aria-hidden="true"></div>

	<main class="cv-main">

		<!-- ── Platform mark ─────────────────────────────────────────────── -->
		<header class="cv-brand">
			<div class="cv-brand__mark" aria-hidden="true">
				<svg viewBox="0 0 32 32" fill="none">
					<polygon points="16,2 30,10 30,22 16,30 2,22 2,10"
						stroke="#00f0ff" stroke-width="1.2"
						fill="rgba(0,240,255,0.08)" />
					<text x="16" y="21" text-anchor="middle" font-size="11"
						fill="#00f0ff" font-family="monospace" font-weight="900">V</text>
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

			<!-- PHASE: idle — awaiting parent decision -->
			{:else if phase === 'idle'}
				<div class="cv-eyebrow">PARENTAL CONSENT REQUEST</div>
				<h1 class="cv-title">Review & Respond</h1>
				<p class="cv-body">
					A child account on <strong class="cv-accent">VANGUARD</strong> has requested
					your consent to use this sports performance tracking platform.
				</p>

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
						disabled={isProcessing}
					>
						<span class="cv-btn__icon" aria-hidden="true">✓</span>
						GRANT CONSENT
					</button>
					<button
						class="cv-btn cv-btn--deny"
						onclick={() => handleVerify('denied')}
						disabled={isProcessing}
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

			<!-- PHASE: processing -->
			{:else if phase === 'processing'}
				<div class="cv-state cv-state--loading">
					<div class="cv-state__spinner" aria-hidden="true"></div>
					<h1 class="cv-state__title">PROCESSING...</h1>
					<p class="cv-state__body">Recording your consent decision securely.</p>
				</div>

			<!-- PHASE: granted -->
			{:else if phase === 'granted'}
				<div class="cv-state cv-state--success">
					<div class="cv-state__icon cv-state__icon--success" aria-hidden="true">
						<svg viewBox="0 0 64 64" fill="none">
							<circle cx="32" cy="32" r="28" stroke="#00ff88" stroke-width="1.5"
								fill="rgba(0,255,136,0.06)" />
							<path d="M18 32l10 10 18-18" stroke="#00ff88" stroke-width="2.5"
								stroke-linecap="round" stroke-linejoin="round" />
						</svg>
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
						<svg viewBox="0 0 64 64" fill="none">
							<circle cx="32" cy="32" r="28" stroke="rgba(255,77,106,0.5)"
								stroke-width="1.5" fill="rgba(255,77,106,0.05)" />
							<path d="M22 22l20 20M42 22L22 42" stroke="rgba(255,77,106,0.8)"
								stroke-width="2.5" stroke-linecap="round" />
						</svg>
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

<style>
	/* ─── Root ──────────────────────────────────────────────────────────────── */
	.cv-root {
		min-height: 100dvh;
		background: #020208;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem 1rem;
	}

	.cv-scanlines {
		position: fixed;
		inset: 0;
		pointer-events: none;
		background: repeating-linear-gradient(
			0deg, transparent, transparent 2px,
			rgba(0, 240, 255, 0.015) 2px, rgba(0, 240, 255, 0.015) 4px
		);
		z-index: 0;
	}

	.cv-grid {
		position: fixed;
		inset: 0;
		pointer-events: none;
		background-image:
			linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px);
		background-size: 56px 56px;
		z-index: 0;
	}

	/* ─── Main ──────────────────────────────────────────────────────────────── */
	.cv-main {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 600px;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ─── Brand header ──────────────────────────────────────────────────────── */
	.cv-brand {
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}

	.cv-brand__mark svg {
		width: 36px;
		height: 36px;
		filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.3));
	}

	.cv-brand__sub {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		color: rgba(0, 240, 255, 0.7);
	}

	.cv-brand__law {
		margin: 0.2rem 0 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.25);
	}

	/* ─── Panel ─────────────────────────────────────────────────────────────── */
	.cv-panel {
		background: rgba(8, 10, 18, 0.92);
		border: 1px solid rgba(0, 240, 255, 0.14);
		border-radius: 16px;
		box-shadow:
			0 0 60px rgba(0, 240, 255, 0.06),
			0 0 120px rgba(0, 0, 0, 0.8),
			inset 0 1px 0 rgba(0, 240, 255, 0.1);
		padding: 2.5rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ─── Idle phase content ────────────────────────────────────────────────── */
	.cv-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(0, 240, 255, 0.5);
	}

	.cv-title {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.5rem;
		font-weight: 900;
		letter-spacing: 0.05em;
		color: #ffffff;
	}

	.cv-body {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.55);
	}

	.cv-accent { color: #00f0ff; font-weight: 700; }
	.cv-accent-green { color: #00ff88; font-weight: 700; }

	/* ─── Legal box ─────────────────────────────────────────────────────────── */
	.cv-legal-box {
		background: rgba(0, 240, 255, 0.03);
		border: 1px solid rgba(0, 240, 255, 0.1);
		border-radius: 10px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.cv-legal-heading {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: rgba(0, 240, 255, 0.6);
	}

	.cv-legal-text {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.45);
	}

	.cv-legal-list {
		margin: 0;
		padding: 0 0 0 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.cv-legal-list li {
		font-size: 0.78rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.4);
	}

	/* ─── Action buttons ────────────────────────────────────────────────────── */
	.cv-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.cv-btn {
		flex: 1;
		min-width: 160px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.9rem 1.25rem;
		border-radius: 8px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.cv-btn__icon { font-size: 0.75rem; }

	.cv-btn--grant {
		background: linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 200, 100, 0.08));
		border: 1px solid rgba(0, 255, 136, 0.45);
		color: #00ff88;
	}

	.cv-btn--grant:hover:not(:disabled) {
		background: linear-gradient(135deg, rgba(0, 255, 136, 0.22), rgba(0, 200, 100, 0.14));
		border-color: rgba(0, 255, 136, 0.7);
		box-shadow: 0 0 20px rgba(0, 255, 136, 0.18), 0 4px 16px rgba(0, 0, 0, 0.4);
		transform: translateY(-1px);
	}

	.cv-btn--deny {
		background: transparent;
		border: 1px solid rgba(255, 77, 106, 0.25);
		color: rgba(255, 77, 106, 0.6);
	}

	.cv-btn--deny:hover:not(:disabled) {
		background: rgba(255, 77, 106, 0.05);
		border-color: rgba(255, 77, 106, 0.45);
		color: rgba(255, 77, 106, 0.9);
	}

	.cv-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	.cv-audit-notice {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.64rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.22);
		letter-spacing: 0.02em;
	}

	/* ─── State screens ─────────────────────────────────────────────────────── */
	.cv-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1rem 0;
		text-align: center;
	}

	.cv-state__icon {
		font-size: 2.5rem;
		line-height: 1;
	}

	.cv-state__icon--success svg { width: 60px; height: 60px; filter: drop-shadow(0 0 12px rgba(0, 255, 136, 0.35)); }

	.cv-state__title {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.1rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #ffffff;
	}

	.cv-state__title--success { color: #00ff88; }

	.cv-state__body {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.5);
		max-width: 440px;
	}

	.cv-state__body--small { font-size: 0.75rem; color: rgba(255, 255, 255, 0.35); }

	.cv-state--success { color: #00ff88; }
	.cv-state--error .cv-state__icon { color: rgba(255, 240, 94, 0.7); }
	.cv-state--loading .cv-state__title { color: rgba(255, 255, 255, 0.6); }

	.cv-state__spinner {
		width: 32px;
		height: 32px;
		border: 2.5px solid rgba(0, 240, 255, 0.2);
		border-top-color: #00f0ff;
		border-radius: 50%;
		animation: spin 0.75s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	.cv-confirmation-strip {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 6px;
		max-width: 440px;
	}

	.cv-confirmation-strip__text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.25);
	}

	/* ─── Footer ────────────────────────────────────────────────────────────── */
	.cv-footer { text-align: center; }

	.cv-footer__text {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.15);
		letter-spacing: 0.04em;
	}
</style>
