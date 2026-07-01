<script lang="ts">
	/**
	 * SSTracker — Marketing Landing Page (Shell)
	 * Pre-rendered (SSR/static) for SEO and LCP.
	 */
	import LandingHero from '$lib/components/marketing/landing/LandingHero.svelte';
	import CompetitivePositionPanel from '$lib/components/marketing/landing/CompetitivePositionPanel.svelte';
	import PoweredByStrip from '$lib/components/marketing/landing/PoweredByStrip.svelte';
	import IntegrationsBar from '$lib/components/marketing/landing/IntegrationsBar.svelte';
	import FeatureBento from '$lib/components/marketing/landing/FeatureBento.svelte';
	import StakeholderBento from '$lib/components/marketing/landing/StakeholderBento.svelte';
	import BusinessModelPanel from '$lib/components/marketing/landing/BusinessModelPanel.svelte';
	import TrustStripPanel from '$lib/components/marketing/landing/TrustStripPanel.svelte';
	import FinalCtaPanel from '$lib/components/marketing/landing/FinalCtaPanel.svelte';
	import { WIN_MESSAGE } from '$lib/components/marketing/landing/landingContent.js';

	export const prerender = true;
</script>

<svelte:head>
	<title>SSTracker — Club platform for athlete development & compliance</title>
	<meta
		name="description"
		content="SSTracker runs your athletes' development with household-first compliance, coach intent, and parent co-op — the club OS youth sports needs beyond schedule-only tools."
	/>
	<meta property="og:title" content="SSTracker — Athlete development & compliance for youth clubs" />
	<meta property="og:description" content={WIN_MESSAGE} />
	<meta property="og:type" content="website" />

	<link rel="preload" as="image" href="/marketing/hero-poster.svg" fetchpriority="high" type="image/svg+xml" />
</svelte:head>

<div class="landing-shell tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#0B0F19] tw-text-slate-100">
	<LandingHero />
	<CompetitivePositionPanel />
	<PoweredByStrip />
	<IntegrationsBar />
	<FeatureBento />
	<StakeholderBento />
	<BusinessModelPanel />
	<TrustStripPanel />
	<FinalCtaPanel />
</div>
