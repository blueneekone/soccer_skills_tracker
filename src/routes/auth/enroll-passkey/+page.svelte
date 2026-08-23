<script lang="ts">
	/**
	 * /auth/enroll-passkey
	 * ──────────────────────────────────────────────────────────────────────────
	 * Mandatory first-time WebAuthn enrollment for sessions that authenticated
	 * via legacy password or magic link (`password` Auth provider).
	 *
	 * After credentials exist under users/{uid}/passkeys/*, delegates to navigateAfterLogin.
	 */
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
import { untrack } from 'svelte';
	import { auth } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { loginEngine, userFacingErrorMessage } from '$lib/auth/LoginEngine.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { requiresPasskeyEnrollmentBeforeApp } from '$lib/auth/passkeyGate.js';
	import { navigateAfterLogin } from '$lib/auth/postAuthRouting.js';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';

	type Phase = 'checking' | 'ready' | 'unsupported' | 'routing';

	let phase = $state<Phase>('checking');



	const webauthnOk = $derived.by(() => {
		if (!browser) return false;
		return (
			typeof window.PublicKeyCredential !== 'undefined' &&
			typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
		);
	});

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		const supportsWebAuthn = webauthnOk;
		let cancelled = false;
		void (async () => {
			try {
				if (!authStore.isAuthenticated || !auth.currentUser) {
     untrack(() => { goto('/login', { replaceState: true });
     });
					return;
				}
				const u = auth.currentUser;
				if (!(await requiresPasskeyEnrollmentBeforeApp(u))) {
					phase = 'routing';
					await navigateAfterLogin({ replaceState: true });
					return;
				}
				if (!supportsWebAuthn) {
					if (!cancelled) phase = 'unsupported';
					return;
				}
				if (!cancelled) phase = 'ready';
			} catch (e) {
				console.error('[enroll-passkey] gate', e);
				if (!cancelled) phase = 'unsupported';
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function registerAndContinue(): Promise<void> {
		try {
			await loginEngine.registerPasskey();
			if (loginEngine.passkeyRegistered && auth.currentUser) {
				const stillNeed = await requiresPasskeyEnrollmentBeforeApp(auth.currentUser);
				if (!stillNeed) {
					phase = 'routing';
					await navigateAfterLogin({ replaceState: true });
				}
			}
		} catch (e) {
			console.error('[enroll-passkey] registerAndContinue', e);
			loginEngine.error = userFacingErrorMessage(
				e,
				'Something went wrong after registration. Check your connection and try again.',
			);
		}
	}
</script>

<svelte:head>
	<title>Enroll passkey — SSTRACKER</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="login-surface tw-relative tw-flex tw-h-[100dvh] tw-w-full tw-flex-col tw-items-center tw-justify-center tw-overflow-hidden tw-bg-[#020617] tw-px-6">
	<!-- Ambient teal glow -->
	<div class="tw-pointer-events-none tw-absolute tw-left-1/2 tw-top-1/2 tw-h-[600px] tw-w-[600px] -tw-translate-x-1/2 -tw-translate-y-1/2 tw-rounded-full tw-bg-[#14b8a614] tw-blur-[120px]"></div>

	<!-- ─── Liquid Glass Card ─────────────────────────────────────────────── -->
	<div class="tw-relative tw-z-10 tw-w-full tw-max-w-md" style="filter: drop-shadow(0 0 40px rgba(0,0,0,0.8)) drop-shadow(0 4px 10px rgba(20,184,166,0.15));">
		<div class="tw-w-full tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-10 tw-flex tw-flex-col tw-items-center"
			style="clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);"
		>
			<div class="tw-mb-5 tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-shadow-[0_0_20px_#14b8a614]">
				<Icon name="sys.hexagon" size={22} class="tw-text-slate-300" />
			</div>
			
			<h1 class="tw-m-0 tw-mb-2 tw-text-center tw-font-mono tw-text-base tw-font-bold tw-uppercase tw-tracking-[0.16em] tw-text-slate-100">
				Set up your passkey
			</h1>
			<p class="tw-mb-6 tw-text-center tw-font-mono tw-text-[0.72rem] tw-leading-relaxed tw-text-slate-400">
				Device passkeys keep your club data behind the same WebAuthn clearance as command sign-in.
				Enrollment is required once for email-based sign-in paths.
			</p>

			{#if phase === 'checking' || phase === 'routing'}
				<div class="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-py-6">
					<div
						class="tw-h-6 tw-w-6 tw-animate-spin tw-rounded-full tw-border-2 tw-border-[#334155] tw-border-t-[#14b8a6]"
						role="status"
						aria-label="Loading"
					></div>
					<p class="tw-m-0 tw-font-mono tw-text-xs tw-text-slate-400">
						{phase === 'routing' ? 'Continuing…' : 'Verifying clearance…'}
					</p>
				</div>
			{:else if phase === 'unsupported'}
				<div class="tw-w-full tw-rounded-md tw-border tw-border-amber-500/40 tw-bg-amber-950/50 tw-px-3 tw-py-3 tw-font-mono tw-text-xs tw-text-amber-100 tw-text-center" role="alert">
					This browser does not support passkey registration with a platform authenticator.
					You can continue using standard authentication.
				</div>
				<div class="tw-mt-5 tw-flex tw-w-full tw-flex-col tw-gap-3">
					<button type="button" class="vanguard-btn-amber tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-px-6 tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.2em] tw-font-bold tw-transition-colors tw-duration-200 active:tw-scale-[0.98]" onclick={() => void navigateAfterLogin({ replaceState: true })}>
						Continue to Dashboard
					</button>
					<button type="button" class="tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-border tw-border-[#1e293b] tw-bg-transparent tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.15em] tw-text-[#475569] tw-transition-all hover:tw-bg-[#1e293b] hover:tw-text-[#94a3b8] focus-visible:tw-outline-none" onclick={() => void handleSignOut()}>Sign out</button>
				</div>
			{:else if phase === 'ready'}
				<p class="tw-mb-4 tw-text-center tw-font-mono tw-text-[0.65rem] tw-text-slate-500">
					Follow the OS prompt to create a passkey for <span class="tw-text-[#14b8a6]">{auth.currentUser?.email ?? 'your account'}</span>.
				</p>
				{#if loginEngine.error}
					<div class="tw-mb-4 tw-w-full tw-rounded-xl tw-border tw-border-red-500/20 tw-bg-red-500/10 tw-px-4 tw-py-3 tw-font-mono tw-text-xs tw-text-red-400 tw-text-center" role="alert">
						{loginEngine.error}
					</div>
				{/if}
				<div class="tw-flex tw-w-full tw-flex-col tw-gap-3 tw-mt-2">
					<button
						type="button"
						class="vanguard-btn-amber tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-px-6 tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.2em] tw-font-bold tw-transition-colors tw-duration-200 active:tw-scale-[0.98] disabled:tw-pointer-events-none disabled:tw-opacity-40"
						disabled={loginEngine.busy}
						onclick={registerAndContinue}
					>
						{loginEngine.busy ? 'REGISTERING…' : 'REGISTER PASSKEY'}
					</button>
					<button
						type="button"
						class="tw-flex tw-h-10 tw-w-full tw-items-center tw-justify-center tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-font-mono tw-text-xs tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/20 tw-transition-all"
						onclick={() => void navigateAfterLogin({ replaceState: true })}
					>
						Skip For Now →
					</button>
					<button type="button" class="tw-flex tw-h-10 tw-w-full tw-items-center tw-justify-center tw-border tw-border-[#1e293b] tw-bg-transparent tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.15em] tw-text-[#475569] tw-transition-all hover:tw-bg-[#1e293b] hover:tw-text-[#94a3b8] focus-visible:tw-outline-none" onclick={() => void handleSignOut()}>Sign out</button>
				</div>
			{/if}
		</div>
	</div>
</div>