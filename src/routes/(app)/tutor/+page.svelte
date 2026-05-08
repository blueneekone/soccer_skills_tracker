<script>
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import TutorDashboard from '$lib/components/tutor/TutorDashboard.svelte';

	const ALLOWED = new Set(['tutor', 'director', 'global_admin', 'super_admin']);

	$effect(() => {
		if (!browser) return;
		if (authStore.isLoading) return;
		if (!ALLOWED.has(authStore.role)) {
			untrack(() => void goto('/settings', { replaceState: true }));
		}
	});

	export const ssr = false;
</script>

<svelte:head>
	<title>Scholar Command · NEXUS</title>
</svelte:head>

{#if !authStore.isLoading}
	<TutorDashboard />
{/if}
