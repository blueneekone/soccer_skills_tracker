<script lang="ts">
	import MarketingNav from '$lib/components/marketing/MarketingNav.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<meta name="theme-color" content="#0B0F19" />
</svelte:head>

<MarketingNav />

<main class="tw-min-h-dvh tw-bg-[#0B0F19] tw-font-mono tw-text-slate-100">
	{@render children()}
</main>

<MarketingFooter />
