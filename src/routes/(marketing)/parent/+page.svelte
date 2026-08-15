<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
</script>

<svelte:head>
	<title>Parent OS — SSTracker</title>
	<meta name="description" content="Parent OS: COPPA 2.0 WebAuthn biometric enclave, the 15-minute Car Ride Home embargo, and Tremendous API escrow bounties." />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#000000] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#14b8a6] tw-selection:text-[#000000]">
	
	<!-- Header & Cinematic Media -->
	<header class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-6">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-amber-500">THE CO-OP TRUST CENTER</span>
		<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight" style="font-family: 'Geist Sans', sans-serif;">
			Parent OS
		</h1>
		<p class="tw-text-[#94a3b8] tw-text-lg tw-max-w-2xl tw-leading-relaxed tw-mb-8" style="font-family: 'Switzer', sans-serif;">
			Mathematical compliance with COPPA 2.0, the Car Ride Home emotional safety protocol, and Tremendous bounty payouts for verified guardians.
		</p>
		
		<!-- Cinematic Media Container -->
		<div class="tw-w-full tw-max-w-5xl tw-aspect-video tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
			<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10">
				<button class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-colors tw-duration-150 group-hover:tw-text-amber-500 group-hover:tw-border-amber-500" aria-label="Play Parent OS demo">
					<Icon name={"status.circle-play" as IconName} size={48} strokeWidth={1} />
				</button>
			</div>
			<video src="/videos/parent-os-demo.webm" autoplay loop muted playsinline class="tw-w-full tw-h-full tw-object-cover tw-opacity-50"></video>
		</div>
	</header>

	<!-- Bento Grid 2.0 (Asymmetric Spatial Weighting) -->
	<section class="st-bento tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pb-24">
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-[clamp(1rem,2vw,1.5rem)]">
			
			<!-- COPPA 2.0 WebAuthn - 4 Cols -->
			<div class="md:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#14b8a6] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"status.shield-check" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#14b8a6]" />
					<h2 class="tw-text-xl tw-font-bold" style="font-family: 'Geist Sans', sans-serif;">COPPA 2.0 WebAuthn</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-6" style="font-family: 'Switzer', sans-serif;">
					Enforce strict age-gating guardrails. All telemetry collection is paused until an adult's Verifiable Parental Consent (VPC) token is cryptographically signed via WebAuthn biometric enclave.
				</p>
				<div class="tw-mt-auto tw-flex tw-items-center tw-gap-2 tw-font-mono tw-text-xs tw-text-[#14b8a6]">
					<Icon name={"status.verified" as IconName} size={16} />
					<span>Passkey Biometric Attestation</span>
				</div>
			</div>

			<!-- 15-Minute Car Ride Home Embargo - 8 Cols -->
			<div class="md:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#f59e0b] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-6">
					<div class="tw-flex tw-items-center tw-gap-3">
						<Icon name={"sys.eye-off" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#f59e0b]" />
						<h2 class="tw-text-2xl tw-font-bold" style="font-family: 'Geist Sans', sans-serif;">15-Minute Car Ride Home Embargo</h2>
					</div>
					<span class="tw-font-mono tw-text-xs tw-text-[#f59e0b] tw-border tw-border-[#f59e0b]/40 tw-px-2 tw-py-0.5 tw-uppercase tw-tracking-widest">EMBARGO_ACTIVE</span>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-6" style="font-family: 'Switzer', sans-serif;">
					Prioritize emotional safety and cognitive cooldown. The system enforces a strict 15-minute communications blackout period immediately following a match or training session, mathematically preventing impulse messaging and allowing athletes time to decompress.
				</p>
				
				<!-- Cooldown Telemetry Bar -->
				<div class="tw-mt-auto tw-bg-[#020617] tw-border tw-border-[#334155] tw-p-3.5 tw-rounded-sm">
					<div class="tw-flex tw-justify-between tw-items-center tw-font-mono tw-text-xs">
						<span class="tw-text-[#94a3b8]">COOLDOWN COUNTDOWN</span>
						<span class="tw-text-[#f59e0b] tw-font-bold">14:59 REMAINING</span>
					</div>
				</div>
			</div>

			<!-- Tremendous API Escrow Bounties - 12 Cols -->
			<div class="md:tw-col-span-12 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col md:tw-flex-row tw-gap-8 tw-items-center">
				<div class="tw-flex-1">
					<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
						<Icon name={"sys.escrow" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#14b8a6]" />
						<h2 class="tw-text-2xl tw-font-bold" style="font-family: 'Geist Sans', sans-serif;">Tremendous API Escrow Bounties</h2>
					</div>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-6" style="font-family: 'Switzer', sans-serif;">
						Translate digital XP into real-world rewards. Guardians can fund secure escrow bounties via the Tremendous API, automatically issuing digital gift cards or real-world perks when their athlete achieves specific verified milestones.
					</p>
					<a href="/login" class="tw-bg-amber-500 tw-text-[#000000] hover:tw-bg-amber-500/90 tw-px-8 tw-py-3.5 tw-rounded-sm tw-font-mono tw-font-bold tw-text-xs tw-uppercase tw-tracking-wider tw-transition-colors tw-duration-150 tw-inline-flex tw-items-center tw-gap-2 tw-shadow-[0_0_20px_rgba(224,255,0,0.25)]">
						Access Parent Portal
						<Icon name={"nav.chevron-right" as IconName} size={16} />
					</a>
				</div>
				<div class="tw-flex-1 tw-w-full tw-aspect-video tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-sm tw-overflow-hidden">
					<video src="/videos/parent-os-demo.webm" autoplay loop muted playsinline class="tw-w-full tw-h-full tw-object-cover tw-opacity-50"></video>
				</div>
			</div>

		</div>
	</section>
</div>
