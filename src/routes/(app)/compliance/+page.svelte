<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';

	export const ssr = false;

	// ── Redirect if already cleared ─────────────────────────────────────────
	$effect(() => {
		if (authStore.isLoading) return;
		if (authStore.isCleared && browser) {
			untrack(() => goto('/coach', { replaceState: true }));
		}
	});

	// ── Uplink state ─────────────────────────────────────────────────────────
	/** @type {'idle' | 'connecting' | 'cleared' | 'error'} */
	let uplinkStatus = $state('idle');
	let uplinkError = $state('');

	const initiateAnkoredUplink = httpsCallable(functions, 'initiateAnkoredUplink');

	async function launchUplink() {
		if (uplinkStatus === 'connecting') return;
		uplinkStatus = 'connecting';
		uplinkError = '';
		try {
			await initiateAnkoredUplink({});
			uplinkStatus = 'cleared';
			// Redirect to coach dashboard after 2.5s
			if (browser) {
				setTimeout(() => goto('/coach', { replaceState: true }), 2500);
			}
		} catch (err) {
			uplinkStatus = 'error';
			uplinkError = /** @type {Error} */ (err).message ?? 'Uplink failed. Contact your Director.';
		}
	}
</script>

<svelte:head>
	<title>Ankored Compliance — Vanguard Protocol</title>
</svelte:head>

