<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
</script>

<svelte:head>
	<title>Parent OS — SSTracker</title>
	<meta name="description" content="Parent OS: COPPA 2.0 WebAuthn biometric enclave, the 15-minute Car Ride Home embargo, and Tremendous API escrow bounties." />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#0f172a] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#3b82f6] tw-selection:text-[#0f172a]">
	
	<!-- Header & Cinematic Media -->
	<header class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-6">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-[#3b82f6]">THE CO-OP TRUST CENTER</span>
		<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight">
			Parent OS
		</h1>
		<p class="tw-text-[#94a3b8] tw-text-lg tw-max-w-2xl tw-leading-relaxed tw-mb-8">
			Mathematical compliance with COPPA 2.0, the Car Ride Home emotional safety protocol, and Tremendous bounty payouts for verified guardians.
		</p>
		
		<!-- Cinematic Media Container -->
		<div class="tw-w-full tw-max-w-5xl tw-aspect-video tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
			<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10">
				<button class="tw-bg-[#0B0F19]/90 tw-border tw-border-[#1e293b] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-colors tw-duration-150 group-hover:tw-text-[#3b82f6]" aria-label="Play Parent OS demo video">
					<Icon name={"status.circle-play" as IconName} size={48} strokeWidth={1} />
				</button>
			</div>
			<img src="https://placehold.co/1920x1080/0f172a/334155.webp?text=[VIDEO_SLOT:+The+Parent+OS]" alt="Parent OS Cinematic Video" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
		</div>
	</header>

	<!-- Bento Grid 2.0 (Asymmetric Spatial Weighting) -->
	<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pb-24">
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-[clamp(1rem,2vw,1.5rem)]">
			
			<!-- COPPA 2.0 WebAuthn - 4 Cols -->
			<div class="md:tw-col-span-4 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"status.shield-check" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#3b82f6]" />
					<h2 class="tw-text-xl tw-font-bold">COPPA 2.0 WebAuthn</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed">
					Enforce strict age-gating guardrails. All telemetry collection is paused until an adult's Verifiable Parental Consent (VPC) token is cryptographically signed via WebAuthn biometric enclave.
				</p>
			</div>

			<!-- 15-Minute Car Ride Home Embargo - 8 Cols -->
			<div class="md:tw-col-span-8 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"sys.eye-off" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#3b82f6]" />
					<h2 class="tw-text-2xl tw-font-bold">15-Minute Car Ride Home Embargo</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8">
					Prioritize emotional safety and cognitive cooldown. The system enforces a strict 15-minute communications blackout period immediately following a match or training session, mathematically preventing impulse messaging and allowing athletes time to decompress.
				</p>
			</div>

			<!-- Tremendous API Escrow Bounties - 12 Cols -->
			<div class="md:tw-col-span-12 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col md:tw-flex-row tw-gap-8 tw-items-center">
				<div class="tw-flex-1">
					<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
						<Icon name={"sys.escrow" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#3b82f6]" />
						<h2 class="tw-text-2xl tw-font-bold">Tremendous API Escrow Bounties</h2>
					</div>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed">
						Translate digital XP into real-world rewards. Guardians can fund secure escrow bounties via the Tremendous API, automatically issuing digital gift cards or real-world perks when their athlete achieves specific verified milestones.
					</p>
				</div>
				<div class="tw-flex-1 tw-w-full tw-aspect-video tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden">
					<img src="https://placehold.co/800x450/0f172a/334155.webp?text=[VIDEO_SLOT:+Tremendous+Escrow+Bounties]" alt="Tremendous API Escrow" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
				</div>
			</div>

		</div>
	</section>
</div>
