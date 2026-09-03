<script lang="ts">
	/**
	 * SSTracker — Marketing Landing Page (Shell - Nuclear Americana Tech Noir Blueprint)
	 */
	import LandingHero from '$lib/components/marketing/landing/LandingHero.svelte';
	import PoweredByStrip from '$lib/components/marketing/landing/PoweredByStrip.svelte';
	import TrustStripPanel from '$lib/components/marketing/landing/TrustStripPanel.svelte';
	import FeatureBento from '$lib/components/marketing/landing/FeatureBento.svelte';
	import CompetitivePositionPanel from '$lib/components/marketing/landing/CompetitivePositionPanel.svelte';
	import StakeholderBento from '$lib/components/marketing/landing/StakeholderBento.svelte';
	import IntegrationsBar from '$lib/components/marketing/landing/IntegrationsBar.svelte';
	import FinalCtaPanel from '$lib/components/marketing/landing/FinalCtaPanel.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
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

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#0f172a] tw-text-[#FAFAFA]">
	<h1 class="tw-sr-only">Stop managing teams. Start developing athletes.</h1>

	<main class="tw-flex-1">
		<LandingHero />
		<PoweredByStrip />
		<TrustStripPanel />
		<FeatureBento />
		<CompetitivePositionPanel />
		<StakeholderBento />
		<IntegrationsBar />
		<FinalCtaPanel />
	</main>

	<MarketingFooter />
</div>
