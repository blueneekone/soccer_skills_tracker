<script lang="ts">
	/**
	 * SSTracker — Marketing Landing Page (Shell)
	 * Tactical SIEM Architecture — Vanguard Protocol Adherent
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

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#020617] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#14b8a6] tw-selection:text-[#020617]">
	
	<!-- PHASE 1 & 2: ASYMMETRIC HERO & TRUST BAR -->
	<main class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-8">
		
		<!-- Hero Content -->
		<div class="lg:tw-col-span-5 tw-flex tw-flex-col tw-justify-center tw-gap-8">
			<div class="tw-flex tw-items-center tw-gap-3">
				<div class="tw-h-px tw-w-12 tw-bg-[#14b8a6]"></div>
				<span class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-tracking-widest">NEXUS COMMAND V5</span>
			</div>
			<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight">
				The ultimate operating system for elite youth clubs.
			</h1>
			<p class="tw-text-[#94a3b8] tw-text-lg tw-max-w-md">
				Absolute operational mastery. Scale your academy with zero friction, mathematical compliance, and military-grade data liquidity.
			</p>
			<a href="/login" class="tw-w-fit tw-flex tw-items-center tw-gap-3 tw-bg-[#f8fafc] tw-text-[#0f172a] hover:tw-bg-[#e2e8f0] tw-px-8 tw-py-4 tw-rounded-sm tw-font-mono tw-font-bold tw-text-sm tw-uppercase tw-tracking-wider tw-transition-colors">
				Deploy Your Club
				<Icon name={"nav.chevron-right" as IconName} strokeWidth={2.5} size={18} />
			</a>
		</div>

		<!-- Asymmetric Video Loop Container -->
		<div class="lg:tw-col-span-7 tw-relative tw-w-full tw-aspect-video tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden tw-group">
			<div class="tw-absolute tw-inset-0 tw-bg-gradient-to-tr tw-from-[#020617]/80 tw-to-transparent tw-z-10 tw-pointer-events-none"></div>
			<!-- Tactical Border Accents -->
			<div class="tw-absolute tw-top-0 tw-left-0 tw-w-8 tw-h-8 tw-border-t-2 tw-border-l-2 tw-border-[#14b8a6] tw-z-20"></div>
			<div class="tw-absolute tw-bottom-0 tw-right-0 tw-w-8 tw-h-8 tw-border-b-2 tw-border-r-2 tw-border-[#14b8a6] tw-z-20"></div>
			
			<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-20">
				<button class="tw-bg-[#0f172a]/90 tw-border tw-border-[#1e293b] hover:tw-border-[#14b8a6] tw-rounded-full tw-p-5 tw-text-[#f8fafc] tw-shadow-2xl tw-transition-colors group-hover:tw-text-[#14b8a6]">
					<Icon name={"media.play" as IconName} size={32} strokeWidth={1.5} />
				</button>
			</div>
			<!-- Mocked Product Video -->
			<img src="https://placehold.co/1280x720/0f172a/334155.webp?text=Tactical+SIEM+Video+Loop" alt="SSTracker Tactical SIEM Interface" class="tw-w-full tw-h-full tw-object-cover tw-opacity-60 grayscale group-hover:grayscale-0 tw-transition-all tw-duration-700" loading="eager" />
		</div>

		<!-- Sleek Low-Contrast Trust Bar -->
		<div class="lg:tw-col-span-12 tw-flex tw-flex-wrap tw-items-center tw-gap-x-6 tw-gap-y-2 tw-pt-12 tw-font-mono tw-text-xs tw-text-[#475569] tw-uppercase tw-tracking-widest">
			<span>Powered by:</span>
			<span class="tw-text-[#64748b]">Stripe</span>
			<span class="tw-text-[#334155]">·</span>
			<span class="tw-text-[#64748b]">Checkr</span>
			<span class="tw-text-[#334155]">·</span>
			<span class="tw-text-[#64748b]">Firebase</span>
		</div>
	</main>

	<!-- PHASE 3: BENTO GRID 2.0 (TACTICAL SIEM STYLING) -->
	<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-py-24">
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-4">
			
			<!-- Brutalist Pricing Readout (The $0 Platform Fee) -->
			<div class="md:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#1e293b] tw-pb-4 tw-mb-6">
					<span class="tw-font-mono tw-text-xs tw-text-[#f59e0b] tw-tracking-widest">SYS.PRICING_MODEL</span>
					<Icon name={"status.pulse" as IconName} size={20} class="tw-text-[#f59e0b]" />
				</div>
				<h3 class="tw-text-3xl tw-font-bold tw-text-[#f8fafc] tw-mb-4">The $0 Platform Fee.</h3>
				<p class="tw-text-[#94a3b8] tw-text-base tw-max-w-xl tw-mb-8">
					The core Nexus Command platform is $0 to deploy. We monetize purely via a brutalist, micro-percentage transaction model handled securely through Stripe Connect. Zero hidden feature gates. Zero friction.
				</p>
				<div class="tw-mt-auto tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-p-4 tw-flex tw-items-center tw-justify-between tw-font-mono">
					<span class="tw-text-[#64748b] tw-text-sm">ENTERPRISE LICENSE STATUS</span>
					<span class="tw-text-[#14b8a6] tw-font-bold tw-text-lg">ACTIVE // $0.00 MO</span>
				</div>
			</div>

			<!-- Uncompromised Safety Tile -->
			<div class="md:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-group tw-flex tw-flex-col">
				<div class="tw-font-mono tw-text-xs tw-text-[#64748b] tw-tracking-widest tw-mb-6">SYS.SECURITY</div>
				<Icon name={"security.lock" as IconName} size={32} strokeWidth={1} class="tw-text-[#f8fafc] group-hover:tw-text-[#14b8a6] tw-transition-colors tw-mb-6" />
				<h3 class="tw-text-xl tw-font-bold tw-text-[#f8fafc] tw-mb-3">Uncompromised Safety.</h3>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed">
					Passwordless Email Magic Uplinks paired with WebAuthn (FaceID/TouchID). Strict COPPA 2026 parental consent enforcement.
				</p>
			</div>

			<!-- SafeSport Comms (Shadow CC) -->
			<div class="md:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-group">
				<div class="tw-font-mono tw-text-xs tw-text-[#64748b] tw-tracking-widest tw-mb-6">SYS.COMMS</div>
				<Icon name={"comms.shield" as IconName} size={32} strokeWidth={1} class="tw-text-[#f8fafc] group-hover:tw-text-[#14b8a6] tw-transition-colors tw-mb-6" />
				<h3 class="tw-text-xl tw-font-bold tw-text-[#f8fafc] tw-mb-3">Shadow CC Protocol.</h3>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-6">
					SafeSport compliant. Automatically injects verified guardians into every thread. 1-on-1 adult-to-minor messaging is mathematically blocked.
				</p>
				<div class="tw-flex tw-flex-col tw-gap-3 tw-bg-[#020617] tw-p-4 tw-border tw-border-[#1e293b]">
					<div class="tw-flex tw-items-center tw-justify-between">
						<span class="tw-font-mono tw-text-xs tw-text-[#64748b]">DIRECT_MSG</span>
						<span class="tw-font-mono tw-text-xs tw-text-[#ef4444]">BLOCKED</span>
					</div>
					<div class="tw-flex tw-items-center tw-justify-between">
						<span class="tw-font-mono tw-text-xs tw-text-[#64748b]">SHADOW_CC</span>
						<span class="tw-font-mono tw-text-xs tw-text-[#14b8a6]">ACTIVE</span>
					</div>
				</div>
			</div>

			<!-- Seat Capacity / Gauge Mockup -->
			<div class="md:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-8 hover:tw-border-[#334155] tw-transition-colors tw-flex tw-flex-col lg:tw-flex-row tw-gap-8 tw-items-center">
				<div class="tw-flex-1">
					<div class="tw-font-mono tw-text-xs tw-text-[#64748b] tw-tracking-widest tw-mb-6">SYS.SCALE</div>
					<h3 class="tw-text-xl tw-font-bold tw-text-[#f8fafc] tw-mb-3">Seat Capacity & Scaling</h3>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed">
						As your club's roster grows, manage your scale with usage-based Seat Licenses. Unlock automated field scheduling and advanced coach analytics at peak capacity.
					</p>
				</div>
				<div class="tw-w-full lg:tw-w-64 tw-p-4 tw-bg-[#020617] tw-border tw-border-[#1e293b]">
					<SeatGaugeMockup />
				</div>
			</div>

		</div>
	</section>

</div>
