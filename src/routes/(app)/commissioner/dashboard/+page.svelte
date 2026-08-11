<script lang="ts">
	import { untrack } from 'svelte';
	import { CommissionerDashboardEngine } from './CommissionerDashboardEngine.svelte.js';
	import CommissionerDashboardHUD from './CommissionerDashboardHUD.svelte';
	import CommissionerDashboardArena from './CommissionerDashboardArena.svelte';
	import { authStore } from '$lib/stores/auth/facade.svelte.js';

	// The Shell coordinates the Engine, HUD, and Arena.
	// We instantiate the engine with `let` to satisfy Svelte 5 bindability rules.
	let engine = $state(new CommissionerDashboardEngine());

	$effect(() => {
		// Programmatic hydration trigger - B815 compliant
		if (!authStore.isLoading && authStore.isAuthenticated) {
			untrack(() => {
				engine.fetchFederationData();
			});
		}
	});
</script>

<svelte:head>
	<title>Commissioner OS | State-Wide Federation Command</title>
</svelte:head>

<div class="commissioner-dashboard-shell tw-flex tw-flex-col tw-w-full tw-h-full tw-bg-[#000000]">
	<!-- The HUD -->
	<CommissionerDashboardHUD bind:engine />

	<!-- The Glass / Arena -->
	<div class="tw-flex-1 tw-overflow-hidden">
		<CommissionerDashboardArena bind:engine />
	</div>
</div>

<style>
	.commissioner-dashboard-shell {
		border-radius: 0;
	}
</style>
