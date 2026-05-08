<script lang="ts">
	/**
	 * Credential Recovery Terminal
	 * ─────────────────────────────
	 * Minimalist "Stark Tech" password reset page.
	 * Route: /reset
	 *
	 * Phase machine:
	 *   idle → sending → sent → [auto-redirect to /login after 5s]
	 *                 ↘ error
	 *
	 * ZERO-TRUST:
	 * Firebase Auth sendPasswordResetEmail() never confirms whether an email
	 * exists — always shows the "Transmission Sent" state to prevent account
	 * enumeration attacks.
	 */

	import { auth } from '$lib/firebase.js';
	import { sendPasswordResetEmail } from 'firebase/auth';
	import { goto } from '$app/navigation';

	type Phase = 'idle' | 'sending' | 'sent' | 'error';

	let email   = $state('');
	let phase   = $state<Phase>('idle');
	let errorMsg = $state('');
	let countdown = $state(5);

	async function handleSubmit() {
		const trimmed = email.trim().toLowerCase();
		if (!trimmed || !trimmed.includes('@')) {
			errorMsg = 'Enter a valid email address.';
			return;
		}
		phase    = 'sending';
		errorMsg = '';

		try {
			await sendPasswordResetEmail(auth, trimmed);
			// Always transition to 'sent' — even if the email doesn't exist
			// (prevents account enumeration)
			phase = 'sent';
			startCountdown();
		} catch (err: unknown) {
			// Surface only safe, non-enumeration errors
			const code = (err as { code?: string }).code ?? '';
			if (code === 'auth/invalid-email') {
				errorMsg = 'Invalid email format. Check and try again.';
			} else if (code === 'auth/too-many-requests') {
				errorMsg = 'Too many requests. Wait a moment before retrying.';
			} else {
				// Swallow other errors — treat as success to prevent enumeration
				phase = 'sent';
				startCountdown();
				return;
			}
			phase = 'error';
		}
	}

	function startCountdown() {
		const timer = setInterval(() => {
			countdown -= 1;
			if (countdown <= 0) {
				clearInterval(timer);
				goto('/login');
			}
		}, 1000);
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && phase === 'idle' || phase === 'error') handleSubmit();
	}
</script>

<svelte:head>
	<title>CREDENTIAL RECOVERY · Vanguard Nexus</title>
</svelte:head>

