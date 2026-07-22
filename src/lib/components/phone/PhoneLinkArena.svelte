<script lang="ts">
	/**
	 * PhoneLinkArena.svelte
	 * ──────────────────────
	 * Phase 2, Epic 3 — Native Firebase Phone Number Verification.
	 *
	 * Glass layer (Vanguard Trinity pattern).
	 * Two-step neon-cyan glassmorphism panel:
	 *   Step 1 — phone number input (E.164 preview, country prefix, send button)
	 *   Step 2 — 6-digit code input (autocomplete="one-time-code", Web OTP auto-fill)
	 *
	 * Props:
	 *   engine          PhoneLinkEngine instance (Brain)
	 *   onSendCode      called with (phoneE164) when user submits step 1
	 *   onConfirmCode   called with (code) when user submits step 2
	 *   onReset         called when user clicks "Change number"
	 */

	import type { PhoneLinkEngine, PhoneLinkState } from './PhoneLinkEngine.svelte.js';
	import { prefixAndNationalToE164 } from '$lib/utils/phoneUtils.js';

	const {
		engine,
		onSendCode,
		onConfirmCode,
		onReset,
	}: {
		engine: PhoneLinkEngine;
		onSendCode: (phoneE164: string) => void;
		onConfirmCode: (code: string) => void;
		onReset: () => void;
	} = $props();

	// ── Local form state ──────────────────────────────────────────────────────

	let rawPhone   = $state('');
	let countryCode = $state('+1');
	let codeDigits = $state('');

	// E.164 preview — validated via libphonenumber-js
	const e164Preview = $derived(() => prefixAndNationalToE164(countryCode, rawPhone) ?? '');
	const phoneValid  = $derived(e164Preview().length > 0);
	const codeValid  = $derived(/^\d{6}$/.test(codeDigits));

	const engineState = $derived(engine.state);
	const isBusy = $derived(
		engineState === 'sending_code' || engineState === 'verifying',
	);

	// Step discriminator
	const onStep2 = $derived(
		engineState === 'awaiting_code' ||
		engineState === 'verifying' ||
		engineState === 'wrong_code' ||
		engineState === 'code_expired',
	);

	// Start Web OTP API listener whenever we enter awaiting_code.
	$effect(() => {
		if (engineState === 'awaiting_code') {
			engine.startWebOtpListener();
		}
	});

	// ── State → display config ────────────────────────────────────────────────

	type StateMeta = { color: string; icon: string; message: string };
	const STATE_META = $derived({
		invalid_phone:  { color: 'red',   icon: '⚠', message: 'Invalid phone number. Check the format and try again.' },
		quota_exceeded: { color: 'amber', icon: '⏱', message: 'Too many attempts. Please wait a few minutes before retrying.' },
		code_expired:   { color: 'amber', icon: '⏱', message: 'Code expired. Request a new one.' },
		wrong_code:     { color: 'red',   icon: '⚠', message: 'Incorrect code. Check your SMS and try again.' },
		already_linked: { color: 'amber', icon: '🔒', message: 'A phone number is already linked to this account.' },
		error:          { color: 'red',   icon: '💥', message: engine.errorMessage || 'An unexpected error occurred.' },
		success:        { color: 'green', icon: '✅', message: `Verified · ${engine.verifiedPhone.slice(-4) ? '···· ' + engine.verifiedPhone.slice(-4) : ''}` },
	});

	const meta = $derived(STATE_META[engineState]);

	const colorVars: Record<string, string> = {
		red:   '255,77,106',
		amber: '240,199,94',
		green: '0,230,130',
		cyan:  '0,240,255',
	};
	const accentRgb = $derived(meta ? colorVars[meta.color] : colorVars.cyan);

	// Popular country codes
	const COUNTRY_CODES = [
		{ code: '+1',  label: '🇺🇸 +1' },
		{ code: '+44', label: '🇬🇧 +44' },
		{ code: '+52', label: '🇲🇽 +52' },
		{ code: '+55', label: '🇧🇷 +55' },
		{ code: '+61', label: '🇦🇺 +61' },
		{ code: '+49', label: '🇩🇪 +49' },
		{ code: '+33', label: '🇫🇷 +33' },
		{ code: '+81', label: '🇯🇵 +81' },
		{ code: '+82', label: '🇰🇷 +82' },
		{ code: '+91', label: '🇮🇳 +91' },
	];

	// ── Handlers ──────────────────────────────────────────────────────────────

	function handleSend(e: SubmitEvent) {
		e.preventDefault();
		const e164 = e164Preview();
		if (!phoneValid || isBusy) return;
		onSendCode(e164);
	}

	function handleConfirm(e: SubmitEvent) {
		e.preventDefault();
		if (!codeValid || isBusy) return;
		onConfirmCode(codeDigits);
	}
