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
	import { auth } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { loginEngine, userFacingErrorMessage } from '$lib/auth/LoginEngine.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { requiresPasskeyEnrollmentBeforeApp } from '$lib/auth/passkeyGate.js';
	import { navigateAfterLogin } from '$lib/auth/postAuthRouting.js';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';

	type Phase = 'checking' | 'ready' | 'unsupported' | 'routing';

	let phase = $state<Phase>('checking');

	const primaryBtn =
		'tw-w-full tw-min-h-[3.25rem] tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border ' +
		'tw-bg-vanguard-surface-raised tw-font-mono tw-text-sm tw-font-bold tw-uppercase ' +
		'tw-tracking-[0.14em] tw-text-vanguard-text-primary tw-transition-colors tw-duration-fast ' +
		'hover:tw-border-vanguard-accent hover:tw-text-vanguard-accent disabled:tw-opacity-50 ' +
		'focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-vanguard-accent focus-visible:tw-ring-offset-2 focus-visible:tw-ring-offset-[#0b1220]';

	const secondaryBtn =
		'tw-w-full tw-min-h-[3.25rem] tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border ' +
		'tw-bg-vanguard-bg tw-font-mono tw-text-sm tw-font-bold tw-uppercase ' +
		'tw-tracking-[0.14em] tw-text-slate-300 tw-transition-colors tw-duration-fast ' +
		'hover:tw-[border-color:var(--vanguard-border-strong)] hover:tw-text-vanguard-text-primary ' +
		'disabled:tw-opacity-50 ' +
		'focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-vanguard-accent focus-visible:tw-ring-offset-2 focus-visible:tw-ring-offset-[#0b1220]';

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
					await goto('/login', { replaceState: true });
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

<div
	class="tw-box-border tw-flex tw-min-h-screen tw-w-full tw-flex-col tw-items-center tw-justify-center tw-bg-[#0b1220] tw-px-4 tw-py-10 sm:tw-px-6"
>
	<div
		class="tw-flex tw-w-full tw-max-w-[26rem] tw-flex-col tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border tw-bg-vanguard-surface tw-shadow-vanguard-elev-1 tw-p-7 sm:tw-p-8"
	>
		<div
			class="tw-mx-auto tw-mb-5 tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border tw-bg-vanguard-bg"
			aria-hidden="true"
		>
			<Icon name="sys.hexagon" size={22} class="tw-text-vanguard-text-primary" />
		</div>
		<h1
			class="tw-m-0 tw-mb-2 tw-text-center tw-font-mono tw-text-base tw-font-bold tw-uppercase tw-tracking-[0.16em] tw-text-vanguard-text-primary"
		>
			Set up your passkey
		</h1>
		<p class="tw-mb-6 tw-text-center tw-font-mono tw-text-[0.72rem] tw-leading-relaxed tw-text-slate-400">
			Device passkeys keep your club data behind the same WebAuthn clearance as command sign-in.
			Enrollment is required once for email-based sign-in paths.
		</p>

		{#if phase === 'checking' || phase === 'routing'}
			<div class="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-py-6">
				<div
					class="tw-h-6 tw-w-6 tw-animate-spin tw-rounded-full tw-border-2 tw-border-vanguard-border tw-border-t-vanguard-accent"
					role="status"
					aria-label="Loading"
				></div>
				<p class="tw-m-0 tw-font-mono tw-text-xs tw-text-slate-400">
					{phase === 'routing' ? 'Continuing…' : 'Verifying clearance…'}
				</p>
			</div>
		{:else if phase === 'unsupported'}
			<div class="tw-rounded-md tw-border tw-border-amber-500/40 tw-bg-amber-950/50 tw-px-3 tw-py-3 tw-font-mono tw-text-xs tw-text-amber-100" role="alert">
				This browser does not support passkey registration with a platform authenticator.
				Try Chrome, Edge, or Safari on a recent OS, or switch devices.
			</div>
			<div class="tw-mt-5 tw-flex tw-flex-col tw-gap-3">
				<button type="button" class={secondaryBtn} onclick={() => window.location.reload()}>
					Retry
				</button>
				<button type="button" class={secondaryBtn} onclick={() => void handleSignOut()}>Sign out</button>
			</div>
		{:else if phase === 'ready'}
			<p class="tw-mb-4 tw-text-center tw-font-mono tw-text-[0.65rem] tw-text-slate-500">
				Follow the OS prompt to create a passkey for <span class="tw-text-vanguard-text-primary">{auth.currentUser?.email ?? 'your account'}</span>.
			</p>
			{#if loginEngine.error}
				<div class="tw-mb-4 tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/60 tw-px-3 tw-py-2 tw-font-mono tw-text-xs tw-text-red-300" role="alert">
					{loginEngine.error}
				</div>
			{/if}
			<div class="tw-flex tw-flex-col tw-gap-3">
				<button
					type="button"
					class={primaryBtn}
					disabled={loginEngine.busy}
					onclick={registerAndContinue}
				>
					{loginEngine.busy ? 'REGISTERING…' : 'REGISTER PASSKEY'}
				</button>
				<button type="button" class={secondaryBtn} onclick={() => void handleSignOut()}>Sign out</button>
			</div>
		{/if}
	</div>
</div>
