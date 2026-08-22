<!-- 🛡️ SafeSport Compliance Mandate: Secure WebAuthn Verification Protocol Active -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { auth, db } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { loginEngine, userFacingErrorMessage } from '$lib/auth/LoginEngine.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { navigateAfterLogin } from '$lib/auth/postAuthRouting.js';

	type SetupPhase = 'verifying' | 'ready' | 'minor_blocked' | 'unsupported';

	let phase = $state<SetupPhase>('verifying');
	let userDob = $state<string>('');
	let ageError = $state<string>('');

	function calculateAgeInYears(dob: string): number {
		if (!dob) return 0;
		const birthDate = new Date(dob);
		if (isNaN(birthDate.getTime())) return 0;
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		return age;
	}

	function verifyAdultEligibility(dobString: string): boolean {
		if (!dobString) return true;
		const age = calculateAgeInYears(dobString);
		return age >= 18;
	}

	$effect(() => {
		if (!browser) return;
		let cancelled = false;
		void (async () => {
			if (authStore.isLoading) return;
			if (!auth.currentUser) {
				try {
					const storedEmail = window.localStorage.getItem('sstrack_magic_email');
					if (storedEmail && !loginEngine.email) {
						loginEngine.email = storedEmail;
					}
				} catch {
					/* ignore storage restrictions */
				}
				if (!cancelled) phase = 'ready';
				return;
			}
			try {
				const userRef = doc(db, 'users', auth.currentUser.uid);
				const snap = await getDoc(userRef);
				if (snap.exists() && !cancelled) {
					const data = snap.data();
					userDob = typeof data?.dateOfBirth === 'string' ? data.dateOfBirth : '';
					if (userDob && !verifyAdultEligibility(userDob)) {
						phase = 'minor_blocked';
						ageError = 'Biometric passkey enrollment is restricted to verified adult accounts (age 18+).';
						return;
					}
				}
				if (!cancelled) phase = 'ready';
			} catch (err) {
				console.warn('[passkey-setup] profile read warning:', err);
				if (!cancelled) phase = 'ready';
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function handlePasskeyAction(): Promise<void> {
		if (userDob && !verifyAdultEligibility(userDob)) {
			ageError = 'Biometric passkey enrollment is restricted to verified adult accounts (age 18+).';
			phase = 'minor_blocked';
			return;
		}
		try {
			if (auth.currentUser) {
				await loginEngine.registerPasskey();
				if (loginEngine.passkeyRegistered) {
					await navigateAfterLogin({ replaceState: true });
				}
			} else {
				await loginEngine.loginWithPasskey();
				if (!loginEngine.error && authStore.isAuthenticated) {
					await navigateAfterLogin({ replaceState: true });
				}
			}
		} catch (err) {
			loginEngine.error = userFacingErrorMessage(err, 'Passkey verification/setup failed. Try again.');
		}
	}
</script>

<svelte:head>
	<title>Passkey Setup · NEXUS COMMAND</title>
</svelte:head>

<div class="login-surface tw-relative tw-flex tw-min-h-[100dvh] tw-w-full tw-items-center tw-justify-center tw-overflow-hidden tw-bg-[#020617] tw-px-6">
	<!-- Ambient teal glow -->
	<div class="tw-pointer-events-none tw-absolute tw-left-1/2 tw-top-1/2 tw-h-[600px] tw-w-[600px] -tw-translate-x-1/2 -tw-translate-y-1/2 tw-rounded-full tw-bg-[#14b8a614] tw-blur-[120px]"></div>

	<div class="tw-relative tw-z-10 tw-w-full tw-max-w-md">
		<!-- Tactical SIEM style 0px rounded corner card -->
		<div class="bento-panel tw-w-full tw-border tw-border-slate-800 tw-bg-[#0f172a] tw-p-8 tw-rounded-none tw-flex tw-flex-col tw-items-center" style="border-radius: 0px;">
			<div class="tw-mb-4 tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-border tw-border-amber-500/40 tw-bg-amber-500/10">
				<Icon name="status.shield-alert" size={24} class="tw-text-amber-400" />
			</div>

			<h1 class="tw-m-0 tw-mb-2 tw-text-center tw-font-mono tw-text-base tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-amber-400">
				Mandatory Passkey Re-enrollment
			</h1>

			<p class="tw-mb-6 tw-text-center tw-font-mono tw-text-xs tw-leading-relaxed tw-text-slate-400">
				Silent magic link fallback has been blocked for this account. Biometric verification or WebAuthn passkey setup is required to continue.
			</p>

			{#if phase === 'verifying'}
				<div class="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-py-4">
					<div class="tw-h-6 tw-w-6 tw-animate-spin tw-rounded-full tw-border-2 tw-border-[#334155] tw-border-t-[#14b8a6]" role="status" aria-label="Loading"></div>
					<p class="tw-m-0 tw-font-mono tw-text-xs tw-text-slate-400">Verifying credential state…</p>
				</div>
			{:else if phase === 'minor_blocked'}
				<div class="tw-mb-4 tw-w-full tw-border tw-border-red-500/30 tw-bg-red-500/10 tw-p-4 tw-font-mono tw-text-xs tw-text-red-400 tw-text-center" role="alert">
					{ageError}
				</div>
				<button type="button" class="tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-border tw-border-[#1e293b] tw-bg-transparent tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.15em] tw-text-[#475569] hover:tw-bg-[#1e293b] hover:tw-text-[#94a3b8]" onclick={() => void handleSignOut()}>
					Sign Out
				</button>
			{:else if phase === 'ready'}
				{#if !auth.currentUser}
					<div class="tw-mb-4 tw-w-full">
						<input
							type="email"
							placeholder="Confirm Email Address"
							bind:value={loginEngine.email}
							class="tw-h-11 tw-w-full tw-border tw-border-[#334155] tw-bg-transparent tw-px-4 tw-font-mono tw-text-xs tw-text-[#fafafa] tw-outline-none focus:tw-border-[#14b8a6]"
						/>
					</div>
				{/if}

				{#if loginEngine.error}
					<div class="tw-mb-4 tw-w-full tw-border tw-border-red-500/30 tw-bg-red-500/10 tw-p-3 tw-font-mono tw-text-xs tw-text-red-400 tw-text-center" role="alert">
						{loginEngine.error}
					</div>
				{/if}

				<div class="tw-flex tw-w-full tw-flex-col tw-gap-3">
					<button
						type="button"
						class="vanguard-btn-amber tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-px-6 tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.2em] tw-font-bold tw-transition-colors disabled:tw-pointer-events-none disabled:tw-opacity-40"
						disabled={loginEngine.busy}
						onclick={handlePasskeyAction}
					>
						{loginEngine.busy ? 'VERIFYING BIOMETRICS…' : auth.currentUser ? 'SETUP PASSKEY NOW' : 'VERIFY WITH PASSKEY'}
					</button>

					<button
						type="button"
						class="tw-flex tw-h-11 tw-w-full tw-items-center tw-justify-center tw-border tw-border-[#1e293b] tw-bg-transparent tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.15em] tw-text-[#475569] tw-transition-all hover:tw-bg-[#1e293b] hover:tw-text-[#94a3b8]"
						onclick={() => void handleSignOut()}
					>
						Cancel / Return to Sign In
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
