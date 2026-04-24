<script>
	import { goto } from '$app/navigation';
	import { auth, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import {
		signInWithPopup,
		GoogleAuthProvider,
		signInWithEmailAndPassword,
		signInWithCustomToken,
		getRedirectResult,
	} from 'firebase/auth';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { onMount } from 'svelte';

	const operativeSignInWithDispatch = httpsCallable(functions, 'operativeSignInWithDispatch');

	/** Adult flow */
	let email = $state('');
	let password = $state('');

	/** Operative flow (parent-provisioned minors) */
	let opEmail = $state('');
	let dispatchCode = $state('');

	let errorMsg = $state('');
	let opError = $state('');
	let showPwaPrompt = $state(false);
	let adultBusy = $state(false);
	let opBusy = $state(false);

	$effect(() => {
		if (!authStore.isLoading && authStore.isAuthenticated) {
			if (authStore.isProfileComplete) {
				goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
			} else {
				goto('/setup', { replaceState: true });
			}
		}
	});

	onMount(() => {
		getRedirectResult(auth).catch(() => {});
		const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
		const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
		showPwaPrompt = isIos && !isInStandaloneMode && !navigator.userAgent.includes('Chrome');
	});

	const gateCtl =
		'tw-w-full tw-shrink-0 tw-rounded-lg tw-border tw-border-white/10 tw-transition-all tw-px-4 tw-py-3 tw-text-base tw-min-h-[3.25rem]';

	const handleGoogleLogin = async () => {
		errorMsg = '';
		opError = '';
		try {
			await signInWithPopup(auth, new GoogleAuthProvider());
		} catch (err) {
			errorMsg = 'Google Login Failed: ' + (err && typeof err === 'object' && 'message' in err ? String(/** @type {*} */(err).message) : 'error');
		}
	};

	const handleEmailLogin = async () => {
		errorMsg = '';
		opError = '';
		if (!email || !password) {
			errorMsg = 'Enter email and password.';
			return;
		}
		adultBusy = true;
		try {
			await signInWithEmailAndPassword(auth, email, password);
		} catch (err) {
			errorMsg = err && typeof err === 'object' && 'message' in err ? String(/** @type {*} */(err).message) : 'Sign-in failed';
		} finally {
			adultBusy = false;
		}
	};

	const handleOperativeLogin = async () => {
		errorMsg = '';
		opError = '';
		const em = opEmail.trim().toLowerCase();
		const code = dispatchCode.trim().toUpperCase();
		if (!em || !code) {
			opError = 'Enter operative email and dispatch code from your parent.';
			return;
		}
		opBusy = true;
		try {
			/** @type {unknown} */
			const res = await operativeSignInWithDispatch({ email: em, dispatchCode: code });
			const data = res && typeof res === 'object' && 'data' in res ? res.data : res;
			const token =
				data && typeof data === 'object' && 'customToken' in data ?
					String(/** @type {*} */(data).customToken) :
					'';
			if (!token) {
				opError = 'Invalid response from clearance server.';
				return;
			}
			await signInWithCustomToken(auth, token);
		} catch (err) {
			const codeStr = err && typeof err === 'object' && 'message' in err ? String(/** @type {*} */(err).message) : 'Clearance failed';
			opError = codeStr;
		} finally {
			opBusy = false;
		}
	};

	const dismissPwa = () => {
		showPwaPrompt = false;
	};
</script>

<div
	class="login-gate tw-flex tw-min-h-screen tw-w-full tw-max-w-full tw-flex-col tw-items-stretch tw-justify-center tw-overflow-x-hidden tw-bg-black tw-px-3 tw-py-6 sm:tw-px-4"
>
	<div class="auth-card tw-mx-auto tw-w-full tw-max-w-md">
		<div class="logo-circle" aria-hidden="true"><i class="ph ph-soccer-ball"></i></div>
		<h2 class="auth-title">SSTRACKER</h2>
		<p class="auth-subtitle">Skills &amp; Workout Tracker</p>

		<div class="tw-mx-auto tw-flex tw-w-full tw-min-w-0 tw-max-w-[400px] tw-flex-col tw-gap-6">
			<!-- Adult clearance -->
			<section class="tw-min-w-0" aria-labelledby="lg-adult">
				<p class="tw-mb-2 tw-text-center tw-text-[0.6rem] tw-font-extrabold tw-uppercase tw-tracking-[0.28em] tw-text-white/45">
					Adult clearance
				</p>
				<h3 id="lg-adult" class="tw-sr-only">Directors, coaches, parents</h3>
				<div class="tw-flex tw-flex-col tw-gap-3">
					<button
						type="button"
						class="primary-btn btn-google tw-w-full tw-transform-gpu {gateCtl}"
						onclick={handleGoogleLogin}
					>
						<img
							src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
							width="18"
							alt=""
						/>
						Continue with Google
					</button>

					<div class="auth-divider">
						<hr class="divider-line" />
						<span class="divider-text">OR</span>
						<hr class="divider-line" />
					</div>

					<input
						type="email"
						class="{gateCtl} tw-bg-white dark:tw-bg-zinc-900/80 tw-text-[var(--text-primary)]"
						placeholder="Email (adults)"
						autocomplete="email"
						bind:value={email}
					/>
					<input
						type="password"
						class="{gateCtl} tw-bg-white dark:tw-bg-zinc-900/80 tw-text-[var(--text-primary)]"
						placeholder="Password"
						autocomplete="current-password"
						bind:value={password}
					/>

					{#if errorMsg}
						<div class="auth-error-msg" role="alert">{errorMsg}</div>
					{/if}

					<button
						type="button"
						class="primary-btn tw-w-full tw-min-h-[3.25rem] tw-px-4 tw-text-base tw-font-bold tw-uppercase tw-tracking-widest {gateCtl}"
						disabled={adultBusy}
						onclick={handleEmailLogin}
					>
						{adultBusy ? 'Authenticating…' : 'Sign in'}
					</button>
					<p class="tw-text-center tw-text-[0.65rem] tw-leading-relaxed tw-text-white/40">
						New adult accounts are issued by your organization. Minors cannot self-register.
					</p>
				</div>
			</section>

			<div class="auth-divider" aria-hidden="true">
				<hr class="divider-line" />
				<span class="divider-text">·</span>
				<hr class="divider-line" />
			</div>

			<!-- Operative dispatch -->
			<section class="tw-min-w-0 tw-rounded-lg tw-border tw-border-cyan-500/25 tw-bg-[#05050a] tw-p-3 tw-shadow-[0_0_20px_rgba(0,212,255,0.08)] sm:tw-p-4" aria-labelledby="lg-op">
				<p class="tw-mb-1 tw-text-center tw-text-[0.6rem] tw-font-extrabold tw-uppercase tw-tracking-[0.28em] tw-text-cyan-300/80">
					Operative dispatch
				</p>
				<h3 id="lg-op" class="tw-mb-2 tw-text-center tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/80">
					Player ingress
				</h3>
				<p class="tw-mb-3 tw-text-center tw-text-[0.7rem] tw-leading-relaxed tw-text-white/45">
					Use the email and dispatch code issued by your parent from the Household Clearance Center. No
					public registration.
				</p>
				<div class="tw-flex tw-flex-col tw-gap-3">
					<input
						type="email"
						class="{gateCtl} tw-border-cyan-500/20 tw-bg-black tw-text-white"
						placeholder="Operative email"
						autocomplete="email"
						inputmode="email"
						bind:value={opEmail}
					/>
					<input
						type="text"
						class="{gateCtl} tw-border-cyan-500/20 tw-bg-black tw-font-mono tw-tracking-wider tw-text-cyan-200"
						placeholder="Dispatch code"
						autocomplete="one-time-code"
						inputmode="text"
						spellcheck="false"
						bind:value={dispatchCode}
					/>
					{#if opError}
						<div class="auth-error-msg" role="alert">{opError}</div>
					{/if}
					<button
						type="button"
						class="tw-w-full tw-min-h-[3.25rem] tw-border tw-border-cyan-500/40 tw-bg-black tw-px-4 tw-text-sm tw-font-extrabold tw-uppercase tw-tracking-[0.2em] tw-text-cyan-200 tw-shadow-[0_0_18px_rgba(0,212,255,0.15)] tw-transition-all hover:tw-shadow-[0_0_28px_rgba(0,212,255,0.28)] disabled:tw-opacity-40"
						disabled={opBusy}
						onclick={handleOperativeLogin}
					>
						{opBusy ? 'Verifying…' : 'Enter clearance'}
					</button>
				</div>
			</section>
		</div>
	</div>

	{#if showPwaPrompt}
		<div class="pwa-prompt tw-mt-5">
			<h3 class="pwa-title">Install the app</h3>
			<p class="pwa-text">To login and save your stats securely, install the app to your device.</p>
			<div class="pwa-box">
				<b>iOS / iPhone:</b> Tap the <b>Share</b> icon below, then tap <b>Add to Home Screen</b>.<br /><br />
				<b>Android:</b> Tap the 3 dots menu and select <b>Install App</b>.
			</div>
			<button class="secondary-btn tw-w-full {gateCtl}" onclick={dismissPwa}>Continue in browser</button>
		</div>
	{/if}
</div>

<style>
	.auth-card {
		max-width: 100%;
	}
</style>