<div class="cr-stage">
	<!-- Ambient scanlines -->
	<div class="cr-scanlines" aria-hidden="true"></div>

	<div class="cr-terminal">

		<!-- Header -->
		<div class="cr-header">
			<div class="cr-header-dot" class:cr-header-dot--sent={phase === 'sent'}></div>
			<div>
				<div class="cr-header-title">CREDENTIAL RECOVERY PROTOCOL</div>
				<div class="cr-header-sub">VANGUARD NEXUS · IDENTITY SERVICES</div>
			</div>
		</div>

		{#if phase === 'sent'}
			<!-- ── TRANSMISSION SENT STATE ─────────────────────────────────── -->
			<div class="cr-sent">
				<div class="cr-sent-icon" aria-hidden="true">⊛</div>
				<div class="cr-sent-title">TRANSMISSION SENT</div>
				<p class="cr-sent-body">
					A recovery uplink has been dispatched to your registered comms address.
					Check your inbox (and spam folder) for instructions.
				</p>
				<p class="cr-sent-body" style="opacity: 0.5;">
					No email exists? No message will arrive — verify the address and retry.
				</p>

				<!-- Countdown redirect bar -->
				<div class="cr-redirect">
					<div class="cr-redirect-label">
						RETURNING TO LOGIN PORTAL IN <span class="cr-redirect-count">{countdown}s</span>
					</div>
					<div class="cr-redirect-bar">
						<div
							class="cr-redirect-progress"
							style="width: {(countdown / 5) * 100}%"
						></div>
					</div>
				</div>

				<a href="/login" class="cr-back-link">← SKIP COUNTDOWN · RETURN NOW</a>
			</div>

		{:else}
			<!-- ── INPUT STATE (idle / sending / error) ───────────────────── -->
			<div class="cr-form-area">
				<p class="cr-desc">
					Enter your registered email address. A secure reset uplink will be
					transmitted to that address if it matches a Vanguard account.
				</p>

				<label class="cr-label" for="cr-email">REGISTERED EMAIL</label>
				<div class="cr-input-row">
					<span class="cr-input-prefix" aria-hidden="true">⟩</span>
					<input
						id="cr-email"
						class="cr-input"
						type="email"
						inputmode="email"
						autocomplete="email"
						autocapitalize="none"
						spellcheck="false"
						placeholder="operative@squad.app"
						bind:value={email}
						onkeydown={handleKey}
						disabled={phase === 'sending'}
						aria-describedby={errorMsg ? 'cr-error' : undefined}
					/>
				</div>

				{#if errorMsg}
					<div class="cr-error" id="cr-error" role="alert">
						<span aria-hidden="true">⚠</span> {errorMsg}
					</div>
				{/if}

				<button
					class="cr-submit"
					type="button"
					onclick={handleSubmit}
					disabled={phase === 'sending'}
					aria-busy={phase === 'sending'}
				>
					{#if phase === 'sending'}
						<span class="cr-submit-dots" aria-hidden="true">
							<span>·</span><span>·</span><span>·</span>
						</span>
						TRANSMITTING…
					{:else}
						[ TRANSMIT RECOVERY UPLINK ]
					{/if}
				</button>

				<div class="cr-footer-links">
					<a href="/login" class="cr-link">← BACK TO LOGIN PORTAL</a>
				</div>
			</div>
		{/if}

	</div>
</div>

<style>
	/* ── Stage ─────────────────────────────────────────────────────────────── */
	.cr-stage {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 20px;
		background:
			radial-gradient(ellipse 100% 60% at 50% 0%, rgba(0, 255, 255, 0.05), transparent 55%),
			#000810;
		font-family: 'JetBrains Mono', 'Space Mono', ui-monospace, monospace;
		color: #e2e8f0;
		overflow: hidden;
		min-height: 100vh;
		min-height: 100dvh;
	}

	.cr-scanlines {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			to bottom, transparent 0px, transparent 2px,
			rgba(0, 0, 0, 0.08) 2px, rgba(0, 0, 0, 0.08) 4px
		);
		pointer-events: none;
		z-index: 0;
	}

	/* ── Terminal card ─────────────────────────────────────────────────────── */
	.cr-terminal {
		position: relative;
		z-index: 1;
		width: min(440px, 100%);
		background: rgba(0, 8, 20, 0.95);
		border: 1px solid rgba(0, 255, 255, 0.18);
		border-radius: 4px;
		box-shadow:
			0 0 60px rgba(0, 255, 255, 0.04),
			0 40px 100px -20px rgba(0, 0, 0, 0.9);
		overflow: hidden;
	}

	/* ── Header ────────────────────────────────────────────────────────────── */
	.cr-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 20px 12px;
		background: rgba(0, 255, 255, 0.03);
		border-bottom: 1px solid rgba(0, 255, 255, 0.1);
	}
	.cr-header-dot {
		width: 8px; height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		background: rgba(0, 255, 255, 0.4);
		animation: cr-dot 2.5s ease-in-out infinite;
	}
	.cr-header-dot--sent {
		background: #4ade80;
		box-shadow: 0 0 10px #4ade80;
		animation: none;
	}
	@keyframes cr-dot {
		0%, 100% { opacity: 0.4; box-shadow: none; }
		50%       { opacity: 1;   box-shadow: 0 0 8px rgba(0, 255, 255, 0.6); }
	}
	.cr-header-title {
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(0, 255, 255, 0.8);
	}
	.cr-header-sub {
		font-size: 7px;
		letter-spacing: 0.1em;
		color: rgba(0, 255, 255, 0.25);
		margin-top: 2px;
	}

	/* ── Form area ─────────────────────────────────────────────────────────── */
	.cr-form-area { padding: 20px 22px; }

	.cr-desc {
		font-size: 10px;
		color: rgba(0, 255, 255, 0.35);
		line-height: 1.6;
		margin: 0 0 18px;
	}

	.cr-label {
		display: block;
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(0, 255, 255, 0.5);
		margin-bottom: 6px;
	}

	.cr-input-row {
		display: flex;
		align-items: center;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(0, 255, 255, 0.18);
		border-radius: 2px;
		transition: border-color 0.15s;
		margin-bottom: 12px;
	}
	.cr-input-row:focus-within {
		border-color: rgba(0, 255, 255, 0.45);
		box-shadow: 0 0 0 1px rgba(0, 255, 255, 0.12);
	}
	.cr-input-prefix {
		padding: 0 10px;
		font-size: 13px;
		color: rgba(0, 255, 255, 0.3);
		flex-shrink: 0;
		user-select: none;
	}
	.cr-input {
		flex: 1;
		padding: 10px 12px 10px 0;
		font-family: inherit;
		font-size: 11px;
		background: transparent;
		border: none;
		outline: none;
		color: rgba(0, 255, 255, 0.85);
		caret-color: #00ffff;
		min-width: 0;
	}
	.cr-input::placeholder { color: rgba(0, 255, 255, 0.18); }
	.cr-input:disabled { opacity: 0.5; }

	.cr-error {
		font-size: 9px;
		color: #f87171;
		padding: 6px 10px;
		background: rgba(239, 68, 68, 0.06);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 2px;
		margin-bottom: 12px;
		display: flex;
		gap: 6px;
		align-items: center;
	}

	/* ── Submit button ─────────────────────────────────────────────────────── */
	.cr-submit {
		width: 100%;
		padding: 11px;
		font-family: inherit;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: #00ffff;
		background: rgba(0, 255, 255, 0.08);
		border: 1px solid rgba(0, 255, 255, 0.4);
		border-radius: 2px;
		cursor: pointer;
		transition: background 0.15s, box-shadow 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 42px;
	}
	.cr-submit:hover:not(:disabled) {
		background: rgba(0, 255, 255, 0.16);
		box-shadow: 0 0 18px rgba(0, 255, 255, 0.18);
	}
	.cr-submit:disabled { opacity: 0.4; cursor: not-allowed; }

	/* Transmitting dots animation */
	.cr-submit-dots span {
		opacity: 0;
		animation: cr-dots 1.2s ease-in-out infinite;
	}
	.cr-submit-dots span:nth-child(2) { animation-delay: 0.2s; }
	.cr-submit-dots span:nth-child(3) { animation-delay: 0.4s; }
	@keyframes cr-dots {
		0%, 100% { opacity: 0; }
		50%       { opacity: 1; }
	}

	.cr-footer-links { margin-top: 16px; text-align: center; }
	.cr-link {
		font-size: 8px;
		letter-spacing: 0.14em;
		color: rgba(0, 255, 255, 0.3);
		text-decoration: none;
		transition: color 0.15s;
	}
	.cr-link:hover { color: rgba(0, 255, 255, 0.7); }

	/* ── Sent state ────────────────────────────────────────────────────────── */
	.cr-sent {
		padding: 28px 22px 22px;
		text-align: center;
	}
	.cr-sent-icon {
		font-size: 2.2rem;
		color: #4ade80;
		text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
		margin-bottom: 12px;
		animation: cr-sent-pulse 2s ease-in-out infinite;
	}
	@keyframes cr-sent-pulse {
		0%, 100% { opacity: 0.8; }
		50%       { opacity: 1; text-shadow: 0 0 30px rgba(74, 222, 128, 0.7); }
	}
	.cr-sent-title {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.25em;
		color: #4ade80;
		margin-bottom: 12px;
	}
	.cr-sent-body {
		font-size: 10px;
		color: rgba(0, 255, 255, 0.4);
		line-height: 1.6;
		margin: 0 0 8px;
	}

	.cr-redirect { margin: 18px 0 14px; }
	.cr-redirect-label {
		font-size: 8px;
		letter-spacing: 0.14em;
		color: rgba(0, 255, 255, 0.3);
		margin-bottom: 6px;
		text-align: center;
	}
	.cr-redirect-count { color: #00ffff; font-weight: 700; }
	.cr-redirect-bar {
		height: 2px;
		background: rgba(0, 255, 255, 0.08);
		border-radius: 1px;
		overflow: hidden;
	}
	.cr-redirect-progress {
		height: 100%;
		background: rgba(0, 255, 255, 0.5);
		box-shadow: 0 0 6px rgba(0, 255, 255, 0.4);
		transition: width 1s linear;
	}

	.cr-back-link {
		display: inline-block;
		margin-top: 4px;
		font-size: 8px;
		letter-spacing: 0.14em;
		color: rgba(0, 255, 255, 0.25);
		text-decoration: none;
		transition: color 0.15s;
	}
	.cr-back-link:hover { color: rgba(0, 255, 255, 0.6); }
</style>
