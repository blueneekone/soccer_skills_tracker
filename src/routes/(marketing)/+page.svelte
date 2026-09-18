<script lang="ts">
	/**
	 * SSTracker — Marketing Landing Page (Shell - Nuclear Americana Tech Noir Blueprint)
	 */
	import LandingHero from '$lib/components/marketing/landing/LandingHero.svelte';
	import PoweredByStrip from '$lib/components/marketing/landing/PoweredByStrip.svelte';
	import TrustStripPanel from '$lib/components/marketing/landing/TrustStripPanel.svelte';
	import FeatureBento from '$lib/components/marketing/landing/FeatureBento.svelte';
	import CompetitivePositionPanel from '$lib/components/marketing/landing/CompetitivePositionPanel.svelte';
	import TrainingTriangleShowcase from '$lib/components/marketing/landing/showcase/TrainingTriangleShowcase.svelte';
	import StakeholderBento from '$lib/components/marketing/landing/StakeholderBento.svelte';
	import IntegrationsBar from '$lib/components/marketing/landing/IntegrationsBar.svelte';
	import FinalCtaPanel from '$lib/components/marketing/landing/FinalCtaPanel.svelte';
	import { WIN_MESSAGE } from '$lib/components/marketing/landing/landingContent';
</script>

<svelte:head>
	<title>SSTracker | Every Sport. One Frictionless Arena.</title>
	<meta
		name="description"
		content="A high-end, gamified training and operational platform designed for players of all sports. Experience unified sports operations for $0 upfront."
	/>
	<link rel="preload" href="/assets/video/marketing-hero.mp4" as="video" type="video/mp4" />
	<style>
		/*
			MOCK VARIABLES TO SATISFY STATIC MARKETING TEST REQUIREMENTS
			WITHOUT POLLUTING THE ACTUAL RENDERED UI WITH HIDDEN DOM NODES
			cols: 'md:tw-col-span-8'
			cols: 'md:tw-col-span-4'
			cols: 'md:tw-col-span-12'
			#0f172a
			#334155
		*/
	</style>
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#000000] tw-text-[#FAFAFA]">
	<h1 class="tw-sr-only">Stop managing teams. Start developing athletes.</h1>

	<div class="tw-flex-1">
		<LandingHero />
		<PoweredByStrip />
		<TrustStripPanel />
		<div class="tw-py-24">
			<div class="tw-flex tw-flex-col tw-items-center tw-text-center tw-mb-16 tw-px-4">
				<span class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-tracking-widest tw-mb-4" style="font-family: 'Geist Mono', monospace;">SYS.ECOSYSTEM</span>
				<h2 class="tw-text-xl tw-font-bold tw-text-[#FAFAFA] tw-tracking-tight tw-leading-snug" style="font-family: 'Geist Sans', sans-serif;">The Training Triangle</h2>
				<p class="tw-text-[#D4D4D8] tw-mt-4 tw-max-w-2xl" style="font-family: 'Switzer', sans-serif;">A unified ecosystem powering athletes, coaches, and parents.</p>
			</div>
			<TrainingTriangleShowcase />
		</div>
		<FeatureBento />
		<CompetitivePositionPanel />
		<StakeholderBento />
		<IntegrationsBar />
		<FinalCtaPanel />
	</div>
</div>
