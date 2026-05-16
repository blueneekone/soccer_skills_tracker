<svelte:head>
	<title>Login · NEXUS COMMAND</title>
</svelte:head>

<script lang="ts">
	import { auth, db } from '$lib/firebase/config';
	import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
	import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
	import { goto } from '$app/navigation';

	let busy = $state(false);
	let error = $state('');
	let magicLinkSent = $state(false);

	const handleGoogleLogin = async () => {
		busy = true;
		error = '';
		try {
			const provider = new GoogleAuthProvider();
			const result = await signInWithPopup(auth, provider);
			const user = result.user;

			await setDoc(
				doc(db, 'users', user.uid),
				{
					email: user.email,
					displayName: user.displayName,
					photoURL: user.photoURL ?? null,
					lastLogin: serverTimestamp(),
				},
				{ merge: true }
			);

			await goto('/home');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Authentication failed. Try again.';
		} finally {
			busy = false;
		}
	};

	const handleMagicLink = () => {
		// Sprint 1.2 — magic link backend not yet implemented
		magicLinkSent = true;
	};
</script>

<div
	class="tw-flex tw-min-h-screen tw-w-full tw-items-center tw-justify-center tw-bg-[#020617] tw-px-4 tw-py-8"
>
	<div
		class="tw-w-full tw-max-w-[26rem] tw-rounded-lg tw-border tw-border-slate-800 tw-bg-slate-900 tw-p-8"
	>
		<!-- Logo mark -->
		<div
			class="tw-mx-auto tw-mb-5 tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-md tw-border tw-border-slate-700 tw-bg-slate-800"
			aria-hidden="true"
		>
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
				<circle cx="12" cy="12" r="10" />
				<path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12" />
				<polygon points="12,6 15,10 12,14 9,10" fill="currentColor" stroke="none" />
			</svg>
		</div>

		<!-- Header group -->
		<h1
			class="tw-m-0 tw-mb-1 tw-text-center tw-font-sans tw-text-base tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-100"
		>
			NEXUS COMMAND
		</h1>
		<p
			class="tw-m-0 tw-mb-6 tw-text-center tw-font-mono tw-text-xs tw-tracking-[0.2em] tw-text-slate-400"
		>
			VANGUARD AUTH PROTOCOL
		</p>

		<!-- Eyebrow separator -->
		<div class="tw-mb-6 tw-border-t tw-border-slate-800"></div>

		<!-- Button 1: Google -->
		<button
			type="button"
			onclick={handleGoogleLogin}
			disabled={busy}
			class="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-justify-center tw-gap-3 tw-min-h-[2.75rem] tw-rounded-md tw-border tw-border-slate-700 tw-bg-slate-800 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-200 tw-transition-colors tw-duration-150 hover:tw-border-teal-600 hover:tw-text-teal-400 disabled:tw-cursor-not-allowed disabled:tw-opacity-50 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500 focus-visible:tw-ring-offset-2 focus-visible:tw-ring-offset-slate-900"
		>
			{#if !busy}
				<svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
					<path
						fill="#4285F4"
						d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
					/>
					<path
						fill="#34A853"
						d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
					/>
					<path
						fill="#FBBC05"
						d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
					/>
					<path
						fill="#EA4335"
						d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
					/>
				</svg>
			{/if}
			{busy ? 'AUTHENTICATING…' : 'AUTHENTICATE VIA GOOGLE'}
		</button>

		<!-- OR divider -->
		<div class="tw-my-4 tw-flex tw-items-center tw-gap-3">
			<hr class="tw-flex-1 tw-border-0 tw-border-t tw-border-slate-800" />
			<span class="tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-slate-500"
				>OR</span
			>
			<hr class="tw-flex-1 tw-border-0 tw-border-t tw-border-slate-800" />
		</div>

		<!-- Button 2: Magic Link -->
		<button
			type="button"
			onclick={handleMagicLink}
			disabled={busy}
			class="tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-justify-center tw-gap-3 tw-min-h-[2.75rem] tw-rounded-md tw-border tw-border-slate-800 tw-bg-slate-900 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-slate-400 tw-transition-colors tw-duration-150 hover:tw-border-slate-700 hover:tw-text-slate-200 disabled:tw-cursor-not-allowed disabled:tw-opacity-50 focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-teal-500 focus-visible:tw-ring-offset-2 focus-visible:tw-ring-offset-slate-900"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<rect x="2" y="4" width="20" height="16" rx="2" />
				<path d="M22 7 L12 13 L2 7" />
			</svg>
			AUTHENTICATE VIA MAGIC LINK
		</button>

		<!-- Magic link sent confirmation -->
		{#if magicLinkSent}
			<p class="tw-mt-3 tw-text-center tw-font-mono tw-text-xs tw-text-slate-400">
				Magic link feature coming in Sprint 1.2.
			</p>
		{/if}

		<!-- Error alert -->
		{#if error}
			<div
				class="tw-mt-4 tw-rounded-md tw-border tw-border-red-500/40 tw-bg-red-950/60 tw-px-3 tw-py-2.5 tw-font-mono tw-text-xs tw-text-red-300"
				role="alert"
			>
				{error}
			</div>
		{/if}

		<!-- Footer -->
		<p
			class="tw-mt-8 tw-text-center tw-font-mono tw-text-[0.6rem] tw-tracking-[0.14em] tw-text-slate-600"
		>
			TACTICAL OPERATIONS PLATFORM
		</p>
	</div>
</div>
