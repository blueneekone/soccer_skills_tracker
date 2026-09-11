<script lang="ts">
	import type { Snippet } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { featureFlagsStore } from '$lib/stores/featureFlags.svelte.js';
	import MaintenanceGate from '$lib/components/shell/MaintenanceGate.svelte';

	let { children }: { children?: Snippet } = $props();

	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		if (authStore.isLoading) return;

		featureFlagsStore.subscribe();
		return () => {
			featureFlagsStore.teardown();
		};
	});

	const maintenanceLockout = $derived(
		featureFlagsStore.loaded &&
			featureFlagsStore.maintenanceMode &&
			authStore.role !== 'super_admin' &&
			authStore.role !== 'global_admin'
	);
</script>

{#if maintenanceLockout}
	<MaintenanceGate message={featureFlagsStore.maintenanceMessage} />
{:else if children}
	{@render children()}
{/if}
