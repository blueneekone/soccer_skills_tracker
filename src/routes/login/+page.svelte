<script>
	import { goto } from '$app/navigation';
	import { auth, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import {
		signInWithPopup,
		GoogleAuthProvider,
		signInWithEmailAndPassword,
		createUserWithEmailAndPassword,
		signInWithCustomToken,
		getRedirectResult,
	} from 'firebase/auth';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { onMount } from 'svelte';

	const validatePlayerOTP = httpsCallable(functions, 'validatePlayerOTP');

	/** 'operative' = kids (OTP); 'command' = adults (email, Google) */
	/** @type {'operative' | 'command'} */
	let authSurface = $state('command');

	/** Adult flow */
	let email = $state('');
	let password = $state('');
	/** @type {boolean} */
	let isSignUp = $state(false);

	/** Operative flow: display name, email, or callsign (matches validatePlayerOTP) */
	let opUsername = $state('');
	/** 6-char OTP (XXX-XXX or XXXXXX) */
	let dispatchCode = $state('');

	let errorMsg = $state('');
	let opError = $state('');
	let showPwaPrompt = $state(false);
	let adultBusy = $state(false);
	let opBusy = $state(false);

	/**
	 * While the email/password handler drives `goto()` (sign-up vs sign-in fork), skip this
	 * effect so it cannot override `/complete-profile` vs `/` (sign-in must not hit complete-profile).
	 */
	let skipPasswordGateAutoRedirect = $state(false);

	$effect(() => {
		if (skipPasswordGateAutoRedirect) return;
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
		skipPasswordGateAutoRedirect = true;
		const wasSignUp = isSignUp;
		try {
			if (isSignUp) {
				await createUserWithEmailAndPassword(auth, email, password);
			} else {
				await signInWithEmailAndPassword(auth, email, password);
			}
			await authStore.refresh({ silent: true });
			// Strict fork: vault creation → complete-profile; sign-in → `/` (root splash routes by profile)
			if (wasSignUp) {
				await goto('/complete-profile', { replaceState: true });
			} else {
				await goto('/', { replaceState: true });
			}
		} catch (err) {
			if (
				err &&
				typeof err === 'object' &&
				'code' in err &&
				(/** @type {*} */(err).code === 'auth/email-already-in-use' ||
					String(/** @type {*} */(err).code).includes('email-already-in-use'))
			) {
				errorMsg = 'This email is already registered. Use Login.';
			} else {
				errorMsg =
					err && typeof err === 'object' && 'message' in err
						? String(/** @type {*} */(err).message)
						: isSignUp
							? 'Account creation failed'
							: 'Sign-in failed';
			}
		} finally {
			adultBusy = false;
			skipPasswordGateAutoRedirect = false;
		}
	};

	/**
	 * @param {unknown} err
	 * @returns {string}
	 */
	function mapOtpSignInError(err) {
		const e = err && typeof err === 'object' ? err : null;
		const fnCode = e && 'code' in e ? String(/** @type {*} */ (e).code) : '';
		const msg = e && 'message' in e ? String(/** @type {*} */ (e).message) : '';
		const m = msg.toLowerCase();

		if (m.includes('code has expired') || (m.includes('expired') && m.includes('code'))) {
			return 'Code Expired';
		}
		if (fnCode === 'functions/not-found') {
			return 'Invalid Username';
		}
		if (fnCode === 'functions/failed-precondition' && m.includes('multiple players')) {
			return 'Use your full sign-in email as username.';
		}
		if (fnCode === 'functions/invalid-argument') {
			return 'Enter your username and a 6-character dispatch code.';
		}
		if (fnCode === 'functions/internal') {
			return 'Sign-in failed. Ask a parent for a new code.';
		}
		if (fnCode === 'functions/permission-denied') {
			if (m.includes('expired')) {
				return 'Code Expired';
			}
			if (m.includes('invalid or expired') || m.includes('invalid code')) {
				return 'Code already used';
			}
			return 'Code already used';
		}
		if (m.includes('invalid or expired') || m.includes('invalid code')) {
			return 'Code already used';
		}
		if (msg && msg.length < 180) {
			return msg;
		}
		return 'Sign-in failed. Try again or ask a parent for a new code.';
	}

	const handleOperativeLogin = async () => {
		errorMsg = '';
		opError = '';
		const uname = opUsername.trim();
		const codeRaw = dispatchCode.trim();
		if (!uname || !codeRaw) {
			opError = 'Enter your username and the 6-character dispatch code from a parent.';
			return;
		}
		/** accept XXX-XXXX or 6 alnum (backend normalizes) */
		const alnum = codeRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (alnum.length !== 6) {
			opError = 'The dispatch code must be 6 letters or numbers (e.g. A7K-2M9).';
			return;
		}
		opBusy = true;
		try {
			/** @type {unknown} */
			const res = await validatePlayerOTP({ username: uname, otpCode: codeRaw });
			const data = res && typeof res === 'object' && 'data' in res ? res.data : res;
			const token =
				data && typeof data === 'object' && 'customToken' in data ?
					String(/** @type {*} */ (data).customToken) :
					'';
			if (!token) {
				opError = 'Invalid response from sign-in. Try again.';
				return;
			}
			await signInWithCustomToken(auth, token);
			await authStore.refresh({ silent: true });
		} catch (err) {
			opError = mapOtpSignInError(err);
		} finally {
			opBusy = false;
		}
	};

	const dismissPwa = () => {
		showPwaPrompt = false;
	};
</script>

<div
	class="login-gate tw-box-border tw-flex tw-min-h-screen tw-w-full tw-flex-col tw-items-stretch tw-overflow-x-hidden tw-overflow-y-auto tw-bg-black"
>
	<div class="auth-card tw-mx-auto tw-flex tw-w-full tw-max-w-md tw-flex-1 tw-flex-col tw-px-4 tw-pt-8 tw-pb-12">
		<div class="logo-circle" aria-hidden="true"><i class="ph ph-soccer-ball"></i></div>
		<h2 class="auth-title">SSTRACKER</h2>

		<div class="tw-flex tw-w-full tw-min-w-0 tw-flex-col tw-gap-4">
			<div
				class="tw-flex tw-w-full tw-rounded-lg tw-border tw-border-cyan-500/50 tw-bg-black/60 tw-p-0.5"
				role="tablist"
				aria-label="Operative or command sign-in"
			>
				<button
					type="button"
					role="tab"
					aria-selected={authSurface === 'operative'}
					class="login-seg__btn tw-cursor-pointer tw-flex-1 tw-rounded-md tw-border-0 tw-px-1 tw-py-2.5 tw-text-center tw-text-[0.55rem] tw-font-extrabold tw-uppercase tw-leading-tight tw-tracking-[0.1em] tw-transition-colors sm:tw-px-2 sm:tw-text-[0.6rem] sm:tw-tracking-[0.12em]"
					class:login-seg__btn--active={authSurface === 'operative'}
					class:login-seg__btn--idle={authSurface !== 'operative'}
					onclick={() => {
						authSurface = 'operative';
						errorMsg = '';
					}}
				>
					Operative (kids)
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={authSurface === 'command'}
					class="login-seg__btn tw-cursor-pointer tw-flex-1 tw-rounded-md tw-border-0 tw-px-1 tw-py-2.5 tw-text-center tw-text-[0.55rem] tw-font-extrabold tw-uppercase tw-leading-tight tw-tracking-[0.1em] tw-transition-colors sm:tw-px-2 sm:tw-text-[0.6rem] sm:tw-tracking-[0.12em]"
					class:login-seg__btn--active={authSurface === 'command'}
					class:login-seg__btn--idle={authSurface !== 'command'}
					onclick={() => {
						authSurface = 'command';
						opError = '';
					}}
				>
					Command (adults)
				</button>
			</div>

			<p class="tw-m-0 tw-text-center tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-cyan-500/80">
				{authSurface === 'operative' ? 'Operative login' : 'Command login · email, Google, password'}
			</p>

			{#if authSurface === 'command'}
				<section class="tw-min-w-0 tw-shrink-0" aria-label="Adult sign-in or create account">
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
							Google
						</button>

						<div class="auth-divider">
							<hr class="divider-line" />
							<span class="divider-text">OR</span>
							<hr class="divider-line" />
						</div>

						<div
							class="tw-flex tw-w-full tw-rounded-lg tw-border tw-border-cyan-500/40 tw-bg-black/50 tw-p-0.5"
							role="tablist"
							aria-label="Login or create vault"
						>
							<button
								type="button"
								role="tab"
								aria-selected={!isSignUp}
								class="login-seg__btn tw-cursor-pointer tw-flex-1 tw-rounded-md tw-border-0 tw-py-2.5 tw-text-center tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-tracking-[0.12em] tw-transition-colors"
								class:login-seg__btn--active={!isSignUp}
								class:login-seg__btn--idle={isSignUp}
								onclick={() => {
									isSignUp = false;
									errorMsg = '';
								}}
							>
								LOGIN
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={isSignUp}
								class="login-seg__btn tw-cursor-pointer tw-flex-1 tw-rounded-md tw-border-0 tw-py-2.5 tw-text-center tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-tracking-[0.12em] tw-transition-colors"
								class:login-seg__btn--active={isSignUp}
								class:login-seg__btn--idle={!isSignUp}
								onclick={() => {
									isSignUp = true;
									errorMsg = '';
								}}
							>
								CREATE VAULT
							</button>
						</div>

						<input
							type="email"
							class="{gateCtl} tw-bg-white dark:tw-bg-zinc-900/80 tw-text-[var(--text-primary)]"
							placeholder="Email"
							autocomplete="email"
							bind:value={email}
						/>
						<input
							type="password"
							class="{gateCtl} tw-bg-white dark:tw-bg-zinc-900/80 tw-text-[var(--text-primary)]"
							placeholder="Password"
							autocomplete={isSignUp ? 'new-password' : 'current-password'}
							bind:value={password}
						/>

						{#if errorMsg}
							<div class="auth-error-msg" role="alert">{errorMsg}</div>
						{/if}

						<button
							type="button"
							class="tw-w-full tw-min-h-[3.5rem] tw-rounded-lg tw-border-2 tw-border-cyan-400/70 tw-bg-cyan-500/10 tw-px-4 tw-text-base tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-cyan-200 tw-shadow-[0_0_24px_rgba(34,211,238,0.18)] tw-transition hover:tw-border-cyan-300 hover:tw-bg-cyan-500/20 hover:tw-text-cyan-50 disabled:tw-opacity-50"
							disabled={adultBusy}
							onclick={handleEmailLogin}
						>
							{adultBusy ? 'WORKING…' : isSignUp ? 'INITIALIZE VAULT' : 'AUTHENTICATE'}
						</button>
					</div>
				</section>
			{:else}
				<section
					class="tw-min-w-0 tw-shrink-0 tw-rounded-lg tw-border tw-border-cyan-500/20 tw-bg-[#05050a] tw-p-3"
					aria-label="Operative sign-in with parent dispatch"
				>
					<p
						class="tw-mb-1 tw-text-center tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-tracking-[0.2em] tw-text-cyan-400/80"
					>
						Dispatch
					</p>
					<p class="tw-mb-3 tw-text-center tw-text-xs tw-text-white/45">Username and 6-character code</p>
					<div class="tw-flex tw-flex-col tw-gap-3">
						<label class="tw-m-0">
							<span class="login-field-label">Username</span>
							<input
								id="op-username"
								type="text"
								class="{gateCtl} tw-border-cyan-500/20 tw-bg-black tw-text-white"
								placeholder="Name or sign-in email"
								autocomplete="username"
								inputmode="text"
								bind:value={opUsername}
							/>
						</label>
						<label class="tw-m-0">
							<span class="login-field-label">Dispatch code</span>
							<input
								id="op-dispatch"
								type="text"
								class="{gateCtl} tw-border-cyan-500/20 tw-bg-black tw-font-mono tw-tracking-wider tw-text-cyan-200"
								placeholder="e.g. A7K-2M9"
								autocomplete="one-time-code"
								inputmode="text"
								spellcheck="false"
								maxlength="8"
								bind:value={dispatchCode}
							/>
						</label>
						{#if opError}
							<div class="auth-error-msg" role="alert">{opError}</div>
						{/if}
						<button
							type="button"
							class="tw-w-full tw-min-h-[3.25rem] tw-rounded-lg tw-border tw-border-cyan-500/40 tw-bg-black tw-px-4 tw-text-sm tw-font-extrabold tw-uppercase tw-tracking-[0.15em] tw-text-cyan-200 tw-shadow-[0_0_14px_rgba(0,212,255,0.12)] tw-transition hover:tw-shadow-[0_0_24px_rgba(0,212,255,0.2)] disabled:tw-opacity-40"
							disabled={opBusy}
							onclick={handleOperativeLogin}
						>
							{opBusy ? '…' : 'Sign in'}
						</button>
					</div>
				</section>
			{/if}
		</div>
	</div>

	{#if showPwaPrompt}
		<div class="pwa-prompt tw-mx-auto tw-mt-5 tw-w-full tw-max-w-md tw-px-4">
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
		box-sizing: border-box;
	}

	/* Segmented control: active = cyan; inactive = muted */
	.login-seg__btn--active {
		background: rgba(6, 182, 212, 0.22);
		color: #ecfeff;
		box-shadow: inset 0 0 0 1.5px rgba(34, 211, 238, 0.55);
	}
	.login-seg__btn--idle {
		background: transparent;
		color: rgba(161, 161, 170, 0.9);
	}
	.login-seg__btn--idle:hover {
		color: rgba(228, 228, 231, 0.95);
	}
	.login-field-label {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(103, 232, 249, 0.55);
	}
</style>
