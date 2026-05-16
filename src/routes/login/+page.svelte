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
	import { routeByFirestoreRole } from '$lib/auth/authRouter.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	// View router
	type LoginView = 'command' | 'operative';
	type OperativeMode = 'otp' | 'dispatch';

	let loginView = $state<LoginView>('command');
	let operativeMode = $state<OperativeMode>('otp');

	// Adult auth (existing)
	let googleBusy = $state(false);
	let googleError = $state('');
	let navigating = $state(false);

	// Operative terminal
	let opCallsign = $state('');
	let opCode = $state('');
	let opBusy = $state(false);
	let opError = $state('');

	// OTP / Dispatch input helpers
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

	$effect(() => {
		if (!authStore.isLoading && authStore.isAuthenticated && !navigating) {
			navigating = true;
			void navigateAfterLogin({ replaceState: true });
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
			const user = result.user;
			await setDoc(
				doc(db, 'users', user.uid),
				{ email: user.email, displayName: user.displayName, photoURL: user.photoURL ?? null, lastLogin: serverTimestamp() },
				{ merge: true },
			);
			await routeByFirestoreRole(user);
		} catch (err) {
			googleError = err instanceof Error ? err.message : 'Google sign-in failed.';
			navigating = false;
		} finally {
			googleBusy = false;
		}
	};

	const handlePasskeyLogin = async () => {
		navigating = true;
		loginEngine.error = '';
		googleError = '';
		await loginEngine.loginWithPasskey();
		if (loginEngine.error) { navigating = false; return; }
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
			await navigateAfterLogin({ replaceState: true });
		} catch (err) {
			opError = err instanceof Error ? err.message : 'Clearance verification failed.';
			navigating = false;
		} finally {
			opBusy = false;
		}
	};
</script>

