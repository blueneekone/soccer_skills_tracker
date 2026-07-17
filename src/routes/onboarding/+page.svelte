<script lang="ts">
	// Sprint 1.3 will add: invite-code entry, club selection, profile setup
	// For now this is a holding pattern for authenticated users without a role
	import { goto } from '$app/navigation';
	import { auth } from '$lib/firebase.js';
	import { signOut } from 'firebase/auth';
</script>

<svelte:head>
	<title>Onboarding · NEXUS COMMAND</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="tw-min-h-screen tw-bg-[#020617] tw-flex tw-items-center tw-justify-center tw-px-4">
	<div class="tw-w-full tw-max-w-[26rem] tw-bg-slate-900 tw-border tw-border-slate-800 tw-rounded-lg tw-p-8 tw-flex tw-flex-col tw-gap-6">

		<!-- Shield icon -->
		<div class="tw-flex tw-items-center tw-justify-center tw-h-[40px] tw-w-[40px] tw-rounded-md tw-bg-slate-800 tw-border tw-border-slate-700 tw-self-start">
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

		<!-- Heading + eyebrow -->
		<div class="tw-flex tw-flex-col tw-gap-1">
			<p class="tw-font-mono tw-text-xs tw-tracking-[0.2em] tw-text-slate-500 tw-uppercase tw-m-0">
				VANGUARD ONBOARDING PROTOCOL
			</p>
			<h1 class="tw-font-mono tw-text-base tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-100 tw-m-0">
				AWAITING ASSIGNMENT
			</h1>
		</div>

		<!-- Divider -->
		<hr class="tw-border-t tw-border-slate-800 tw-m-0" />

		<!-- Body text -->
		<p class="tw-font-mono tw-text-sm tw-leading-relaxed tw-text-slate-400 tw-m-0">
			Your account has been authenticated. An administrator will assign your role and grant access
			to your command surface.
		</p>

		<!-- Status chip -->
		<div class="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-md tw-border tw-border-slate-700 tw-bg-slate-800 tw-px-3 tw-py-1.5 tw-self-start">
			<span class="tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-teal-500 tw-animate-pulse"></span>
			<span class="tw-font-mono tw-text-[0.6rem] tw-font-bold tw-uppercase tw-tracking-[0.16em] tw-text-slate-300">
				PENDING ROLE ASSIGNMENT
			</span>
		</div>

		<!-- Sign out button -->
		<button
			type="button"
			onclick={async () => {
				await signOut(auth);
				await goto('/login', { replaceState: true });
			}}
			class="tw-font-mono tw-text-[0.65rem] tw-font-bold tw-uppercase tw-tracking-[0.18em] tw-text-slate-600 tw-no-underline tw-transition-colors tw-duration-150 hover:tw-text-slate-300 tw-text-left tw-bg-transparent tw-border-none tw-cursor-pointer tw-p-0"
		>
			← Sign out and return to login
		</button>

	</div>
</div>