</script>

<!-- Invisible reCAPTCHA container — must exist in the DOM before the engine calls
     createInvisibleRecaptcha().  Zero visible footprint. -->
<div id="phone-recaptcha" style="display:none" aria-hidden="true"></div>

<div class="arena" style="--accent: {accentRgb}">
	<div class="card">

		<!-- ── Header ─────────────────────────────────────────────────────── -->
		<div class="card-header">
			<span class="badge">PHONE VERIFICATION</span>
			<p class="subtitle">CARRIER-VERIFIED · SINGLE-USE CODE</p>
		</div>

		<!-- ── Success ────────────────────────────────────────────────────── -->
		{#if engineState === 'success'}
			<div class="success-block">
				<span class="big-icon">✅</span>
				<p class="success-msg">Phone verified</p>
				<p class="success-sub">
					Your number ending in <span class="mono">{engine.verifiedPhone.slice(-4)}</span>
					is now linked to your account.
				</p>
			</div>

		<!-- ── Already linked ─────────────────────────────────────────────── -->
		{:else if engineState === 'already_linked'}
			<div class="status-block">
				<span class="big-icon">🔒</span>
				<p class="status-msg" style="color: rgb(240,199,94)">A phone is already linked.</p>
				<p class="status-sub">Use the account settings page to unlink it first.</p>
			</div>

		<!-- ── Step 1: Phone input ─────────────────────────────────────────── -->
		{:else if !onStep2}
			<form class="step" onsubmit={handleSend} novalidate>
				<p class="step-label">STEP 1 OF 2 — ENTER YOUR MOBILE NUMBER</p>

				<div class="phone-row">
					<select class="country-select" bind:value={countryCode} disabled={isBusy}>
						{#each COUNTRY_CODES as cc (cc.code)}
							<option value={cc.code}>{cc.label}</option>
						{/each}
					</select>
					<input
						class="phone-input"
						type="tel"
						inputmode="tel"
						placeholder="(555) 555-0123"
						bind:value={rawPhone}
						disabled={isBusy}
						autocomplete="tel-national"
						spellcheck="false"
					/>
				</div>

				{#if e164Preview()}
					<p class="e164-preview">
						<span class="mono">{e164Preview()}</span>
						{#if phoneValid}
							<span class="valid-check" aria-label="Valid format">✓</span>
						{/if}
					</p>
				{/if}

				{#if meta}
					<div class="state-banner" style="--banner: {accentRgb}">
						<span>{meta.icon}</span>
						<span>{meta.message}</span>
					</div>
				{/if}

				<button class="submit-btn" type="submit" disabled={!phoneValid || isBusy} aria-busy={isBusy}>
					{#if isBusy}
						<span class="spin" aria-hidden="true">⟳</span> SENDING…
					{:else}
						⚡ SEND VERIFICATION CODE
					{/if}
				</button>
			</form>

		<!-- ── Step 2: Code input ──────────────────────────────────────────── -->
		{:else}
			<form class="step" onsubmit={handleConfirm} novalidate>
				<p class="step-label">STEP 2 OF 2 — ENTER THE 6-DIGIT CODE</p>
				<p class="sent-hint">
					Code sent to <span class="mono">{engine.sentToPhone.slice(0, -4).replace(/./g, '·')}{engine.sentToPhone.slice(-4)}</span>
				</p>

				<input
					class="code-input"
					type="text"
					inputmode="numeric"
					maxlength="6"
					placeholder="123456"
					autocomplete="one-time-code"
					bind:value={codeDigits}
					disabled={engineState === 'verifying'}
					spellcheck="false"
				/>

				{#if meta && engineState !== 'awaiting_code'}
					<div class="state-banner" style="--banner: {accentRgb}">
						<span>{meta.icon}</span>
						<span>{meta.message}</span>
					</div>
				{/if}

				<div class="code-actions">
					<button class="submit-btn" type="submit" disabled={!codeValid || engineState === 'verifying'} aria-busy={engineState === 'verifying'}>
						{#if engineState === 'verifying'}
							<span class="spin" aria-hidden="true">⟳</span> VERIFYING…
						{:else}
							✓ VERIFY CODE
						{/if}
					</button>
					<button type="button" class="ghost-btn" onclick={onReset} disabled={engineState === 'verifying'}>
						Change number
					</button>
				</div>
			</form>
		{/if}

	</div>
</div>

<style>
	.arena {
		--accent: 0,240,255;
		width: 100%;
	}

	.card {
		background: rgba(8,10,18,0.85);
		border: 1px solid rgba(var(--accent), 0.22);
		border-radius: 24px;
		padding: clamp(24px, 5vw, 40px);
		backdrop-filter: blur(20px);
		box-shadow:
			0 0 0 1px rgba(var(--accent), 0.06),
			0 8px 32px rgba(0,0,0,0.55),
			0 0 60px rgba(var(--accent), 0.03);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
	}

	/* ── Header ── */
	.card-header { display: flex; flex-direction: column; gap: 3px; }
	.badge {
		display: inline-block;
		width: fit-content;
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(var(--accent), 0.9);
		background: rgba(var(--accent), 0.08);
		border: 1px solid rgba(var(--accent), 0.25);
		border-radius: 4px;
		padding: 2px 8px;
	}
	.subtitle {
		margin: 0;
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: rgba(255,255,255,0.22);
		text-transform: uppercase;
	}

	/* ── Step ── */
	.step {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	.step-label {
		margin: 0;
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		color: rgba(var(--accent), 0.45);
		text-transform: uppercase;
	}

	/* ── Phone row ── */
	.phone-row {
		display: flex;
		gap: 0.5rem;
	}
	.country-select {
		background: #010409;
		border: 1px solid rgba(var(--accent), 0.22);
		border-radius: 8px;
		color: #e5e7eb;
		font-family: inherit;
		font-size: 0.75rem;
		padding: 0.65rem 0.5rem;
		outline: none;
		cursor: pointer;
		min-width: 88px;
		transition: border-color 0.18s;
		appearance: none;
	}
	.country-select:focus {
		border-color: rgba(var(--accent), 0.55);
	}
	.phone-input, .code-input {
		background: #010409;
		border: 1px solid rgba(var(--accent), 0.22);
		border-radius: 8px;
		color: #e5e7eb;
		font-family: inherit;
		font-size: 0.85rem;
		padding: 0.65rem 0.85rem;
		outline: none;
		width: 100%;
		box-sizing: border-box;
		transition: border-color 0.18s, box-shadow 0.18s;
	}
	.phone-input:focus, .code-input:focus {
		border-color: rgba(var(--accent), 0.55);
		box-shadow: 0 0 0 1px rgba(var(--accent), 0.18);
	}
	.code-input {
		font-size: 1.4rem;
		letter-spacing: 0.4em;
		text-align: center;
	}

	.e164-preview {
		margin: -0.25rem 0 0;
		font-size: 0.62rem;
		color: rgba(var(--accent), 0.55);
		letter-spacing: 0.08em;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.valid-check {
		color: rgba(0,230,130,0.85);
		font-size: 0.7rem;
	}

	.sent-hint {
		margin: 0;
		font-size: 0.65rem;
		color: rgba(255,255,255,0.3);
		letter-spacing: 0.06em;
	}

	/* ── State banner ── */
	.state-banner {
		--banner: var(--accent);
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.6rem 0.85rem;
		background: rgba(var(--banner), 0.05);
		border: 1px solid rgba(var(--banner), 0.22);
		border-radius: 8px;
		font-size: 0.65rem;
		color: rgba(var(--banner), 0.85);
		letter-spacing: 0.04em;
	}

	/* ── Buttons ── */
	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.85rem 1.5rem;
		width: 100%;
		font-family: inherit;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgb(var(--accent));
		background: rgba(var(--accent), 0.07);
		border: 1px solid rgba(var(--accent), 0.4);
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.18s, border-color 0.18s;
	}
	.submit-btn:hover:not(:disabled) {
		background: rgba(var(--accent), 0.14);
		border-color: rgba(var(--accent), 0.65);
	}
	.submit-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.code-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ghost-btn {
		background: none;
		border: none;
		font-family: inherit;
		font-size: 0.62rem;
		color: rgba(255,255,255,0.25);
		cursor: pointer;
		text-align: center;
		letter-spacing: 0.06em;
		padding: 0.2rem;
		transition: color 0.15s;
	}
	.ghost-btn:hover:not(:disabled) {
		color: rgba(var(--accent), 0.6);
	}
	.ghost-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	/* ── Success / status ── */
	.success-block, .status-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 0;
		text-align: center;
	}
	.big-icon { font-size: 2.5rem; }
	.success-msg, .status-msg {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 700;
		color: rgba(0,230,130,0.9);
		letter-spacing: 0.04em;
	}
	.success-sub, .status-sub {
		margin: 0;
		font-size: 0.65rem;
		color: rgba(255,255,255,0.3);
		letter-spacing: 0.06em;
	}

	.mono { font-family: inherit; letter-spacing: 0.08em; }

	/* Spinner */
	.spin { display: inline-block; animation: spin 0.75s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