<div class="tw-flex tw-min-h-screen tw-w-full tw-flex-col tw-items-center tw-justify-center tw-bg-[#020617] tw-px-4 tw-py-10">
	<div class="tw-w-full tw-max-w-[26rem] tw-rounded-lg tw-border tw-border-slate-800 tw-bg-slate-900 tw-p-8">

		{#if loginView === 'operative'}
			<!-- Terminal header row -->
			<div class="tw-mb-5 tw-flex tw-min-w-0 tw-items-center tw-justify-between tw-gap-2">
				<div class="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tw-shrink-0 tw-text-teal-500" aria-hidden="true">
						<polyline points="4 17 10 11 4 5"/>
						<line x1="12" y1="19" x2="20" y2="19"/>
					</svg>
					<div class="tw-min-w-0">
						<p class="tw-m-0 tw-truncate tw-font-mono tw-text-[0.55rem] tw-font-bold tw-uppercase tw-tracking-[0.22em] tw-text-slate-600">COPPA-SECURE GATE</p>
						<h2 class="tw-m-0 tw-truncate tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.16em] tw-text-teal-400">OPERATIVE TERMINAL</h2>
					</div>
				</div>
				<button
					type="button"
					onclick={() => { loginView = 'command'; opError = ''; opCode = ''; opCallsign = ''; }}
					class="tw-inline-flex tw-w-fit tw-shrink-0 tw-items-center tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-600 tw-transition-colors tw-duration-150 hover:tw-text-slate-300 focus-visible:tw-outline-none"
					aria-label="Return to adult login"
				>
					← COMMAND
				</button>
			</div>

			<!-- Mode tabs — slim pill switcher -->
			<div class="tw-mb-5 tw-flex tw-gap-px tw-border-b tw-border-slate-800 tw-pb-0" role="tablist" aria-label="Authentication mode">
				<button
					type="button"
					role="tab"
					aria-selected={operativeMode === 'otp'}
					onclick={() => { operativeMode = 'otp'; opCode = ''; opError = ''; }}
					class="tw-px-3 tw-pb-2 tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.12em] tw-transition-colors tw-duration-150 focus-visible:tw-outline-none {operativeMode === 'otp' ? 'tw-border-b-2 tw-border-teal-500 tw-text-teal-400 -tw-mb-px' : 'tw-text-slate-600 hover:tw-text-slate-400'}"
				>Clearance Code</button>
				<button
					type="button"
					role="tab"
					aria-selected={operativeMode === 'dispatch'}
					onclick={() => { operativeMode = 'dispatch'; opCode = ''; opError = ''; }}
					class="tw-px-3 tw-pb-2 tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.12em] tw-transition-colors tw-duration-150 focus-visible:tw-outline-none {operativeMode === 'dispatch' ? 'tw-border-b-2 tw-border-teal-500 tw-text-teal-400 -tw-mb-px' : 'tw-text-slate-600 hover:tw-text-slate-400'}"
				>Dispatch Code</button>
			</div>

			<!-- Callsign input — lean terminal style -->
			<div class="tw-mb-1">
				<label class="tw-block tw-font-mono tw-text-[0.55rem] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-slate-600" for="op-callsign">Operative Callsign</label>
			</div>
			<input
				id="op-callsign"
				type="text"
				autocomplete="username"
				autocapitalize="none"
				spellcheck={false}
				placeholder={operativeMode === 'otp' ? 'callsign, name, or email' : 'callsign (e.g. striker7)'}
				bind:value={opCallsign}
				class="tw-mb-4 tw-w-full tw-border-0 tw-border-b tw-border-slate-700 tw-bg-transparent tw-pb-2 tw-font-mono tw-text-sm tw-text-slate-300 tw-placeholder-slate-700 tw-transition-colors tw-duration-150 focus:tw-border-teal-500 focus:tw-outline-none focus:tw-ring-0"
			/>

			<!-- Code entry — dark inset container -->
			<div class="tw-mb-5 tw-rounded-md tw-bg-slate-950/50 tw-px-4 tw-py-5">
				<label class="tw-mb-2 tw-block tw-font-mono tw-text-[0.55rem] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-slate-600" for={operativeMode === 'otp' ? 'op-code-otp' : 'op-code-dispatch'}>
					{operativeMode === 'otp' ? 'Clearance Code' : 'Dispatch Code'}
				</label>
				{#if operativeMode === 'otp'}
					<input
						id="op-code-otp"
						type="text"
						inputmode="text"
						autocomplete="one-time-code"
						autocapitalize="characters"
						spellcheck={false}
						maxlength={7}
						placeholder="XXX-XXX"
						value={opCode}
						oninput={handleOtpInput}
						class="tw-w-full tw-border-0 tw-border-b tw-border-slate-700 tw-bg-transparent tw-pb-2 tw-text-center tw-font-mono tw-text-2xl tw-font-bold tw-tracking-[0.5em] tw-text-teal-400 tw-placeholder-slate-800 tw-transition-colors tw-duration-150 focus:tw-border-teal-500 focus:tw-outline-none focus:tw-ring-0"
					/>
				{:else}
					<input
						id="op-code-dispatch"
						type="text"
						autocomplete="off"
						autocapitalize="characters"
						spellcheck={false}
						maxlength={8}
						placeholder="XXXXXXXX"
						value={opCode}
						oninput={handleDispatchInput}
						class="tw-w-full tw-border-0 tw-border-b tw-border-slate-700 tw-bg-transparent tw-pb-2 tw-text-center tw-font-mono tw-text-2xl tw-font-bold tw-tracking-[0.4em] tw-text-teal-400 tw-placeholder-slate-800 tw-transition-colors tw-duration-150 focus:tw-border-teal-500 focus:tw-outline-none focus:tw-ring-0"
					/>
				{/if}
				<p class="tw-mt-2 tw-font-mono tw-text-[0.55rem] tw-leading-relaxed tw-text-slate-700">
					{#if operativeMode === 'otp'}
						6-char code generated by your parent · 10 min TTL · single use
					{:else}
						permanent code issued at provisioning
					{/if}
				</p>
			</div>

			<!-- Action row: submit + cancel — w-fit inline-flex per cursorrules -->
			<div class="tw-flex tw-items-center tw-justify-between tw-gap-3">
				<button
					type="button"
					onclick={() => { loginView = 'command'; opError = ''; opCode = ''; opCallsign = ''; }}
					class="tw-inline-flex tw-h-11 tw-w-fit tw-items-center tw-justify-center tw-border tw-border-slate-800 tw-px-4 tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-500 tw-transition-colors tw-duration-150 hover:tw-border-slate-700 hover:tw-bg-slate-800 hover:tw-text-slate-300 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500"
				>
					← Cancel
				</button>
				<button
					type="button"
					onclick={handleOperativeAuth}
					disabled={opBusy || navigating || !opCallsign.trim() || !opCode.trim()}
					class="tw-inline-flex tw-h-11 tw-w-fit tw-items-center tw-justify-center tw-gap-2 tw-border tw-border-teal-500/30 tw-bg-teal-950/30 tw-px-6 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-teal-400 tw-transition-colors tw-duration-150 hover:tw-border-teal-400/60 hover:tw-bg-teal-900/40 hover:tw-text-teal-300 disabled:tw-pointer-events-none disabled:tw-opacity-40 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500"
				>
					{#if opBusy}
						<div class="tw-h-3.5 tw-w-3.5 tw-animate-spin tw-rounded-full tw-border tw-border-teal-700 tw-border-t-teal-300" role="status" aria-label="Authenticating"></div>
						VERIFYING…
					{:else}
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
							<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
						</svg>
						AUTHENTICATE
					{/if}
				</button>
			</div>

			<!-- Error alert -->
			{#if opError}
				<div
					class="tw-mt-3 tw-rounded tw-border tw-border-red-500/30 tw-bg-red-950/40 tw-px-3 tw-py-2 tw-font-mono tw-text-[0.65rem] tw-text-red-400"
					role="alert"
				>{opError}</div>
			{/if}

		{:else}
			<!-- Logo mark -->
			<div class="tw-mx-auto tw-mb-5 tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-md tw-border tw-border-slate-700 tw-bg-slate-800">
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="tw-text-slate-300"
					aria-hidden="true"
				>
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
				</svg>
			</div>

			<!-- Heading -->
			<h1 class="tw-m-0 tw-mb-1 tw-text-center tw-font-sans tw-text-base tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-100">
				NEXUS COMMAND
			</h1>

			<!-- Eyebrow -->
			<p class="tw-m-0 tw-text-center tw-font-mono tw-text-xs tw-tracking-[0.2em] tw-text-slate-500">
				VANGUARD AUTH PROTOCOL
			</p>

			<!-- Divider -->
			<div class="tw-my-6 tw-border-t tw-border-slate-800"></div>

			<!-- Email input -->
			<input
				type="email"
				autocomplete="email"
				placeholder="Email address"
				bind:value={loginEngine.email}
				class="tw-w-full tw-rounded-md tw-border tw-border-slate-700 tw-bg-slate-800/60 tw-px-4 tw-py-3 tw-font-mono tw-text-sm tw-text-slate-200 tw-placeholder-slate-500 tw-transition-colors tw-duration-150 focus:tw-border-teal-600 focus:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500 focus-visible:tw-ring-offset-2 focus-visible:tw-ring-offset-slate-900"
			/>

			<!-- Passkey button -->
			<button
				type="button"
				onclick={handlePasskeyLogin}
				disabled={loginEngine.busy || googleBusy || navigating}
				class="tw-mt-3 tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-justify-center tw-gap-2.5 tw-min-h-[2.75rem] tw-rounded-md tw-border tw-border-slate-700 tw-bg-slate-800 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-200 tw-transition-colors tw-duration-150 hover:tw-border-teal-600 hover:tw-text-teal-400 disabled:tw-cursor-not-allowed disabled:tw-opacity-40 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500 focus-visible:tw-ring-offset-2 focus-visible:tw-ring-offset-slate-900"
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="M21 21l-4.35-4.35" />
				</svg>
				{loginEngine.busy ? 'AUTHENTICATING…' : 'SIGN IN WITH PASSKEY'}
			</button>

			<!-- Magic link button -->
			<button
				type="button"
				onclick={handleMagicLink}
				disabled={loginEngine.busy || googleBusy || navigating}
				class="tw-mt-2 tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-justify-center tw-gap-2.5 tw-min-h-[2.75rem] tw-rounded-md tw-border tw-border-slate-800 tw-bg-slate-900 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-400 tw-transition-colors tw-duration-150 hover:tw-border-slate-700 hover:tw-text-slate-200 disabled:tw-cursor-not-allowed disabled:tw-opacity-40 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500 focus-visible:tw-ring-offset-2 focus-visible:tw-ring-offset-slate-900"
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<rect x="2" y="4" width="20" height="16" rx="2" />
					<path d="M22 7L12 13 2 7" />
				</svg>
				{#if loginEngine.busy && loginEngine.email}
					DISPATCHING LINK…
				{:else if loginEngine.magicLinkSent}
					LINK DISPATCHED — CHECK INBOX
				{:else}
					SEND MAGIC LINK
				{/if}
			</button>

			<!-- Magic link sent confirmation -->
			{#if loginEngine.magicLinkSent}
				<p class="tw-mt-2 tw-text-center tw-font-mono tw-text-[0.65rem] tw-leading-relaxed tw-text-slate-400">
					Link dispatched to <span class="tw-text-teal-400">{loginEngine.email}</span> — check your inbox.
				</p>
			{/if}

			<!-- OR divider -->
			<div class="tw-my-4 tw-flex tw-items-center tw-gap-3">
				<hr class="tw-flex-1 tw-border-0 tw-border-t tw-border-slate-800" />
				<span class="tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-slate-600">or</span>
				<hr class="tw-flex-1 tw-border-0 tw-border-t tw-border-slate-800" />
			</div>

			<!-- Google button -->
			<button
				type="button"
				onclick={handleGoogleLogin}
				disabled={googleBusy || loginEngine.busy || navigating}
				class="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-justify-center tw-gap-2.5 tw-min-h-[2.75rem] tw-rounded-md tw-border tw-border-slate-800 tw-bg-slate-900 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-400 tw-transition-colors tw-duration-150 hover:tw-border-slate-700 hover:tw-text-slate-200 disabled:tw-cursor-not-allowed disabled:tw-opacity-40 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500 focus-visible:tw-ring-offset-2 focus-visible:tw-ring-offset-slate-900"
			>
				{#if !googleBusy}
					<svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
						<path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
						<path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
						<path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
						<path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
					</svg>
				{/if}
				{googleBusy ? 'AUTHENTICATING…' : 'CONTINUE WITH GOOGLE'}
			</button>

			<!-- Error alerts -->
			{#if loginEngine.error}
				<div
					class="tw-mt-3 tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/60 tw-px-3 tw-py-2.5 tw-font-mono tw-text-xs tw-text-red-300"
					role="alert"
				>
					{loginEngine.error}
				</div>
			{/if}
			{#if googleError}
				<div
					class="tw-mt-3 tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/60 tw-px-3 tw-py-2.5 tw-font-mono tw-text-xs tw-text-red-300"
					role="alert"
				>
					{googleError}
				</div>
			{/if}

			<!-- Footer -->
			<p class="tw-mt-8 tw-text-center tw-font-mono tw-text-[0.6rem] tw-tracking-[0.14em] tw-text-slate-700">
				TACTICAL OPERATIONS PLATFORM
			</p>

			<!-- Operative escape hatch — stealthy bottom link -->
			<div class="tw-mt-6 tw-flex tw-justify-center">
				<button
					type="button"
					onclick={() => { loginView = 'operative'; opError = ''; opCode = ''; opCallsign = ''; }}
					disabled={navigating}
					class="tw-inline-flex tw-w-fit tw-items-center tw-gap-2 tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-600 tw-transition-colors tw-duration-150 hover:tw-text-teal-500 disabled:tw-pointer-events-none disabled:tw-opacity-40 focus-visible:tw-outline-none"
				>
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<polyline points="4 17 10 11 4 5"/>
						<line x1="12" y1="19" x2="20" y2="19"/>
					</svg>
					INITIALIZE OPERATIVE
				</button>
			</div>
		{/if}

	</div>
</div>
