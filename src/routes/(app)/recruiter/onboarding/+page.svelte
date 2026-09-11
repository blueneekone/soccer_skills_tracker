<script lang="ts">
	import { RecruiterOnboardingEngine } from './RecruiterOnboardingEngine.svelte.js';
	import RecruiterOnboardingArena from './RecruiterOnboardingArena.svelte';
	import RecruiterOnboardingHUD from './RecruiterOnboardingHUD.svelte';

	const engine = new RecruiterOnboardingEngine();
	engine.subscribe();
</script>

<svelte:head>
	<title>Recruiter Vetting & Onboarding · NEXUS COMMAND</title>
</svelte:head>

<div class="ro-shell tw-flex tw-flex-col tw-h-[100dvh] tw-overflow-hidden tw-bg-[#020617] tw-text-white">
	<header class="tw-p-4 tw-border-b tw-border-slate-800 tw-bg-slate-900/50 tw-backdrop-blur">
		<h1 class="tw-font-mono tw-text-lg tw-font-bold tw-text-[#fbbf24] tw-tracking-wide tw-uppercase">
			RECRUITER VETTING PORTAL
		</h1>
		<p class="tw-text-xs tw-text-slate-400 tw-font-mono">
			Checkr National Criminal Database Verification Protocol
		</p>
	</header>
	<div class="tw-flex-1 tw-min-h-0 tw-overflow-y-auto tw-flex tw-items-center tw-justify-center">
		<RecruiterOnboardingArena {engine} />
	</div>
	<RecruiterOnboardingHUD {engine} />
</div>
