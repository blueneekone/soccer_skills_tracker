<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';

	// untrack() prevents the URL change from re-triggering this redirect effect.
	$effect(() => {
		if (!browser) return;
		if (authStore.isLoading) return;
		if (!authStore.isAuthenticated || !authStore.isProfileComplete) return;
		const path = untrack(() => applyLoginWaterfall(authStore.role, authStore.userProfile));
		untrack(() => void goto(path, { replaceState: true }));
	});
</script>
