<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import CoachClearancePanopticon from '$lib/components/compliance/CoachClearancePanopticon.svelte';

	export const ssr = false;

	$effect(() => {
		if (authStore.isLoading) return;
		const allowed = ['director', 'registrar', 'super_admin', 'global_admin'];
		if (!authStore.isAuthenticated || !allowed.includes(authStore.role ?? '')) {
			if (browser) untrack(() => goto('/home', { replaceState: true }));
		}
	});
</script>

<CoachClearancePanopticon />
