<script lang="ts">
	/**
	 * SSTracker / Nexus Command — Marketing Landing Page (Shell)
	 * Vanguard Trinity — Shell layer: mounts presentation modules only.
	 * All state lives inside each module. No logic here.
	 * Pre-rendered (SSR/static) for maximum SEO and LCP performance.
	 */
	import LandingHero from '$lib/components/marketing/landing/LandingHero.svelte';
	import PoweredByStrip from '$lib/components/marketing/landing/PoweredByStrip.svelte';
	import ClientLogoBar from '$lib/components/marketing/landing/ClientLogoBar.svelte';
	import FeatureBento from '$lib/components/marketing/landing/FeatureBento.svelte';
	import StakeholderBento from '$lib/components/marketing/landing/StakeholderBento.svelte';
	import BusinessModelPanel from '$lib/components/marketing/landing/BusinessModelPanel.svelte';
	import TrustStripPanel from '$lib/components/marketing/landing/TrustStripPanel.svelte';
	import FinalCtaPanel from '$lib/components/marketing/landing/FinalCtaPanel.svelte';

	export const prerender = true;
</script>

<svelte:head>
	<title>Nexus Command — Mission Control for Elite Youth Sports Clubs</title>
	<meta
		name="description"
		content="Run your club like a Mission Control. Nexus Command unifies RL adaptive training, Octalysis RPG mechanics, WebAuthn COPPA 2.0, and embedded finance into one zero-liability platform."
	/>
	<meta property="og:title" content="Nexus Command — Mission Control for Elite Youth Sports Clubs" />
	<meta
		property="og:description"
		content="$0 base fee. RL adaptive workouts. Octalysis RPG loop. WebAuthn COPPA 2.0. Cell-isolated multi-tenant architecture."
	/>
	<meta property="og:type" content="website" />

	<!-- LCP critical resource preloads -->
	<link rel="preload" as="image" href="/marketing/hero-poster.svg" fetchpriority="high" type="image/svg+xml" />
</svelte:head>

<div class="landing-shell tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-slate-950 tw-text-slate-100">
	<LandingHero />
	<PoweredByStrip />
	<ClientLogoBar />
	<FeatureBento />
	<StakeholderBento />
	<BusinessModelPanel />
	<TrustStripPanel />
	<FinalCtaPanel />
</div>
