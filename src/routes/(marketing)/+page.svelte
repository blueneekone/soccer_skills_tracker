<script lang="ts">
	/**
	 * SSTracker / Nexus Command — Marketing Landing Page
	 * "The Ultimate Youth Sports Management & Player OS"
	 *
	 * Vanguard Trinity — Shell layer: mounts presentation modules only.
	 * All state lives inside each module. No logic here.
	 * Pre-rendered (SSR/static) for maximum SEO. Auth redirect handled by layout.
	 */

	import LandingHero from '$lib/components/marketing/landing/LandingHero.svelte';
	import BusinessModelPanel from '$lib/components/marketing/landing/BusinessModelPanel.svelte';
	import StakeholderBento from '$lib/components/marketing/landing/StakeholderBento.svelte';
	import TrustStripPanel from '$lib/components/marketing/landing/TrustStripPanel.svelte';
	import FinalCtaPanel from '$lib/components/marketing/landing/FinalCtaPanel.svelte';
</script>

<svelte:head>
	<title>SSTracker — The Ultimate Youth Sports Management & Player OS | Nexus Command</title>
	<meta
		name="description"
		content="SSTracker: Nexus Command unifies zero-liability PII protection, real-life RPG mechanics, RL adaptive training, COPPA 2.0 compliance, and embedded finance into one enterprise SaaS platform for youth sports clubs."
	/>
	<meta property="og:title" content="SSTracker — The Ultimate Youth Sports Management & Player OS" />
	<meta
		property="og:description"
		content="$0 base fee. Octalysis RPG loop. WebAuthn COPPA 2.0. RL adaptive workouts. Tremendous bounties. One platform. Zero compromises."
	/>
	<meta property="og:type" content="website" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="landing-shell">
	<LandingHero />
	<BusinessModelPanel />
	<StakeholderBento />
	<TrustStripPanel />
	<FinalCtaPanel />
</div>

<style>
	.landing-shell {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-height: 100dvh;
	}
</style>
