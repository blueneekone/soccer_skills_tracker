<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
</script>

<svelte:head>
	<title>Director OS — SSTracker</title>
	<meta name="description" content="Director OS: Cell-Based Multi-Tenancy, $0 Platform Fee, and Stripe Financial Telemetry." />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#0f172a] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#a855f7] tw-selection:text-[#0f172a]">
	
	<!-- Header & Cinematic Media -->
	<header class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pt-24 tw-pb-16 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-6">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-[#a855f7]">THE B2B BUYER FUNNEL</span>
		<h1 class="tw-text-5xl md:tw-text-6xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-tight">
			Director OS
		</h1>
		<p class="tw-text-[#94a3b8] tw-text-lg tw-max-w-2xl tw-leading-relaxed tw-mb-8">
			The ultimate B2B operating system. Scale your club with mathematically sound multi-tenancy, risk-free transaction pricing, and embedded Stripe telemetry.
		</p>
		
		<!-- Massive 12-Column Hero Container -->
		<div class="tw-w-full tw-aspect-video tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden tw-relative tw-group">
			<div class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-10">
				<button class="tw-bg-[#0B0F19]/90 tw-border tw-border-[#1e293b] tw-rounded-full tw-p-4 tw-text-[#f8fafc] tw-transition-colors tw-duration-150 group-hover:tw-text-[#a855f7]" aria-label="Play Director OS demo video">
					<Icon name={"status.circle-play" as IconName} size={48} strokeWidth={1} />
				</button>
			</div>
			<img src="https://placehold.co/1920x1080/0f172a/334155.webp?text=[VIDEO_SLOT:+Architecting+Cell-Based+Multi-Tenancy]" alt="Director OS Cinematic Video" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
		</div>
	</header>

	<!-- Bento Grid 2.0 (Asymmetric Spatial Weighting) -->
	<section class="tw-max-w-7xl tw-mx-auto tw-w-full tw-px-6 tw-pb-24">
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-[clamp(1rem,2vw,1.5rem)]">
			
			<!-- $0 Platform Fee - 8 Cols -->
			<div class="md:tw-col-span-8 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"sys.dollar" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#a855f7]" />
					<h2 class="tw-text-2xl tw-font-bold">$0 Platform Fee</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8">
					Zero upfront capital expenditure. Vanguard operates entirely on a transaction-based micro-percentage model. You only pay a fraction of a percent on actual club revenue processed through the system, ensuring our incentives are permanently aligned with your club's growth.
				</p>
			</div>

			<!-- Club Compliance Health Gauges - 4 Cols -->
			<div class="md:tw-col-span-4 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
					<Icon name={"data.pulse" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#14b8a6]" />
					<h2 class="tw-text-xl tw-font-bold">Club Compliance Health</h2>
				</div>
				<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed">
					Instant visibility into your club's SafeSport and VPC compliance percentages via high-density green/amber gauges, serving as your indispensable risk-management dashboard.
				</p>
			</div>

			<!-- Stripe Financial Telemetry - 12 Cols -->
			<div class="md:tw-col-span-12 tw-bg-[#0B0F19] tw-border tw-border-[#1e293b] tw-p-[clamp(1.5rem,3vw,2.5rem)] hover:tw-border-[#334155] tw-transition-colors tw-duration-150 tw-flex tw-flex-col md:tw-flex-row tw-gap-8 tw-items-center">
				<div class="tw-flex-1">
					<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
						<Icon name={"data.chart-line" as IconName} size={28} strokeWidth={1.5} class="tw-text-[#3b82f6]" />
						<h2 class="tw-text-2xl tw-font-bold">Stripe Financial Telemetry</h2>
					</div>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-leading-relaxed tw-mb-8">
						Embedded Stripe integration provides real-time financial tracking directly within the Director OS. Monitor subscriptions, processing volume, and payout schedules through crisp, real-time Chart.js trendlines.
					</p>
					
					<a href="/api/stripe/checkout" class="vanguard-btn-amber tw-w-fit tw-flex tw-items-center tw-gap-3 tw-px-8 tw-py-4 tw-rounded-sm tw-font-mono tw-font-bold tw-text-sm tw-uppercase tw-tracking-wider tw-transition-colors tw-duration-150">
						Deploy Club
						<Icon name={"nav.arrow-right" as IconName} strokeWidth={2.5} size={18} />
					</a>
				</div>
				<div class="tw-flex-1 tw-w-full tw-aspect-video tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-sm tw-overflow-hidden">
					<img src="https://placehold.co/800x450/0f172a/334155.webp?text=[DATA_VISUALIZATION:+Stripe+Telemetry]" alt="Stripe Financial Telemetry" class="tw-w-full tw-h-full tw-object-cover tw-opacity-50" />
				</div>
			</div>

		</div>
	</section>
</div>