<div class="ct-root">
	<!-- ── Ambient grid ─────────────────────────────────────────────────────── -->
	<div class="ct-grid" aria-hidden="true"></div>

	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<header class="ct-header">
		<div class="ct-shield" aria-hidden="true">
			<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M32 4L8 14v18c0 14 11 26 24 28 13-2 24-14 24-28V14L32 4Z"
					stroke="currentColor"
					stroke-width="2.5"
					fill="none"
				/>
				<line x1="32" y1="22" x2="32" y2="34" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
				<circle cx="32" cy="41" r="2.5" fill="currentColor" />
			</svg>
		</div>
		<div class="ct-header__text">
			<div class="ct-badge">CLEARANCE PROTOCOL — ALPHA</div>
			<h1 class="ct-title">ACCESS RESTRICTED</h1>
			<p class="ct-subtitle">
				Your coaching credentials require compliance verification before War Room access is granted.
			</p>
		</div>
	</header>

	<!-- ── Identity strip ────────────────────────────────────────────────────── -->
	<div class="ct-strip">
		<span>UID: {authStore.user?.uid ?? '—'}</span>
		<span>ROLE: {authStore.role?.toUpperCase() ?? '—'}</span>
		<span>CLUB: {authStore.userProfile?.clubId ?? '—'}</span>
		<span>STATUS: {authStore.userProfile?.clearance?.status?.toUpperCase() ?? 'PENDING'}</span>
	</div>

	<!-- ── Ankored Uplink Card ────────────────────────────────────────────────── -->
	{#if uplinkStatus === 'cleared'}
		<div class="ct-card ct-card--success" role="status" aria-live="polite">
			<div class="ct-success-icon" aria-hidden="true">
				<i class="ph ph-check-circle"></i>
			</div>
			<h2 class="ct-card__heading">CLEARANCE CONFIRMED</h2>
			<p class="ct-card__body">
				Your Ankored verification has been submitted. War Room access is being unlocked.
			</p>
			<p class="ct-card__meta">Redirecting to Nexus Command…</p>
		</div>
	{:else}
		<div class="ct-card">
			<!-- Ankored branding row -->
			<div class="ct-ankored-brand">
				<div class="ct-ankored-icon" aria-hidden="true">
					<i class="ph ph-shield-check"></i>
				</div>
				<div>
					<div class="ct-ankored-name">ANKORED</div>
					<div class="ct-ankored-sub">USOPC-Compliant Compliance Aggregator</div>
				</div>
				<div class="ct-ankored-badge">
					<span class="ct-pulse-dot" aria-hidden="true"></span>
					INTEGRATED
				</div>
			</div>

			<p class="ct-card__body ct-card__body--main">
				COMPLIANCE VERIFICATION REQUIRED. Nexus Command utilizes Ankored for secure,
				USOPC-compliant background screening and SafeSport verification. Your identity
				and credentials are verified through Ankored's encrypted network — no documents
				are handled directly by this platform.
			</p>

			<ul class="ct-check-list" aria-label="Verification scope">
				<li><i class="ph ph-check" aria-hidden="true"></i> SafeSport Certification</li>
				<li><i class="ph ph-check" aria-hidden="true"></i> Background Check (USOPC standards)</li>
				<li><i class="ph ph-check" aria-hidden="true"></i> Concussion Protocol Acknowledgment</li>
			</ul>

			{#if uplinkStatus === 'error'}
				<p class="ct-error" role="alert">{uplinkError}</p>
			{/if}

			<button
				class="ct-btn-primary {uplinkStatus === 'connecting' ? 'ct-btn-primary--busy' : ''}"
				disabled={uplinkStatus === 'connecting'}
				onclick={launchUplink}
				aria-label="Initiate Ankored Secure Uplink"
			>
				{#if uplinkStatus === 'connecting'}
					<span class="ct-spin" aria-hidden="true">↻</span>
					CONNECTING TO ANKORED SECURE NETWORK…
				{:else}
					<i class="ph ph-link" aria-hidden="true"></i>
					INITIATE ANKORED SECURE UPLINK
				{/if}
			</button>

			<p class="ct-legal">
				By initiating this uplink you authorize Ankored to perform the required
				screening. Data is processed under USOPC SafeSport and applicable COPPA guidelines.
			</p>
		</div>
	{/if}
</div>

<style>
	.ct-root {
		min-height: 100dvh;
		background: var(--vanguard-bg, #010409);
		color: #e5e7eb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem 4rem;
		gap: 1.5rem;
		position: relative;
		overflow: hidden;
	}

	/* Ambient threat grid */
	.ct-grid {
		position: fixed;
		inset: 0;
		pointer-events: none;
		background-image:
			linear-gradient(rgba(255, 0, 60, 0.035) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 0, 60, 0.035) 1px, transparent 1px);
		background-size: 3rem 3rem;
		z-index: 0;
	}

	/* Ensure all direct children sit above the fixed grid */
	.ct-root > * { position: relative; z-index: 1; }

	/* ── Header ─────────────────────────────────────────────────────────────── */
	.ct-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
		max-width: 540px;
	}

	.ct-shield {
		width: 4rem;
		height: 4rem;
		color: var(--vanguard-red, #ff003c);
		animation: ctShieldPulse 2s ease-in-out infinite;
		filter: drop-shadow(0 0 14px rgba(255, 0, 60, 0.65));
	}

	@keyframes ctShieldPulse {
		0%, 100% { opacity: 0.8; transform: scale(1); }
		50%       { opacity: 1;   transform: scale(1.06); }
	}

	.ct-badge {
		font-size: 0.6rem;
		letter-spacing: 0.24em;
		font-weight: 700;
		color: var(--vanguard-red, #ff003c);
		border: 1px solid rgba(255, 0, 60, 0.3);
		padding: 0.2rem 0.6rem;
		border-radius: 2px;
		display: inline-block;
	}

	.ct-title {
		margin: 0;
		font-size: clamp(1.4rem, 4vw, 2rem);
		font-weight: 900;
		letter-spacing: 0.14em;
		color: var(--vanguard-red, #ff003c);
		text-shadow: 0 0 28px rgba(255, 0, 60, 0.55);
	}

	.ct-subtitle {
		margin: 0;
		font-size: 0.78rem;
		color: rgba(229, 231, 235, 0.55);
		line-height: 1.6;
	}

	/* ── Identity strip ──────────────────────────────────────────────────────── */
	.ct-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		justify-content: center;
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		color: rgba(0, 240, 255, 0.45);
		border-top: 1px solid rgba(0, 240, 255, 0.08);
		border-bottom: 1px solid rgba(0, 240, 255, 0.08);
		padding: 0.5rem 1rem;
		width: 100%;
		max-width: 680px;
	}

	/* ── Card ────────────────────────────────────────────────────────────────── */
	.ct-card {
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(0, 240, 255, 0.12);
		border-radius: 10px;
		padding: 2rem;
		width: 100%;
		max-width: 640px;
		backdrop-filter: blur(16px);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.ct-card--success {
		border-color: rgba(0, 240, 255, 0.35);
		background: rgba(0, 240, 255, 0.04);
		align-items: center;
		text-align: center;
		gap: 0.75rem;
	}

	/* ── Ankored brand row ────────────────────────────────────────────────────── */
	.ct-ankored-brand {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid rgba(0, 240, 255, 0.1);
	}

	.ct-ankored-icon {
		font-size: 2rem;
		color: var(--vanguard-cyan, #00f0ff);
		filter: drop-shadow(0 0 10px rgba(0, 240, 255, 0.5));
		flex-shrink: 0;
	}

	.ct-ankored-name {
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		color: var(--vanguard-cyan, #00f0ff);
		text-shadow: 0 0 12px rgba(0, 240, 255, 0.4);
	}

	.ct-ankored-sub {
		font-size: 0.62rem;
		color: rgba(229, 231, 235, 0.4);
		margin-top: 0.15rem;
		letter-spacing: 0.06em;
	}

	.ct-ankored-badge {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: var(--vanguard-cyan, #00f0ff);
		border: 1px solid rgba(0, 240, 255, 0.25);
		padding: 0.2rem 0.55rem;
		border-radius: 3px;
		white-space: nowrap;
	}

	/* ── Pulse dot ────────────────────────────────────────────────────────────── */
	.ct-pulse-dot {
		display: inline-block;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--vanguard-cyan, #00f0ff);
		box-shadow: 0 0 6px var(--vanguard-cyan, #00f0ff);
		animation: ctPulseDot 1.4s ease-in-out infinite;
	}

	@keyframes ctPulseDot {
		0%, 100% { opacity: 1; transform: scale(1); }
		50%       { opacity: 0.35; transform: scale(0.5); }
	}

	/* ── Body text ────────────────────────────────────────────────────────────── */
	.ct-card__body {
		margin: 0;
		font-size: 0.73rem;
		color: rgba(229, 231, 235, 0.55);
		line-height: 1.65;
	}

	.ct-card__body--main {
		color: rgba(229, 231, 235, 0.7);
		font-size: 0.76rem;
	}

	.ct-card__heading {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: var(--vanguard-cyan, #00f0ff);
	}

	.ct-card__meta {
		font-size: 0.65rem;
		color: rgba(229, 231, 235, 0.35);
		margin: 0;
	}

	.ct-success-icon {
		font-size: 3rem;
		color: var(--vanguard-cyan, #00f0ff);
		filter: drop-shadow(0 0 14px rgba(0, 240, 255, 0.55));
	}

	/* ── Check list ────────────────────────────────────────────────────────────── */
	.ct-check-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.ct-check-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.72rem;
		color: rgba(229, 231, 235, 0.65);
	}

	.ct-check-list li i {
		color: var(--vanguard-cyan, #00f0ff);
		flex-shrink: 0;
	}

	/* ── Error ─────────────────────────────────────────────────────────────────── */
	.ct-error {
		font-size: 0.7rem;
		color: var(--vanguard-red, #ff003c);
		margin: 0;
		border: 1px solid rgba(255, 0, 60, 0.2);
		background: rgba(255, 0, 60, 0.04);
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
	}

	/* ── CTA button ─────────────────────────────────────────────────────────────── */
	.ct-btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--vanguard-bg, #010409);
		background: var(--vanguard-cyan, #00f0ff);
		border: none;
		padding: 0.85rem 2rem;
		border-radius: 6px;
		cursor: pointer;
		box-shadow: 0 0 24px rgba(0, 240, 255, 0.4);
		transition: all 0.2s;
		min-height: 52px;
		width: 100%;
	}

	.ct-btn-primary:not(.ct-btn-primary--busy):hover {
		box-shadow: 0 0 36px rgba(0, 240, 255, 0.65);
		transform: translateY(-1px);
	}

	.ct-btn-primary--busy {
		opacity: 0.7;
		cursor: not-allowed;
		background: rgba(0, 240, 255, 0.7);
		box-shadow: none;
	}

	.ct-spin {
		display: inline-block;
		animation: ctSpinAnim 0.75s linear infinite;
		font-style: normal;
	}

	@keyframes ctSpinAnim {
		to { transform: rotate(360deg); }
	}

	/* ── Legal notice ────────────────────────────────────────────────────────────── */
	.ct-legal {
		font-size: 0.6rem;
		color: rgba(229, 231, 235, 0.3);
		line-height: 1.5;
		text-align: center;
		margin: 0;
	}
</style>
