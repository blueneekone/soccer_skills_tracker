<script lang="ts">
	import MarketingNav from '$lib/components/marketing/MarketingNav.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';

	let { children } = $props();

	// Client-side auth redirect — if already logged in, skip marketing and go to dashboard.
	// Runs only after hydration so it doesn't block pre-rendering.
	$effect(() => {
		if (!browser) return;
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
	<meta name="theme-color" content="#010409" />
</svelte:head>

<MarketingNav />

<main>
	{@render children()}
</main>

<MarketingFooter />

<style>
	main {
		min-height: 100dvh;
	}
</style>
