<script lang="ts">
	/**
	 * /auth/magic-link/callback
	 * ──────────────────────────────────────────────────────────────────────────
	 * Phase 2 Epic 3 — Magic Link sign-in completion.
	 *
	 * Firebase emails the user a link pointing here. On mount we verify it,
	 * complete the sign-in, refresh the auth store, and route via waterfall.
	 *
	 * MANUAL STEP REQUIRED (one-time):
	 *   Firebase Console → Authentication → Settings → Authorized domains
	 *   Add: soccer.sstracker.app (prod) and localhost (dev) if not already present.
	 *   The callback URL must match actionCodeSettings.url in LoginEngine.svelte.ts.
	 */
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { auth } from '$lib/firebase.js';
	import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';

	type Phase = 'verifying' | 'prompting' | 'done' | 'error';

	let phase = $state<Phase>('verifying');
	let errorMsg = $state('');
	let promptEmail = $state('');
	let promptBusy = $state(false);

	async function completeSignIn(email: string): Promise<void> {
		try {
			await signInWithEmailLink(auth, email, window.location.href);
			// Clean up stored email
			try { window.localStorage.removeItem('sstrack_magic_email'); } catch { /* private mode */ }
			await authStore.refresh({ silent: true });
			phase = 'done';
			// Use untrack() per .cursorrules rule 4 to prevent effect re-entry
			untrack(() => {
				goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
			});
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Sign-in failed. Request a new link.';
			phase = 'error';
		}
	}

	$effect(() => {
		if (!browser) return;
		if (!isSignInWithEmailLink(auth, window.location.href)) {
			errorMsg = 'This link is invalid or has expired. Request a new magic link.';
			phase = 'error';
			return;
		}
		// Retrieve email from localStorage (set by LoginEngine.sendMagicLink)
		let storedEmail: string | null = null;
		try { storedEmail = window.localStorage.getItem('sstrack_magic_email'); } catch { /* private mode */ }

		if (storedEmail) {
			completeSignIn(storedEmail);
		} else {
			// Fallback: prompt user to re-enter email (e.g. opened on different device)
			phase = 'prompting';
		}
	});

	async function handlePromptSubmit(): Promise<void> {
		const email = promptEmail.trim();
		if (!email) return;
		promptBusy = true;
		await completeSignIn(email);
		promptBusy = false;
	}
</script>

<div class="tw-box-border tw-flex tw-min-h-screen tw-w-full tw-flex-col tw-items-center tw-justify-center tw-p-4 tw-bg-vanguard-bg">
	<div class="tw-flex tw-w-full tw-max-w-md tw-flex-col tw-gap-6 tw-rounded-lg tw-border tw-border-vanguard-border tw-bg-vanguard-surface tw-p-8 tw-text-center">

		<p class="tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-vanguard-accent">
			Nexus Command · Auth
		</p>

		{#if phase === 'verifying'}
			<p class="tw-font-mono tw-text-sm tw-text-vanguard-text-primary">
				Verifying clearance link…
			</p>
			<div class="tw-mx-auto tw-h-5 tw-w-5 tw-animate-spin tw-rounded-full tw-border-2 tw-border-vanguard-border tw-border-t-vanguard-accent" role="status" aria-label="Loading"></div>

		{:else if phase === 'prompting'}
			<h2 class="tw-m-0 tw-font-mono tw-text-base tw-font-bold tw-uppercase tw-tracking-[0.1em] tw-text-vanguard-text-primary">
				Confirm your email
			</h2>
			<p class="tw-font-mono tw-text-xs tw-text-slate-500">
				Enter the address you used to request this link.
			</p>
			<input
				type="email"
				class="tw-w-full tw-rounded-md tw-border tw-border-vanguard-border tw-bg-vanguard-bg tw-font-mono tw-px-4 tw-py-3 tw-text-sm tw-text-vanguard-text-primary tw-placeholder-slate-500 tw-transition-colors tw-duration-fast hover:tw-border-vanguard-border-strong focus:tw-border-vanguard-accent focus:tw-outline-none"
				placeholder="Email address"
				autocomplete="email"
				bind:value={promptEmail}
			/>
			<button
				type="button"
				class="tw-w-full tw-min-h-[3.25rem] tw-rounded-md tw-border tw-border-vanguard-border tw-bg-vanguard-surface-raised tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-vanguard-text-primary tw-transition-colors tw-duration-fast hover:tw-border-vanguard-accent hover:tw-text-vanguard-accent disabled:tw-opacity-50"
				disabled={promptBusy || !promptEmail.trim()}
				onclick={handlePromptSubmit}
			>
				{promptBusy ? 'VERIFYING…' : 'CONFIRM & SIGN IN'}
			</button>

		{:else if phase === 'done'}
			<p class="tw-font-mono tw-text-sm tw-text-vanguard-accent">Clearance confirmed. Routing…</p>

		{:else if phase === 'error'}
			<div class="tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/60 tw-px-3 tw-py-3 tw-font-mono tw-text-xs tw-text-red-300" role="alert">
				{errorMsg}
			</div>
			<a
				href="/login"
				class="tw-font-mono tw-text-[0.65rem] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-slate-500 tw-no-underline tw-transition-colors tw-duration-fast hover:tw-text-vanguard-text-primary"
			>
				← Return to login
			</a>
		{/if}
	</div>
</div>
