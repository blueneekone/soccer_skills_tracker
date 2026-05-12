<script lang="ts">
	/**
	 * /account/settings/phone — Phone Number Verification Shell
	 * ──────────────────────────────────────────────────────────
	 * Phase 2, Epic 3 — Native Firebase Phone Number Verification.
	 *
	 * Shell layer (Vanguard Trinity pattern).
	 *
	 * Responsibilities:
	 *   • Auth guard — redirects to /login if not authenticated.
	 *   • Lifecycle — creates invisible RecaptchaVerifier on mount,
	 *     tears it down on destroy.
	 *   • Wires the Brain (PhoneLinkEngine) and the Glass
	 *     (PhoneLinkArena) together.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { PhoneLinkEngine } from '$lib/components/phone/PhoneLinkEngine.svelte.js';
	import PhoneLinkArena from '$lib/components/phone/PhoneLinkArena.svelte';
	import { createInvisibleRecaptcha, tearDownRecaptcha } from '$lib/services/recaptchaService.svelte.js';
	import type { RecaptchaVerifier } from 'firebase/auth';

	const engine = new PhoneLinkEngine();
	let verifier: RecaptchaVerifier | null = null;

	onMount(() => {
		// Auth guard — redirect outside of $effect to avoid untrack complexity.
		if (!authStore.isAuthenticated) {
			untrack(() => goto('/login'));
			return;
		}
		// Create the invisible verifier against the container div rendered by PhoneLinkArena.
		verifier = createInvisibleRecaptcha('phone-recaptcha');
	});

	onDestroy(() => {
		if (verifier) {
			tearDownRecaptcha(verifier);
			verifier = null;
		}
	});

	// ── Handlers passed down to arena ─────────────────────────────────────────

	async function handleSendCode(phoneE164: string) {
		if (!verifier) return;
		await engine.sendCode(phoneE164, verifier);
	}

	async function handleConfirmCode(code: string) {
		await engine.confirm(code);
	}

	function handleReset() {
		// Tear down the old verifier and create a fresh one (required after errors).
		if (verifier) {
			tearDownRecaptcha(verifier);
		}
		engine.reset();
		// Re-create verifier on the next tick so the DOM div is in place.
		setTimeout(() => {
			verifier = createInvisibleRecaptcha('phone-recaptcha');
		}, 50);
	}
</script>

<svelte:head>
	<title>Verify Phone — Vanguard Account</title>
</svelte:head>

<div class="page-shell">
	<div class="page-header">
		<a href="/account" class="back-link">← Account</a>
		<h1 class="page-title">Phone Verification</h1>
		<p class="page-sub">Link a verified mobile number to your account for enhanced security.</p>
	</div>

	<div class="arena-wrap">
		<PhoneLinkArena
			{engine}
			onSendCode={handleSendCode}
			onConfirmCode={handleConfirmCode}
			onReset={handleReset}
		/>
	</div>
</div>

<style>
	.page-shell {
		max-width: 520px;
		margin: 0 auto;
		padding: clamp(24px, 5vw, 48px) clamp(16px, 4vw, 32px);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.back-link {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: rgba(0,240,255,0.5);
		text-decoration: none;
		text-transform: uppercase;
		transition: color 0.15s;
		width: fit-content;
	}
	.back-link:hover { color: rgba(0,240,255,0.85); }

	.page-title {
		margin: 0;
		font-size: clamp(18px, 3vw, 24px);
		font-weight: 900;
		color: #fff;
		letter-spacing: 0.04em;
	}

	.page-sub {
		margin: 0;
		font-size: 0.65rem;
		color: rgba(255,255,255,0.3);
		letter-spacing: 0.06em;
	}

	.arena-wrap { width: 100%; }
</style>
