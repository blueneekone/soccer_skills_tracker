<svelte:head>
	<title>Login · NEXUS COMMAND</title>
</svelte:head>

<script lang="ts">
	import { browser } from '$app/environment';
	import { auth, functions } from '$lib/firebase.js';
	import { signInWithPopup, GoogleAuthProvider, signInWithCustomToken } from 'firebase/auth';
	import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase/config';
	import { httpsCallable } from 'firebase/functions';
	import { loginEngine } from '$lib/auth/LoginEngine.svelte.js';
	import { navigateAfterLogin } from '$lib/auth/postAuthRouting.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	type LoginView = 'command' | 'operative';
	type OperativeMode = 'otp' | 'dispatch';

	let loginView = $state<LoginView>('command');
	let operativeMode = $state<OperativeMode>('otp');

	let googleBusy = $state(false);
	let googleError = $state('');
	let navigating = $state(false);

	let opCallsign = $state('');
	let opCode = $state('');
	let opBusy = $state(false);
	let opError = $state('');

	function formatOtpCode(raw: string): string {
		const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
		return clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
	}

	function handleOtpInput(e: Event): void {
		opCode = formatOtpCode((e.target as HTMLInputElement).value);
	}

	function handleDispatchInput(e: Event): void {
		opCode = (e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
	}

	let handledByRedirect = $state(false);

	$effect(() => {
		if (browser && !authStore.isLoading) {
			if (authStore.isAuthenticated && !navigating && !handledByRedirect) {
				navigating = true;
				void navigateAfterLogin({ replaceState: true });
			} else if (!authStore.isAuthenticated && navigating) {
				// Re-enable the login form if a sign-out finishes while the page is mounted
				navigating = false;
				googleBusy = false;
			}
		}
	});

	const handleGoogleLogin = async () => {
		navigating = true;
		googleBusy = true;
		googleError = '';
		loginEngine.error = '';
		try {
			const provider = new GoogleAuthProvider();
			const result = await signInWithPopup(auth, provider);
			if (result && result.user) {
				handledByRedirect = true;
				const user = result.user;
				const emailKey = (user.email ?? '').trim().toLowerCase();
				if (!emailKey) throw new Error('Google account has no email address — cannot create profile.');
				await setDoc(
					doc(db, 'users', emailKey),
					{ email: user.email, displayName: user.displayName, photoURL: user.photoURL ?? null, lastLogin: serverTimestamp() },
					{ merge: true },
				);
				while (authStore.isLoading) {
					await new Promise((r) => setTimeout(r, 50));
				}
				await navigateAfterLogin({ replaceState: true });
			}
		} catch (err) {
			googleError = err instanceof Error ? err.message : 'Google sign-in failed.';
			navigating = false;
			googleBusy = false;
		}
	};

	const handlePasskeyLogin = async () => {
		navigating = true;
		loginEngine.error = '';
		googleError = '';
		await loginEngine.loginWithPasskey();
		if (loginEngine.error) { navigating = false; return; }
		while (authStore.isLoading) {
			await new Promise((r) => setTimeout(r, 50));
		}
		await navigateAfterLogin({ replaceState: true });
	};

	const handleMagicLink = async () => {
		googleError = '';
		await loginEngine.sendMagicLink();
	};

	const handleOperativeAuth = async () => {
		if (!browser) return;
		opError = '';
		if (!opCallsign.trim()) { opError = 'Enter your Operative Callsign.'; return; }
		if (!opCode.trim()) { opError = 'Enter your Clearance Code.'; return; }
		opBusy = true;
		navigating = true;
		try {
			let customToken: string;
			if (operativeMode === 'otp') {
				const fn = httpsCallable<{ username: string; otpCode: string }, { customToken: string }>(
					functions, 'validatePlayerOTP',
				);
				const res = await fn({ username: opCallsign.trim().toLowerCase(), otpCode: opCode.trim() });
				customToken = res.data.customToken;
			} else {
				const slug = opCallsign.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
				const fn = httpsCallable<{ email: string; dispatchCode: string }, { customToken: string }>(
					functions, 'operativeSignInWithDispatch',
				);
				const res = await fn({ email: `${slug}@operative.local`, dispatchCode: opCode.trim().toUpperCase() });
				customToken = res.data.customToken;
			}
			await signInWithCustomToken(auth, customToken);
			while (authStore.isLoading) {
				await new Promise((r) => setTimeout(r, 50));
			}
			await navigateAfterLogin({ replaceState: true });
		} catch (err) {
			opError = err instanceof Error ? err.message : 'Clearance verification failed.';
			navigating = false;
		} finally {
			opBusy = false;
		}
	};
</script>

<!-- ─── Vanguard Atmosphere ───────────────────────────────────────────────── -->
<div class="login-surface tw-relative tw-flex tw-min-h-[100dvh] tw-w-full tw-items-center tw-justify-center tw-overflow-hidden tw-bg-[#0B0F19]">

	<!-- Ambient teal glow -->
	<div class="tw-pointer-events-none tw-absolute tw-left-1/2 tw-top-1/2 tw-h-[600px] tw-w-[600px] -tw-translate-x-1/2 -tw-translate-y-1/2 tw-rounded-full tw-bg-teal-500/10 tw-blur-[120px]"></div>

	<!-- ─── Liquid Glass Card ─────────────────────────────────────────────── -->
	<div class="tw-relative tw-z-10 tw-w-full tw-max-w-md tw-rounded-2xl tw-border tw-border-slate-700/50 tw-bg-slate-900/60 tw-p-10 tw-shadow-[0_8px_32px_rgba(0,0,0,0.4)] tw-backdrop-blur-2xl">

		{#if loginView === 'operative'}

			<!-- ── Operative Terminal ─────────────────────────────────────── -->

			<!-- Header row -->
			<div class="tw-mb-6 tw-flex tw-w-full tw-min-w-0 tw-items-center tw-justify-between tw-gap-2">
				<div class="tw-flex tw-min-w-0 tw-items-center tw-gap-2.5">
					<div class="tw-flex tw-h-7 tw-w-7 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-teal-500/30 tw-bg-teal-500/10">
						<Icon name="nav.sign-in" size={13} class="tw-text-teal-400" />
					</div>
					<div class="tw-min-w-0">
						<p class="tw-m-0 tw-truncate tw-font-mono tw-text-[0.5rem] tw-font-semibold tw-uppercase tw-tracking-[0.22em] tw-text-slate-500">COPPA-SECURE GATE</p>
						<h2 class="tw-m-0 tw-truncate tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-teal-400">OPERATIVE TERMINAL</h2>
					</div>
				</div>
				<button
					type="button"
					onclick={() => { loginView = 'command'; opError = ''; opCode = ''; opCallsign = ''; }}
					class="tw-shrink-0 tw-rounded-lg tw-border tw-border-slate-700/50 tw-bg-transparent tw-px-2.5 tw-py-1.5 tw-font-mono tw-text-[0.6rem] tw-font-semibold tw-uppercase tw-tracking-[0.1em] tw-text-slate-500 tw-transition-all tw-duration-200 hover:tw-border-slate-600 hover:tw-bg-slate-800/50 hover:tw-text-slate-300 focus-visible:tw-outline-none"
					aria-label="Return to adult login"
				>
					← Back
				</button>
			</div>

			<!-- Terminal body — bulletproof flex-col group structure -->
			<div class="tw-mt-4 tw-flex tw-w-full tw-flex-col">

				<!-- Callsign group -->
				<div class="tw-mb-6 tw-flex tw-w-full tw-flex-col tw-gap-2">
					<label class="tw-block tw-w-full tw-text-left tw-font-mono tw-text-xs tw-uppercase tw-tracking-widest tw-text-slate-400" for="op-callsign">
						Operative Callsign
					</label>
					<input
						id="op-callsign"
						type="text"
						autocomplete="username"
						autocapitalize="none"
						spellcheck={false}
						placeholder="callsign, name, or email"
						bind:value={opCallsign}
						class="tw-h-12 tw-w-full tw-rounded-lg tw-border tw-border-slate-700/50 tw-bg-transparent tw-px-4 tw-text-center tw-font-mono tw-text-xl tw-tracking-widest tw-text-[#fafafa] tw-shadow-inner tw-outline-none tw-transition-all tw-placeholder-slate-400 focus:tw-border-teal-500/50 focus:tw-ring-1 focus:tw-ring-teal-500/50"
					/>
				</div>

				<!-- Clearance Code group -->
				<div class="tw-flex tw-w-full tw-flex-col tw-gap-2">
					<label class="tw-block tw-w-full tw-text-left tw-font-mono tw-text-xs tw-uppercase tw-tracking-widest tw-text-slate-400" for="op-code-otp">
						Clearance Code
					</label>
					<input
						id="op-code-otp"
						type="password"
						inputmode="text"
						autocomplete="one-time-code"
						autocapitalize="characters"
						spellcheck={false}
						maxlength={7}
						placeholder="XXX-XXX"
						value={opCode}
						oninput={handleOtpInput}
						class="tw-h-12 tw-w-full tw-rounded-lg tw-border tw-border-slate-700/50 tw-bg-transparent tw-text-center tw-font-mono tw-text-2xl tw-tracking-[0.4em] tw-text-[#fafafa] tw-shadow-inner tw-outline-none tw-transition-all placeholder:tw-text-sm placeholder:tw-tracking-normal placeholder:tw-text-slate-400 focus:tw-border-teal-500/50 focus:tw-ring-1 focus:tw-ring-teal-500/50"
					/>
				</div>

				<!-- Action buttons — gap-3 mt-6 -->
				<div class="tw-mt-8 tw-flex tw-w-full tw-flex-col tw-gap-3">

					<!-- Primary: Authorize Clearance -->
					<button
						type="button"
						onclick={handleOperativeAuth}
						disabled={opBusy || navigating || !opCallsign.trim() || !opCode.trim()}
						class="tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-teal-500/30 tw-bg-teal-500/10 tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.15em] tw-text-teal-400 tw-shadow-[0_0_15px_rgba(20,184,166,0.1)] tw-transition-all hover:tw-border-teal-400 hover:tw-bg-teal-500/20 hover:tw-shadow-[0_0_20px_rgba(20,184,166,0.2)] disabled:tw-pointer-events-none disabled:tw-opacity-40 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500/50"
					>
						{#if opBusy}
							<span class="tw-flex tw-items-center tw-gap-2">
								<span class="tw-h-3 tw-w-3 tw-animate-spin tw-rounded-full tw-border tw-border-teal-700 tw-border-t-teal-300" role="status" aria-label="Authenticating"></span>
								Verifying…
							</span>
						{:else}
							Authorize Clearance
						{/if}
					</button>

					<!-- Secondary: Abort -->
					<button
						type="button"
						onclick={() => { loginView = 'command'; opError = ''; opCode = ''; opCallsign = ''; }}
						class="tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-slate-800 tw-bg-transparent tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.15em] tw-text-slate-500 tw-transition-all hover:tw-bg-slate-800 hover:tw-text-slate-300 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500/50"
					>
						Abort / Cancel
					</button>

				</div>

			</div>

			<!-- Operative error -->
			{#if opError}
				<div
					class="tw-mt-4 tw-w-full tw-rounded-xl tw-border tw-border-red-500/20 tw-bg-red-500/10 tw-px-4 tw-py-3 tw-font-mono tw-text-xs tw-text-red-400"
					role="alert"
				>{opError}</div>
			{/if}

		{:else}

			<!-- ── Command View ────────────────────────────────────────────── -->

			<!-- Header -->
			<div class="tw-mb-8 tw-flex tw-w-full tw-flex-col tw-items-center tw-text-center">
				<div class="tw-mb-5 tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-slate-700/50 tw-bg-slate-800/60 tw-shadow-[0_0_20px_rgba(20,184,166,0.08)]">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="tw-text-slate-300" aria-hidden="true">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					</svg>
				</div>
				<h1 class="tw-m-0 tw-mb-1.5 tw-font-sans tw-text-lg tw-font-semibold tw-tracking-widest tw-text-slate-100">
					NEXUS COMMAND
				</h1>
				<p class="tw-m-0 tw-font-mono tw-text-[0.65rem] tw-tracking-[0.2em] tw-text-slate-500">
					VANGUARD AUTH PROTOCOL
				</p>
			</div>

			<!-- Unified auth block — all h-11 elements, single gap-4 container -->
			<div class="tw-flex tw-w-full tw-flex-col tw-gap-4">

				<!-- Passkey -->
				<button
					type="button"
					onclick={handlePasskeyLogin}
					disabled={loginEngine.busy || googleBusy || navigating}
					class="tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-gap-3 tw-rounded-xl tw-border tw-border-slate-700/50 tw-bg-slate-800/40 tw-text-sm tw-font-medium tw-text-slate-200 tw-transition-all tw-duration-200 hover:tw-border-slate-600 hover:tw-bg-slate-700/60 active:tw-scale-[0.98] disabled:tw-cursor-not-allowed disabled:tw-opacity-40 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500/50"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="tw-text-slate-400" aria-hidden="true">
						<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
					</svg>
					{loginEngine.busy ? 'Authenticating…' : 'Sign in with Passkey'}
				</button>

				<!-- Google -->
				<button
					type="button"
					onclick={handleGoogleLogin}
					disabled={googleBusy || loginEngine.busy || navigating}
					class="tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-gap-3 tw-rounded-xl tw-border tw-border-slate-700/50 tw-bg-slate-800/40 tw-text-sm tw-font-medium tw-text-slate-200 tw-transition-all tw-duration-200 hover:tw-border-slate-600 hover:tw-bg-slate-700/60 active:tw-scale-[0.98] disabled:tw-cursor-not-allowed disabled:tw-opacity-40 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500/50"
				>
					{#if !googleBusy}
						<svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true">
							<path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
							<path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
							<path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
							<path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
						</svg>
					{/if}
					{googleBusy ? 'Authenticating…' : 'Continue with Google'}
				</button>

				<!-- Sleek divider -->
				<div class="tw-my-1 tw-flex tw-w-full tw-items-center tw-gap-3">
					<div class="tw-h-px tw-flex-1 tw-bg-slate-800"></div>
					<span class="tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-500">Or</span>
					<div class="tw-h-px tw-flex-1 tw-bg-slate-800"></div>
				</div>

				<!-- Email input -->
				<input
					type="email"
					autocomplete="email"
					placeholder="Email address"
					bind:value={loginEngine.email}
					class="tw-h-11 tw-w-full tw-rounded-lg tw-border tw-border-slate-700/50 tw-bg-transparent tw-px-4 tw-text-sm tw-text-[#fafafa] tw-outline-none tw-transition-all tw-placeholder-slate-400 focus:tw-border-teal-500/50 focus:tw-ring-1 focus:tw-ring-teal-500/50"
				/>

				<!-- Send Magic Link -->
				<button
					type="button"
					onclick={handleMagicLink}
					disabled={loginEngine.busy || googleBusy || navigating}
					class="tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-gap-3 tw-rounded-xl tw-border tw-border-slate-700/50 tw-bg-slate-800/40 tw-text-sm tw-font-medium tw-text-slate-200 tw-transition-all tw-duration-200 hover:tw-border-slate-600 hover:tw-bg-slate-700/60 active:tw-scale-[0.98] disabled:tw-cursor-not-allowed disabled:tw-opacity-40 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500/50"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="tw-text-slate-400" aria-hidden="true">
						<rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7L12 13 2 7" />
					</svg>
					{#if loginEngine.busy && loginEngine.email}
						Dispatching link…
					{:else if loginEngine.magicLinkSent}
						Link dispatched — check inbox
					{:else}
						Send Magic Link
					{/if}
				</button>

			</div>

			<!-- Magic link confirmation -->
			{#if loginEngine.magicLinkSent}
				<p class="tw-mt-3 tw-rounded-xl tw-border tw-border-teal-500/20 tw-bg-teal-500/5 tw-px-4 tw-py-2.5 tw-text-center tw-font-mono tw-text-xs tw-leading-relaxed tw-text-slate-400">
					Link sent to <span class="tw-text-teal-400">{loginEngine.email}</span>
				</p>
			{/if}

			<!-- Error alerts -->
			{#if loginEngine.error}
				<div class="tw-mt-3 tw-rounded-xl tw-border tw-border-red-500/20 tw-bg-red-500/10 tw-px-4 tw-py-3 tw-font-mono tw-text-xs tw-text-red-400" role="alert">
					{loginEngine.error}
				</div>
			{/if}
			{#if googleError}
				<div class="tw-mt-3 tw-rounded-xl tw-border tw-border-red-500/20 tw-bg-red-500/10 tw-px-4 tw-py-3 tw-font-mono tw-text-xs tw-text-red-400" role="alert">
					{googleError}
				</div>
			{/if}

			<!-- Footer -->
			<p class="tw-mt-8 tw-text-center tw-font-mono tw-text-[0.55rem] tw-tracking-[0.18em] tw-text-slate-700">
				TACTICAL OPERATIONS PLATFORM
			</p>

			<!-- INITIALIZE OPERATIVE — high-tech escape hatch -->
			<button
				type="button"
				onclick={() => { loginView = 'operative'; opError = ''; opCode = ''; opCallsign = ''; }}
				disabled={navigating}
				class="tw-mt-6 tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-justify-center tw-gap-2 tw-border-none tw-bg-transparent tw-py-2 tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.2em] tw-text-slate-500 tw-transition-colors tw-duration-200 hover:tw-text-teal-400 disabled:tw-pointer-events-none disabled:tw-opacity-40 focus-visible:tw-outline-none"
			>
				<Icon name="nav.sign-in" size={10} />
				Initialize Operative
			</button>

		{/if}

	</div>
</div>
