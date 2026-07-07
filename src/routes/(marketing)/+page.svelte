<script lang="ts">
	/**
	 * SSTracker — Marketing Landing Page (Shell)
	 * Strategic Minimalism Architecture — Vanguard Protocol Adherent
	 */
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import SeatGaugeMockup from '$lib/components/marketing/SeatGaugeMockup.svelte';
	
	export const prerender = true;
</script>

<svelte:head>
	<title>SSTracker — The ultimate operating system for elite youth clubs.</title>
	<meta
		name="description"
		content="SSTracker runs your athletes' development with household-first compliance, coach intent, and parent co-op — the club OS youth sports needs beyond schedule-only tools."
	/>
	<meta property="og:title" content="SSTracker — Athlete development & compliance for youth clubs" />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#0B0F19] tw-text-[#FAFAFA] tw-font-sans">
	
	<!-- PHASE 1: HERO & TRUST BAR -->
	<main class="tw-flex tw-flex-col tw-items-center tw-pt-24 tw-px-6 tw-max-w-7xl tw-mx-auto tw-w-full tw-gap-12">
		<!-- Brutalist Sub-10-Word Headline -->
		<header class="tw-text-center tw-flex tw-flex-col tw-items-center tw-gap-6 tw-max-w-4xl">
			<h1 class="tw-text-5xl md:tw-text-7xl tw-font-bold tw-text-[#FAFAFA] tw-tracking-tight tw-leading-[1.1]">
				The ultimate operating system for elite youth clubs.
			</h1>
			<p class="tw-text-[#D4D4D8] tw-text-lg md:tw-text-xl tw-max-w-2xl tw-font-medium">
				Absolute operational mastery. Scale your academy with zero friction, mathematical compliance, and military-grade data liquidity.
			</p>
			<a href="/login" class="tw-mt-4 tw-inline-flex tw-items-center tw-gap-2 tw-bg-[#FAFAFA] tw-text-[#020617] hover:tw-bg-[#D4D4D8] tw-px-8 tw-py-4 tw-rounded-lg tw-font-bold tw-transition-colors">
				Deploy Your Club
				<Icon name={"nav.chevron-right" as IconName} strokeWidth={2} />
			</a>
		</header>

		<!-- Massive Video Loop Container -->
		<div class="tw-w-full tw-aspect-video tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-2xl tw-overflow-hidden tw-relative tw-shadow-2xl tw-group tw-cursor-pointer">
			<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10 tw-bg-[#0B0F19]/40 group-hover:tw-bg-[#0B0F19]/20 tw-transition-colors">
				<div class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-full tw-p-4 tw-text-[#FAFAFA] tw-shadow-lg">
					<Icon name={"media.play" as IconName} size={32} strokeWidth={1.5} />
				</div>
			</div>
			<!-- Placeholder WebP for Tactical SIEM Interface -->
			<img src="https://placehold.co/1920x1080/020617/334155.webp?text=Tactical+SIEM+Interface" alt="SSTracker Tactical SIEM Interface" class="tw-w-full tw-h-full tw-object-cover tw-opacity-80" loading="lazy" />
		</div>

		<!-- Low-Contrast Trust Bar -->
		<div class="tw-flex tw-flex-col tw-items-center tw-gap-4 tw-w-full tw-pt-8 tw-pb-16 tw-border-b tw-border-[#334155]">
			<span class="tw-font-mono tw-text-xs tw-text-[#A1A1AA] tw-uppercase tw-tracking-widest tw-font-bold">Powered by enterprise infrastructure</span>
			<div class="tw-flex tw-items-center tw-gap-12 tw-text-[#A1A1AA] tw-font-bold tw-text-xl tw-font-sans tw-opacity-60 grayscale">
				<span class="tw-flex tw-items-center tw-gap-2"><Icon name={"brand.stripe" as IconName} /> Stripe</span>
				<span class="tw-flex tw-items-center tw-gap-2"><Icon name={"brand.shield" as IconName} /> Checkr</span>
				<span class="tw-flex tw-items-center tw-gap-2"><Icon name={"brand.firebase" as IconName} /> Firebase</span>
			</div>
		</div>
	</main>

	<!-- PHASE 2: ONBOARDING FAQ BENTO GRID 2.0 -->
	<section class="tw-py-24 tw-px-6 tw-max-w-7xl tw-mx-auto tw-w-full">
		<div class="tw-mb-12">
			<span class="tw-font-mono tw-text-xs tw-text-[#A1A1AA] tw-uppercase tw-tracking-widest tw-font-bold">Onboarding & Infrastructure</span>
			<h2 class="tw-text-3xl tw-font-bold tw-text-[#FAFAFA] tw-mt-2">Built for scale, completely frictionless.</h2>
		</div>

		<div class="tw-grid tw-grid-cols-12 tw-gap-6 tw-w-full">
			
			<!-- Director Tile (8-col) -->
			<div class="tw-col-span-12 lg:tw-col-span-8 tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-8 tw-flex tw-flex-col tw-gap-6">
				<div class="tw-flex tw-items-center tw-gap-3 tw-text-[#FAFAFA]">
					<Icon name={"status.success" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#14b8a6]" />
					<h3 class="tw-text-2xl tw-font-bold tw-m-0">Zero Platform Fees.</h3>
				</div>
				<p class="tw-text-[#D4D4D8] tw-text-base tw-max-w-lg">
					The operational software is 100% free for your club. We monetize purely via transaction processing securely handled through Stripe Connect. You never pay for seats, updates, or feature gates.
				</p>
				<div class="tw-mt-auto tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-lg tw-p-4 tw-flex tw-items-center tw-justify-between">
					<span class="tw-font-mono tw-text-xs tw-text-[#A1A1AA]">SSTRACKER ENTERPRISE</span>
					<span class="tw-font-mono tw-text-sm tw-font-bold tw-text-[#FAFAFA]">$0.00 / MO</span>
				</div>
			</div>

			<!-- Parent Tile (4-col) -->
			<div class="tw-col-span-12 lg:tw-col-span-4 tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-8 tw-flex tw-flex-col tw-gap-6">
				<div class="tw-text-[#FAFAFA]">
					<Icon name={"security.lock" as IconName} size={28} strokeWidth={1.5} />
					<h3 class="tw-text-xl tw-font-bold tw-mt-4 tw-mb-2">Uncompromised Safety.</h3>
				</div>
				<p class="tw-text-[#D4D4D8] tw-text-sm">
					Onboarding is completely frictionless. We utilize Passwordless Email Magic Uplinks paired with WebAuthn (FaceID/TouchID) to securely handle strict COPPA 2.0 parental consent. Your family's data is mathematically safe.
				</p>
			</div>

			<!-- Coach Tile (8-col) -->
			<div class="tw-col-span-12 lg:tw-col-span-8 tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-8 tw-flex tw-flex-col md:tw-flex-row tw-gap-8 md:tw-items-center tw-justify-between">
				<div class="tw-flex tw-flex-col tw-gap-4 tw-max-w-2xl">
					<div class="tw-flex tw-items-center tw-gap-3 tw-text-[#FAFAFA]">
						<Icon name={"comms.shield" as IconName} size={28} strokeWidth={1.5} />
						<h3 class="tw-text-2xl tw-font-bold tw-m-0">SafeSport Comms</h3>
					</div>
					<p class="tw-text-[#D4D4D8] tw-text-base">
						Our exclusive <strong>"Shadow CC" protocol</strong> automatically injects verified guardians into every messaging thread. 1-on-1 adult-to-minor messaging is mathematically impossible on the SSTracker platform.
					</p>
				</div>
				<div class="tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-lg tw-p-6 tw-flex tw-flex-col tw-gap-4 tw-w-full md:tw-w-auto">
					<div class="tw-flex tw-items-center tw-justify-between tw-gap-8">
						<span class="tw-font-mono tw-text-xs tw-text-[#A1A1AA]">DIRECT MESSAGE</span>
						<Icon name={"status.blocked" as IconName} size={16} class="tw-text-[#ef4444]" />
					</div>
					<div class="tw-flex tw-items-center tw-justify-between tw-gap-8">
						<span class="tw-font-mono tw-text-xs tw-text-[#A1A1AA]">SHADOW CC GUARDIAN</span>
						<Icon name={"status.success" as IconName} size={16} class="tw-text-[#14b8a6]" />
					</div>
				</div>
			</div>

			<!-- Pricing / Seat Capacity Tile (4-col) -->
			<div class="tw-col-span-12 lg:tw-col-span-4 tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-8 tw-flex tw-flex-col tw-gap-6">
				<div class="tw-flex tw-items-center tw-gap-3 tw-text-[#FAFAFA]">
					<Icon name={"status.pulse" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#14b8a6]" />
					<h3 class="tw-text-xl tw-font-bold tw-m-0">Seat Capacity & Premium Features</h3>
				</div>
				<p class="tw-text-[#D4D4D8] tw-text-sm tw-flex-1">
					The core Nexus Command platform is $0 to deploy. We only collect a fractional transaction fee when you collect payments. As your club's roster grows, manage your scale with usage-based Seat Licenses to unlock Enterprise features like Automated Field Scheduling and Advanced Coach Analytics.
				</p>
				
				<!-- Seat Utilization Gauge Mockup -->
				<SeatGaugeMockup />
			</div>

		</div>
	</section>

	<!-- PHASE 3: THE GAMIFIED PLAYER OS SHOWCASE -->
	<section class="tw-border-t tw-border-[#334155] tw-bg-[#020617] tw-py-24">
		<div class="tw-max-w-7xl tw-mx-auto tw-px-6 tw-w-full">
			<div class="tw-flex tw-flex-col lg:tw-flex-row tw-items-center tw-gap-16">
				
				<div class="tw-flex-1 tw-flex tw-flex-col tw-gap-6">
					<span class="tw-font-mono tw-text-xs tw-text-[#A1A1AA] tw-uppercase tw-tracking-widest tw-font-bold">The Dopamine Engine</span>
					<h2 class="tw-text-4xl md:tw-text-5xl tw-font-bold tw-text-[#FAFAFA] tw-leading-tight">
						Addict your players to their own development.
					</h2>
					<p class="tw-text-[#D4D4D8] tw-text-lg">
						The Player OS isn't just a dashboard—it's a behavioral reinforcement engine. Using dynamic Grit XP, multi-axis Vanguard Prism radar charts, and daily streaks, we drive relentless player engagement. The result? Churn drops to absolute zero.
					</p>
				</div>

				<div class="tw-flex-1 tw-w-full tw-grid tw-grid-cols-2 tw-gap-4">
					<!-- Prism Mock -->
					<div class="tw-col-span-2 sm:tw-col-span-1 tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-xl tw-p-6 tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-4 tw-min-h-[200px]">
						<Icon name={"chart.radar" as IconName} size={48} strokeWidth={1} class="tw-text-[#D4D4D8]" />
						<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#FAFAFA]">6-AXIS VANGUARD PRISM</span>
					</div>
					
					<!-- Grit XP Mock -->
					<div class="tw-col-span-2 sm:tw-col-span-1 tw-flex tw-flex-col tw-gap-4">
						<div class="tw-flex-1 tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-xl tw-p-6 tw-flex tw-flex-col tw-justify-center">
							<span class="tw-font-mono tw-text-xs tw-text-[#A1A1AA] tw-mb-1">CURRENT GRIT</span>
							<span class="tw-font-mono tw-text-3xl tw-font-bold tw-text-[#FAFAFA]">14,250<span class="tw-text-[#A1A1AA] tw-text-lg"> XP</span></span>
						</div>
						<div class="tw-flex-1 tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-xl tw-p-6 tw-flex tw-flex-col tw-justify-center">
							<span class="tw-font-mono tw-text-xs tw-text-[#A1A1AA] tw-mb-2">STREAK</span>
							<div class="tw-flex tw-items-center tw-gap-2">
								<Icon name={"status.fire" as IconName} size={20} class="tw-text-[#F59E0B]" />
								<span class="tw-font-mono tw-text-xl tw-font-bold tw-text-[#FAFAFA]">12 DAYS</span>
							</div>
						</div>
					</div>
				</div>

			</div>
		</div>
	</section>

</div>
