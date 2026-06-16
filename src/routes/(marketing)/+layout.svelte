<script lang="ts">
	import MarketingNav from '$lib/components/marketing/MarketingNav.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';

	let { children } = $props();

	const isPrintRoute = $derived(page.url.pathname.includes('/acquisition/print/'));

	// Client-side auth redirect — if already logged in, skip marketing and go to dashboard.
	// Runs only after hydration so it doesn't block pre-rendering.
	$effect(() => {
		if (!browser) return;
		if (isPrintRoute) return;
		if (authStore.isLoading) return;
		if (authStore.isAuthenticated && authStore.isProfileComplete) {
			goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
		}
	});

	// Post-LCP: activate backdrop-filter after the LCP paint window closes.
	// Two rAF frames ensure we don't trigger compositing during the initial paint.
	$effect(() => {
		if (!browser) return;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				document.body.classList.add('is-hydrated');
			});
		});
	});
</script>

<svelte:head>
	<meta name="theme-color" content="#020617" />
</svelte:head>

{#if !isPrintRoute}
	<MarketingNav />
{/if}

<main class="tw-min-h-dvh" class:tw-bg-slate-950={!isPrintRoute}>
	{@render children()}
</main>

{#if !isPrintRoute}
	<MarketingFooter />
{/if}
