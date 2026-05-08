<script lang="ts">
	/**
	 * ConsentOverlay.svelte
	 * ─────────────────────
	 * COPPA 2026 / Privacy Shield — Parental Consent Gate
	 *
	 * Rendered by the (app)/+layout.svelte when authStore.requiresConsent
	 * is true (player is a minor whose coppaStatus !== 'granted').
	 *
	 * This component COVERS the entire PlayerShell with a Zero-Trust overlay.
	 * The child can only interact with the "Enter Parent Email" form.
	 * ALL other app functionality is locked until a parent grants consent.
	 *
	 * Security invariant:
	 *   This component never writes coppaStatus.  It only triggers the
	 *   `sendParentalConsentEmail` Cloud Function, which:
	 *     1. Generates a 32-char token
	 *     2. Writes consent_tokens/{token} (server-side)
	 *     3. Sends the email via Firebase Trigger Email Extension
	 *     4. Logs to consent_logs (server-side)
	 *   The verifyParentalConsent CF is the ONLY write path for coppaStatus.
	 */

	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import type { SendConsentEmailInput } from '$lib/types/coppa.js';

	// ── State ──────────────────────────────────────────────────────────────────
	type Phase = 'idle' | 'sending' | 'sent' | 'error' | 'already_granted';

	let phase = $state<Phase>('idle');
	let parentEmail = $state('');
	let errorMsg = $state('');
	let sentToEmail = $state('');
	let resendCountdown = $state(0);

	// Derive player display name from auth profile
	const playerName = $derived(
		(authStore.userProfile as Record<string, unknown> | null)?.playerName as string | undefined ??
		authStore.user?.displayName ??
		'your account',
	);

	const functions = getFunctions();
	const sendConsentEmailFn = httpsCallable<SendConsentEmailInput, { success: boolean; resent?: boolean }>(
		functions,
		'sendParentalConsentEmail',
	);

	// ── Handlers ───────────────────────────────────────────────────────────────

	function isValidEmail(email: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
	}

	let resendTimer: ReturnType<typeof setInterval> | null = null;

	function startResendCountdown() {
		resendCountdown = 60;
		resendTimer = setInterval(() => {
			resendCountdown -= 1;
			if (resendCountdown <= 0 && resendTimer) {
				clearInterval(resendTimer);
				resendTimer = null;
			}
		}, 1000);
	}

	async function handleRequestConsent() {
		if (!isValidEmail(parentEmail)) {
			errorMsg = 'Please enter a valid parent / guardian email address.';
			return;
		}
		phase = 'sending';
		errorMsg = '';

		try {
			await sendConsentEmailFn({ parentEmail: parentEmail.trim().toLowerCase() });
			sentToEmail = parentEmail.trim().toLowerCase();
			phase = 'sent';
			startResendCountdown();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('already-exists') || msg.includes('already-sent')) {
				sentToEmail = parentEmail.trim().toLowerCase();
				phase = 'sent';
				startResendCountdown();
			} else {
				errorMsg = msg || 'Failed to send consent email. Please try again.';
				phase = 'error';
			}
		}
	}

	async function handleResend() {
		if (resendCountdown > 0) return;
		phase = 'sending';
		try {
			await sendConsentEmailFn({ parentEmail: sentToEmail });
			phase = 'sent';
			startResendCountdown();
		} catch {
			phase = 'sent'; // keep in sent phase even on resend error — email was already sent
		}
	}
</script>

