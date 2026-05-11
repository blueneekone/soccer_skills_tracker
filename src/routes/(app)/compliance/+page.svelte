<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import CheckrEmbed from './CheckrEmbed.svelte';

	export const ssr = false;

	// Redirect if already cleared
	$effect(() => {
		if (authStore.isLoading) return;
		if (authStore.isCleared && browser) {
			untrack(() => goto('/coach', { replaceState: true }));
		}
	});
</script>

<svelte:head>
	<title>Compliance Screening — Vanguard Protocol</title>
</svelte:head>

<div class="ct-root">
	<div class="ct-grid" aria-hidden="true"></div>

	<!-- Header -->
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
			<div class="ct-badge">CLEARANCE PROTOCOL — CHECKR NATIVE EMBED</div>
			<h1 class="ct-title">BACKGROUND SCREENING REQUIRED</h1>
			<p class="ct-subtitle">
				Nexus Command requires USOPC-compliant background verification before War Room
				access is granted. Screening is processed securely off-server by Checkr —
				your SSN and payment details never touch this platform.
			</p>
		</div>
	</header>

	<!-- Identity strip -->
	<div class="ct-strip">
		<span>UID: {authStore.user?.uid ?? '—'}</span>
		<span>ROLE: {authStore.role?.toUpperCase() ?? '—'}</span>
		<span>CLUB: {authStore.userProfile?.clubId ?? '—'}</span>
		<span>STATUS: {(authStore.userProfile?.clearance?.status)?.toUpperCase() ?? 'PENDING'}</span>
	</div>

	<!-- Checkr SDK embed -->
	<div class="ct-embed-shell">
		<CheckrEmbed />
	</div>

	<!-- Zero-liability callout -->
	<div class="ct-zero-liability">
		<i class="ph ph-lock-simple" aria-hidden="true"></i>
		<span>PII, SSN &amp; payment data processed exclusively inside Checkr's encrypted iframe.</span>
	</div>
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

	/* ── Embed shell ────────────────────────────────────────────────────────── */
	.ct-embed-shell {
		width: 100%;
		max-width: 760px;
	}

	/* ── Zero-liability notice ───────────────────────────────────────────────── */
	.ct-zero-liability {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		color: rgba(229, 231, 235, 0.3);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
	}

	.ct-zero-liability i {
		font-size: 0.85rem;
	}
</style>
