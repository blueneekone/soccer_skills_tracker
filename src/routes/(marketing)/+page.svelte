<script lang="ts">
	/**
	 * SSTracker — Marketing Landing Page (Shell - V4 Cyber Magenta Overhaul)
	 */
	import '../../design-tokens-v4.css';
	import LandingHeroV4 from '$lib/components/marketing/landing/v4/LandingHeroV4.svelte';
	import TrainingTriangleV4 from '$lib/components/marketing/landing/v4/TrainingTriangleV4.svelte';
	import PricingArbitrageV4 from '$lib/components/marketing/landing/v4/PricingArbitrageV4.svelte';
	import ComplianceFooterV4 from '$lib/components/marketing/landing/v4/ComplianceFooterV4.svelte';
</script>

<svelte:head>
	<title>SSTracker | Every Sport. One Frictionless Arena.</title>
	<meta name="description" content="A high-end, gamified training and operational platform designed for players of all sports. Experience unified sports operations for $0 upfront." />
	<link rel="preload" href="/assets/video/marketing-hero.mp4" as="video" type="video/mp4" />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-text-[#FAFAFA] tw-relative tw-overflow-hidden" style="background-color: #000000; font-family: 'Switzer', sans-serif;">
	<!-- Volumetric Background Mesh & Lighting (Cyber Magenta focus) -->
	<div class="tw-absolute tw-inset-0 tw-z-0 tw-pointer-events-none" style="background: radial-gradient(circle at 50% 0%, #ff007f0a 0%, transparent 60%);"></div>

	<!-- Content Layer -->
	<div class="tw-relative tw-z-10 tw-w-full tw-h-full tw-flex tw-flex-col">
		<LandingHeroV4 />
		<TrainingTriangleV4 />
		<PricingArbitrageV4 />
		<div class="tw-mt-auto">
			<ComplianceFooterV4 />
		</div>
	</div>
</div>