<!-- ─── Root ─────────────────────────────────────────────────────────────── -->
<div class="co-root" role="dialog" aria-modal="true" aria-labelledby="co-title">
	<!-- Animated scan-line background -->
	<div class="co-scanlines" aria-hidden="true"></div>
	<div class="co-grid-bg" aria-hidden="true"></div>

	<!-- Core panel -->
	<div class="co-panel">

		<!-- ── Shield badge ──────────────────────────────────────────────── -->
		<div class="co-badge" aria-hidden="true">
			<svg viewBox="0 0 48 48" fill="none" class="co-badge__svg">
				<path d="M24 4L6 12v12c0 9.94 7.64 19.24 18 21 10.36-1.76 18-11.06 18-21V12L24 4z"
					stroke="#00f0ff" stroke-width="1.5" fill="rgba(0,240,255,0.08)" />
				<text x="24" y="29" text-anchor="middle" font-size="14" fill="#00f0ff"
					font-family="monospace" font-weight="900">⚠</text>
			</svg>
		</div>

		<!-- ── Header ────────────────────────────────────────────────────── -->
		<div class="co-header">
			<p class="co-eyebrow">COPPA COMPLIANCE · PRIVACY SHIELD 2026</p>
			<h1 class="co-title" id="co-title">PARENTAL CONSENT REQUIRED</h1>
			<p class="co-subtitle">
				Your account has been identified as belonging to a player under 13.
				A parent or guardian must grant consent before you can access
				<span class="co-accent">VANGUARD</span>.
			</p>
		</div>

		<!-- ── Legal notice strip ────────────────────────────────────────── -->
		<div class="co-legal-strip">
			<p class="co-legal-text">
				Under the Children's Online Privacy Protection Act (COPPA), we are required
				to obtain verifiable parental consent before collecting or using personal
				information from children under 13. Your data is protected and will not
				be shared with third parties.
			</p>
		</div>

		<!-- ── PHASE: idle / error ────────────────────────────────────────── -->
		{#if phase === 'idle' || phase === 'error' || phase === 'sending'}
			<form class="co-form" onsubmit={(e) => { e.preventDefault(); handleRequestConsent(); }}>
				<div class="co-form__field">
					<label class="co-form__label" for="co-parent-email">
						PARENT / GUARDIAN EMAIL
					</label>
					<div class="co-form__input-wrap">
						<span class="co-form__input-icon" aria-hidden="true">✉</span>
						<input
							id="co-parent-email"
							class="co-form__input"
							type="email"
							placeholder="parent@example.com"
							bind:value={parentEmail}
							disabled={phase === 'sending'}
							autocomplete="email"
							aria-describedby={errorMsg ? 'co-error-msg' : undefined}
						/>
					</div>
					{#if errorMsg}
						<p class="co-form__error" id="co-error-msg" role="alert">{errorMsg}</p>
					{/if}
				</div>

				<button
					class="co-submit-btn"
					type="submit"
					disabled={phase === 'sending' || !parentEmail.trim()}
				>
					{#if phase === 'sending'}
						<span class="co-submit-btn__spinner" aria-hidden="true"></span>
						TRANSMITTING...
					{:else}
						<span class="co-submit-btn__icon" aria-hidden="true">▶</span>
						REQUEST PARENTAL CONSENT
					{/if}
				</button>
			</form>
		{/if}

		<!-- ── PHASE: sent ────────────────────────────────────────────────── -->
		{#if phase === 'sent'}
			<div class="co-sent-state">
				<div class="co-sent-icon" aria-hidden="true">
					<svg viewBox="0 0 48 48" fill="none">
						<circle cx="24" cy="24" r="20" stroke="#00ff88" stroke-width="1.5"
							fill="rgba(0,255,136,0.06)" />
						<path d="M14 24l7 7 13-13" stroke="#00ff88" stroke-width="2"
							stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
				<h2 class="co-sent-title">TRANSMISSION COMPLETE</h2>
				<p class="co-sent-body">
					A consent request has been sent to
					<strong class="co-sent-email">{sentToEmail}</strong>.
				</p>
				<p class="co-sent-body">
					Ask your parent or guardian to check their inbox and click the
					verification link. This page will unlock automatically once they grant
					consent.
				</p>

				<div class="co-sent-steps">
					<div class="co-step">
						<span class="co-step__num">01</span>
						<span class="co-step__text">Parent checks email inbox</span>
					</div>
					<div class="co-step">
						<span class="co-step__num">02</span>
						<span class="co-step__text">Parent clicks the verification link</span>
					</div>
					<div class="co-step">
						<span class="co-step__num">03</span>
						<span class="co-step__text">This screen unlocks automatically</span>
					</div>
				</div>

				<button
					class="co-resend-btn"
					onclick={handleResend}
					disabled={resendCountdown > 0}
				>
					{#if resendCountdown > 0}
						RESEND IN {resendCountdown}s
					{:else}
						↩ RESEND EMAIL
					{/if}
				</button>
			</div>
		{/if}

		<!-- ── Footer ────────────────────────────────────────────────────── -->
		<footer class="co-footer">
			<span class="co-footer__lock" aria-hidden="true">🔒</span>
			<p class="co-footer__text">
				Signed in as <strong>{authStore.user?.email ?? playerName}</strong> ·
				<span class="co-footer__policy">
					All consent events are logged with a tamper-evident audit trail.
				</span>
			</p>
		</footer>

	</div>
</div>

<style>
	/* ─── Root ──────────────────────────────────────────────────────────────── */
	.co-root {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(2, 2, 8, 0.97);
		backdrop-filter: blur(24px) saturate(160%);
		padding: 1rem;
		overflow-y: auto;
	}

	.co-scanlines {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 2px,
			rgba(0, 240, 255, 0.018) 2px,
			rgba(0, 240, 255, 0.018) 4px
		);
		z-index: 0;
	}

	.co-grid-bg {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background-image:
			linear-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 240, 255, 0.04) 1px, transparent 1px);
		background-size: 48px 48px;
		z-index: 0;
	}

	/* ─── Panel ─────────────────────────────────────────────────────────────── */
	.co-panel {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 520px;
		background: rgba(8, 10, 18, 0.92);
		border: 1px solid rgba(0, 240, 255, 0.18);
		border-radius: 16px;
		box-shadow:
			0 0 60px rgba(0, 240, 255, 0.08),
			0 0 120px rgba(0, 0, 0, 0.9),
			inset 0 1px 0 rgba(0, 240, 255, 0.12);
		padding: 2.5rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	/* ─── Badge ─────────────────────────────────────────────────────────────── */
	.co-badge {
		display: flex;
		justify-content: center;
	}

	.co-badge__svg {
		width: 56px;
		height: 56px;
		filter: drop-shadow(0 0 12px rgba(0, 240, 255, 0.4));
		animation: badgePulse 3s ease-in-out infinite;
	}

	@keyframes badgePulse {
		0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 10px rgba(0, 240, 255, 0.35)); }
		50%       { opacity: 1;    filter: drop-shadow(0 0 20px rgba(0, 240, 255, 0.7)); }
	}

	/* ─── Header ────────────────────────────────────────────────────────────── */
	.co-eyebrow {
		margin: 0 0 0.4rem;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(0, 240, 255, 0.5);
		text-align: center;
	}

	.co-title {
		margin: 0 0 0.75rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.2rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: #ffffff;
		text-align: center;
		text-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
	}

	.co-subtitle {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.55);
		text-align: center;
	}

	.co-accent {
		color: #00f0ff;
		font-weight: 700;
	}

	/* ─── Legal strip ───────────────────────────────────────────────────────── */
	.co-legal-strip {
		background: rgba(0, 240, 255, 0.04);
		border: 1px solid rgba(0, 240, 255, 0.1);
		border-radius: 8px;
		padding: 0.875rem 1rem;
	}

	.co-legal-text {
		margin: 0;
		font-size: 0.72rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.4);
		font-family: 'JetBrains Mono', monospace;
	}

	/* ─── Form ──────────────────────────────────────────────────────────────── */
	.co-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.co-form__field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.co-form__label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: rgba(0, 240, 255, 0.65);
	}

	.co-form__input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.co-form__input-icon {
		position: absolute;
		left: 0.85rem;
		font-size: 0.8rem;
		color: rgba(0, 240, 255, 0.35);
		pointer-events: none;
	}

	.co-form__input {
		width: 100%;
		padding: 0.75rem 0.875rem 0.75rem 2.2rem;
		background: rgba(0, 240, 255, 0.04);
		border: 1px solid rgba(0, 240, 255, 0.2);
		border-radius: 8px;
		color: #ffffff;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
		outline: none;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.co-form__input::placeholder {
		color: rgba(255, 255, 255, 0.2);
	}

	.co-form__input:focus {
		border-color: rgba(0, 240, 255, 0.6);
		box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.08), 0 0 16px rgba(0, 240, 255, 0.1);
	}

	.co-form__input:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.co-form__error {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.68rem;
		color: #ff4d6a;
		letter-spacing: 0.04em;
	}

	/* ─── Submit button ─────────────────────────────────────────────────────── */
	.co-submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		background: linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(0, 180, 255, 0.08));
		border: 1px solid rgba(0, 240, 255, 0.45);
		border-radius: 8px;
		color: #00f0ff;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		overflow: hidden;
	}

	.co-submit-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(0, 240, 255, 0.08), transparent);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.co-submit-btn:hover:not(:disabled)::before { opacity: 1; }

	.co-submit-btn:hover:not(:disabled) {
		border-color: rgba(0, 240, 255, 0.7);
		box-shadow: 0 0 20px rgba(0, 240, 255, 0.2), 0 4px 16px rgba(0, 0, 0, 0.4);
		transform: translateY(-1px);
	}

	.co-submit-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.co-submit-btn__icon { font-size: 0.7rem; }

	.co-submit-btn__spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(0, 240, 255, 0.3);
		border-top-color: #00f0ff;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	/* ─── Sent state ────────────────────────────────────────────────────────── */
	.co-sent-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
	}

	.co-sent-icon svg {
		width: 52px;
		height: 52px;
		filter: drop-shadow(0 0 12px rgba(0, 255, 136, 0.4));
	}

	.co-sent-title {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #00ff88;
	}

	.co-sent-body {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.55);
	}

	.co-sent-email {
		color: #00f0ff;
		font-weight: 700;
		font-family: 'JetBrains Mono', monospace;
	}

	.co-sent-steps {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		margin-top: 0.5rem;
	}

	.co-step {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.875rem;
		background: rgba(0, 255, 136, 0.04);
		border: 1px solid rgba(0, 255, 136, 0.12);
		border-radius: 6px;
		text-align: left;
	}

	.co-step__num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 900;
		color: rgba(0, 255, 136, 0.5);
		letter-spacing: 0.1em;
		flex-shrink: 0;
	}

	.co-step__text {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.55);
	}

	.co-resend-btn {
		margin-top: 0.5rem;
		padding: 0.5rem 1.25rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.4);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.68rem;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.2s;
	}

	.co-resend-btn:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.3);
		color: rgba(255, 255, 255, 0.7);
	}

	.co-resend-btn:disabled {
		cursor: default;
		opacity: 0.5;
	}

	/* ─── Footer ────────────────────────────────────────────────────────────── */
	.co-footer {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.co-footer__lock { font-size: 0.75rem; }

	.co-footer__text {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.25);
	}

	.co-footer__policy { display: block; }
</style>
