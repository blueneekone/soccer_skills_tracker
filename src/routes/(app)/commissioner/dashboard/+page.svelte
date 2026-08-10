<script lang="ts">
	/**
	 * +page.svelte (Commissioner Dashboard Shell)
	 * Vanguard Trinity Pattern entry point for Commissioner OS.
	 * Coordinates HUD, Engine, and Arena. Handles side-effects securely via untrack().
	 */
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth/facade.svelte';
	import { CommissionerDashboardEngine } from './CommissionerDashboardEngine.svelte.js';
	import CommissionerDashboardHUD from './CommissionerDashboardHUD.svelte';
	import CommissionerDashboardArena from './CommissionerDashboardArena.svelte';

	let engine = new CommissionerDashboardEngine();

	$effect(() => {
		if (authStore.isAuthenticated && authStore.role !== 'commissioner') {
			untrack(() => {
				console.warn('Unauthorized routing violation: Role must be commissioner');
				// In a real app we'd redirect via goto()
			});
		}
	});
</script>

<svelte:head>
	<title>Commissioner OS | State Federation Matrix</title>
</svelte:head>

<div class="tw-w-full tw-h-full tw-flex tw-flex-col tw-bg-[#000000] tw-overflow-hidden tw-rounded-none">
	<CommissionerDashboardHUD />

	<div class="tw-flex-1 tw-overflow-y-auto">
		<!-- Bind engine instance to Glass Arena -->
		<CommissionerDashboardArena bind:engine />
	</div>
</div>
