<script lang="ts">
	/**
	 * /login — Nexus Command Auth Gate
	 * ──────────────────────────────────────────────────────────────────────────
	 * Vanguard Trinity Shell.
	 *
	 * Command surface (adults):
	 *   1. Sign in with Passkey     (WebAuthn → webauthnLoginStart/Finish → customToken)
	 *   2. Send Magic Link           (Firebase email-link → passkey enrollment if needed → /setup)
	 *   3. Legacy email + password   (escape hatch; same passkey mandate as magic link when missing)
	 *   4. Continue with Google      (signInWithPopup — not subject to the email-link passkey gate)
	 *
	 * Operative surface (kids):
	 *   Preserved: Callsign + clearance code → validatePlayerOTP → customToken
	 */
	import { auth, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import {
		signInWithPopup,
		GoogleAuthProvider,
		signInWithCustomToken,
		getRedirectResult,
	} from 'firebase/auth';
	import { navigateAfterLogin } from '$lib/auth/postAuthRouting.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { loginEngine } from '$lib/auth/LoginEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	const validatePlayerOTP = httpsCallable(functions, 'validatePlayerOTP');

	// ── Shared state ──────────────────────────────────────────────────────────
	/** 'operative' = kids (OTP); 'command' = adults (passkey, magic link, Google) */
	let authSurface = $state<'operative' | 'command'>('command');

	/** Operative flow */
	let opUsername = $state('');
	let dispatchCode = $state('');
	let opError = $state('');
	let opBusy = $state(false);

	/** Shared / Command error (Google path) */
	let googleError = $state('');

	/** Shown after soft-delete sign-out (sessionStorage flag from auth store) */
	let accessRevokedBanner = $state(false);
	let showPwaPrompt = $state(false);

	/** Legacy password form (escape hatch; passkey enrollment still required when missing). */
	let legacyPassword = $state('');
	let legacyReveal = $state(false);

	// ── Auto-redirect for already-authenticated users ─────────────────────────
	$effect(() => {
		if (!authStore.isLoading && authStore.isAuthenticated) {
			void navigateAfterLogin({ replaceState: true });
		}
	});

	$effect(() => {
		getRedirectResult(auth).catch(() => {});
		try {
			if (sessionStorage.getItem('sstrack_access_revoked') === '1') {
				accessRevokedBanner = true;
				sessionStorage.removeItem('sstrack_access_revoked');
			}
		} catch {
			/* private mode / denied */
		}
		const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
		const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
		showPwaPrompt = isIos && !isInStandaloneMode && !navigator.userAgent.includes('Chrome');
	});

	const gateCtl =
		'tw-w-full tw-shrink-0 tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border ' +
		'tw-bg-vanguard-bg tw-font-mono tw-px-4 tw-py-3 tw-text-sm tw-text-vanguard-text-primary ' +
		'tw-placeholder-slate-400 tw-transition-colors tw-duration-fast ' +
		'hover:tw-[border-color:var(--vanguard-border-strong)] focus:tw-border-vanguard-accent focus:tw-outline-none ' +
		'focus-visible:tw-ring-1 focus-visible:tw-ring-vanguard-accent focus-visible:tw-ring-offset-2 focus-visible:tw-ring-offset-[#0b1220]';

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

	const handleLegacyLogin = async () => {
		loginEngine.error = '';
		await loginEngine.loginWithEmailPassword(loginEngine.email.trim(), legacyPassword);
	};

	// ── Handlers ──────────────────────────────────────────────────────────────
	const handleGoogleLogin = async () => {
		googleError = '';
		loginEngine.error = '';
		try {
			await signInWithPopup(auth, new GoogleAuthProvider());
		} catch (err) {
			googleError =
				err instanceof Error ? err.message : 'Google sign-in failed.';
		}
	};

	const handleOperativeLogin = async () => {
		opError = '';
		const uname = opUsername.trim();
		const codeRaw = dispatchCode.trim();
		if (!uname || !codeRaw) {
			opError = 'Enter your operative callsign and the 6-character clearance code from a parent.';
			return;
		}
		const alnum = codeRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (alnum.length !== 6) {
			opError = 'The clearance code must be 6 characters (e.g. A7K-2M9).';
			return;
		}
		opBusy = true;
		try {
			const res = await validatePlayerOTP({ username: uname, otpCode: codeRaw });
			const data = res && typeof res === 'object' && 'data' in res ? res.data : res;
			const token =
				data && typeof data === 'object' && 'customToken' in data
					? String((data as { customToken: unknown }).customToken)
					: '';
			if (!token) {
				opError = 'Invalid response from sign-in. Try again.';
				return;
			}
			await signInWithCustomToken(auth, token);
			await authStore.refresh({ silent: true });
		} catch (error) {
			console.error('Operative Login Pipeline Failure:', error);
			opError =
				error instanceof Error ? error.message : 'Sign-in failed. Try again.';
		} finally {
			opBusy = false;
		}
	};

	const dismissPwa = () => { showPwaPrompt = false; };
</script>

<div
	class="tw-box-border tw-flex tw-min-h-screen tw-w-full tw-flex-col tw-items-center tw-justify-center tw-bg-[#0b1220] tw-px-4 tw-py-8 tw-overflow-x-hidden tw-overflow-y-auto sm:tw-px-6 sm:tw-py-10"
>
	<div
		class="tw-flex tw-w-full tw-max-w-[26rem] tw-flex-col tw-text-center tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border tw-bg-vanguard-surface tw-shadow-vanguard-elev-1 tw-p-7 sm:tw-p-8"
	>
		<!-- Logo + wordmark — flat mark, thin rim (strategic minimalism) -->
		<div
			class="tw-mx-auto tw-mb-4 tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border tw-bg-vanguard-bg"
			aria-hidden="true"
		>
			<Icon name="sport.soccer" size={22} class="tw-text-vanguard-text-primary" />
		</div>
		<h2 class="tw-m-0 tw-mb-6 tw-font-mono tw-text-base tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-vanguard-text-primary">
			NEXUS COMMAND
		</h2>

		{#if accessRevokedBanner}
			<div
				class="tw-mb-4 tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/60 tw-px-3 tw-py-2.5 tw-text-left"
				role="alert"
			>
				<p class="tw-m-0 tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-widest tw-text-red-300">
					Access revoked
				</p>
				<p class="tw-m-0 tw-mt-1 tw-font-mono tw-text-xs tw-text-red-200">
					Your account has been suspended. Contact your organization if you believe this is an error.
				</p>
			</div>
		{/if}

		<div class="tw-flex tw-w-full tw-min-w-0 tw-flex-col tw-gap-5">

			<!-- Surface selector tab strip -->
			<div
				class="tw-flex tw-w-full tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border tw-bg-vanguard-bg tw-p-0.5"
				role="tablist"
				aria-label="Operative or command sign-in"
			>
				<button
					type="button"
					role="tab"
					aria-selected={authSurface === 'operative'}
					class="tw-cursor-pointer tw-flex-1 tw-rounded-[0.3125rem] tw-border-0 tw-px-1 tw-py-2.5 tw-text-center tw-font-mono tw-text-[0.55rem] tw-font-bold tw-uppercase tw-leading-tight tw-tracking-[0.1em] tw-transition-colors tw-duration-fast sm:tw-px-2 sm:tw-text-[0.6rem] focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-vanguard-accent focus-visible:tw-ring-inset"
					class:tw-bg-vanguard-surface-raised={authSurface === 'operative'}
					class:tw-text-vanguard-text-primary={authSurface === 'operative'}
					class:tw-text-slate-400={authSurface !== 'operative'}
					onclick={() => { authSurface = 'operative'; loginEngine.error = ''; googleError = ''; }}
				>
					Operative (kids)
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={authSurface === 'command'}
					class="tw-cursor-pointer tw-flex-1 tw-rounded-[0.3125rem] tw-border-0 tw-px-1 tw-py-2.5 tw-text-center tw-font-mono tw-text-[0.55rem] tw-font-bold tw-uppercase tw-leading-tight tw-tracking-[0.1em] tw-transition-colors tw-duration-fast sm:tw-px-2 sm:tw-text-[0.6rem] focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-vanguard-accent focus-visible:tw-ring-inset"
					class:tw-bg-vanguard-surface-raised={authSurface === 'command'}
					class:tw-text-vanguard-text-primary={authSurface === 'command'}
					class:tw-text-slate-400={authSurface !== 'command'}
					onclick={() => { authSurface = 'command'; opError = ''; }}
				>
					Command (adults)
				</button>
			</div>

			<p class="tw-m-0 tw-text-center tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-slate-400">
				{authSurface === 'operative' ? 'Operative login · clearance code' : 'Command login · passkey · magic link · legacy · Google'}
			</p>

			<!-- ── COMMAND SURFACE ───────────────────────────────────────────── -->
			{#if authSurface === 'command'}
				<section class="tw-flex tw-min-w-0 tw-flex-col tw-gap-3" aria-label="Adult passwordless sign-in">

					<!-- 1. WebAuthn / Passkey (primary) -->
					<input
						type="email"
						class={gateCtl}
						placeholder="Email address"
						autocomplete="email"
						bind:value={loginEngine.email}
					/>

					<button
						type="button"
						class={primaryBtn}
						disabled={loginEngine.busy}
						onclick={() => loginEngine.loginWithPasskey()}
					>
						{loginEngine.busy ? 'AUTHENTICATING…' : 'SIGN IN WITH PASSKEY'}
					</button>

					<!-- 2. Magic Link -->
					<button
						type="button"
						class={secondaryBtn}
						disabled={loginEngine.busy}
						onclick={() => loginEngine.sendMagicLink()}
					>
						{loginEngine.magicLinkSent ? 'LINK DISPATCHED — CHECK INBOX' : 'SEND MAGIC LINK'}
					</button>

					{#if loginEngine.magicLinkSent}
						<p class="tw-m-0 tw-font-mono tw-text-[0.65rem] tw-text-slate-400">
							Link dispatched to <span class="tw-text-vanguard-text-primary">{loginEngine.email}</span> — check your inbox.
						</p>
					{/if}

					<details
						class="tw-group tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border tw-bg-vanguard-bg tw-text-left tw-transition-colors open:tw-border-vanguard-border-strong"
						bind:open={legacyReveal}
					>
						<summary
							class="tw-cursor-pointer tw-list-none tw-select-none tw-rounded-md tw-px-4 tw-py-3 tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-400 tw-outline-none hover:tw-text-vanguard-text-primary focus-visible:tw-ring-1 focus-visible:tw-ring-vanguard-accent [&::-webkit-details-marker]:tw-hidden"
						>
							Legacy login — email & password
						</summary>
						<div
							class="tw-flex tw-flex-col tw-gap-3 tw-border-t tw-border-solid tw-border-vanguard-border tw-px-4 tw-py-4"
						>
							<p class="tw-m-0 tw-font-mono tw-text-[0.65rem] tw-leading-relaxed tw-text-slate-500">
								Use the email field above plus your password. After sign-in you'll register a device passkey (required once).
							</p>
							<label class="tw-m-0 tw-block" for="legacy-password">
								<span class="tw-mb-1.5 tw-block tw-font-mono tw-text-[0.58rem] tw-font-bold tw-uppercase tw-tracking-[0.12em] tw-text-slate-400">
									Password
								</span>
								<input
									id="legacy-password"
									type="password"
									class={gateCtl}
									placeholder="Password"
									autocomplete="current-password"
									disabled={loginEngine.busy}
									bind:value={legacyPassword}
								/>
							</label>
							<button
								type="button"
								class={secondaryBtn}
								disabled={loginEngine.busy}
								onclick={handleLegacyLogin}
							>
								LEGACY SIGN IN
							</button>
						</div>
					</details>

					{#if loginEngine.error}
						<div class="tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/60 tw-px-3 tw-py-2 tw-font-mono tw-text-xs tw-text-red-300" role="alert">{loginEngine.error}</div>
					{/if}

					<!-- Divider before Google SSO -->
					<div class="tw-flex tw-items-center tw-gap-3">
						<hr class="tw-flex-1 tw-border-0 tw-border-t tw-border-solid tw-border-vanguard-border" />
						<span class="tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-slate-400">or</span>
						<hr class="tw-flex-1 tw-border-0 tw-border-t tw-border-solid tw-border-vanguard-border" />
					</div>

					<!-- 3. Google (tertiary) -->
					<button
						type="button"
						class="{secondaryBtn} tw-flex tw-w-full tw-items-center tw-justify-center tw-gap-2"
						onclick={handleGoogleLogin}
					>
						<img
							src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
							width="16"
							alt=""
						/>
						Continue with Google
					</button>

					{#if googleError}
						<div class="tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/60 tw-px-3 tw-py-2 tw-font-mono tw-text-xs tw-text-red-300" role="alert">{googleError}</div>
					{/if}
				</section>

			<!-- ── OPERATIVE SURFACE ─────────────────────────────────────────── -->
			{:else}
				<section
					class="tw-min-w-0 tw-shrink-0 tw-border-0 tw-border-t tw-border-solid tw-border-vanguard-border tw-pt-4 tw-text-left"
					aria-label="Operative sign-in with parent clearance code"
				>
					<p class="tw-mb-1 tw-text-center tw-font-mono tw-text-[0.65rem] tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-vanguard-accent">
						Clearance
					</p>
					<p class="tw-mb-3 tw-text-center tw-font-mono tw-text-xs tw-text-slate-400">
						Operative Callsign and 6-character clearance code
					</p>
					<div class="tw-flex tw-flex-col tw-gap-3">
						<label class="tw-m-0 tw-block tw-text-left" for="op-username">
							<span class="tw-mb-1.5 tw-block tw-font-mono tw-text-[0.58rem] tw-font-bold tw-uppercase tw-tracking-[0.12em] tw-text-slate-400">Operative Callsign</span>
							<input
								id="op-username"
								type="text"
								class={gateCtl}
								placeholder="Operative Callsign"
								autocomplete="off"
								inputmode="text"
								spellcheck="false"
								bind:value={opUsername}
							/>
						</label>
						<label class="tw-m-0 tw-block tw-text-left">
							<span class="tw-mb-1.5 tw-block tw-font-mono tw-text-[0.58rem] tw-font-bold tw-uppercase tw-tracking-[0.12em] tw-text-slate-400">Clearance code</span>
							<input
								id="op-clearance"
								type="text"
								class="{gateCtl} tw-tracking-wider"
								placeholder="Clearance code (e.g. A7K-2M9)"
								autocomplete="one-time-code"
								inputmode="text"
								spellcheck="false"
								maxlength="8"
								bind:value={dispatchCode}
							/>
						</label>
						<p class="tw-m-0 tw-text-center tw-font-mono tw-text-[0.7rem] tw-leading-snug tw-text-slate-400">
							Get this temporary 6-character code from your parent.
						</p>
						{#if opError}
							<div class="tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/60 tw-px-3 tw-py-2 tw-font-mono tw-text-xs tw-text-red-300" role="alert">{opError}</div>
						{/if}
						<button
							type="button"
							class={primaryBtn}
							disabled={opBusy}
							onclick={handleOperativeLogin}
						>
							{opBusy ? '…' : 'AUTHENTICATE'}
						</button>
					</div>
				</section>
			{/if}

		</div>
	</div>

	{#if showPwaPrompt}
		<div
			class="tw-mt-8 tw-w-full tw-max-w-[26rem] tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border tw-bg-vanguard-surface tw-p-5 tw-text-left tw-shadow-vanguard-elev-1 tw-font-mono sm:tw-mx-auto"
		>
			<h3 class="tw-m-0 tw-mb-2 tw-text-sm tw-font-bold tw-tracking-wide tw-text-vanguard-text-primary">
				Install the app
			</h3>
			<p class="tw-m-0 tw-mb-3 tw-text-[0.8rem] tw-leading-relaxed tw-text-slate-300">
				To log in and save your stats securely, install the app to your device.
			</p>
			<div
				class="tw-mb-4 tw-rounded-md tw-border tw-border-solid tw-border-vanguard-border tw-bg-vanguard-bg tw-p-3 tw-text-[0.8rem] tw-leading-snug tw-text-slate-300"
			>
				<strong class="tw-text-vanguard-text-primary">iOS / iPhone:</strong> Tap the Share icon, then tap Add to Home Screen.<br /><br />
				<strong class="tw-text-vanguard-text-primary">Android:</strong> Tap the three-dot menu and select Install App.
			</div>
			<button type="button" class="tw-w-full {gateCtl}" onclick={dismissPwa}>Continue in browser</button>
		</div>
	{/if}
</div>
