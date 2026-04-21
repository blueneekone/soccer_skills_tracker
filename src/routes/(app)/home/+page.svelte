<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';

	$effect(() => {
		if (!browser) return;
		if (authStore.isLoading) return;
		if (!authStore.isAuthenticated || !authStore.isProfileComplete) return;
		const path = applyLoginWaterfall(authStore.role, authStore.userProfile);
		void goto(path, { replaceState: true });
	});
</script>
