<script lang="ts">
	/**
	 * Commissioner OS — Shell (+page.svelte)
	 * The Vanguard Trinity Pattern Shell for the Commissioner Dashboard.
	 * Strictly a pure Z0 wrapper with zero inline logic.
	 */
	import CommissionerArena from '$lib/components/commissioner/CommissionerArena.svelte';
	import CommissionerHUD from '$lib/components/commissioner/CommissionerHUD.svelte';
</script>

<svelte:head>
	<title>Commissioner OS | Federation Compliance Matrix</title>
</svelte:head>

<div class="commissioner-matrix-shell tw-h-screen tw-w-full tw-bg-[#000000] tw-text-white tw-overflow-hidden tw-flex tw-flex-col tw-font-sans tw-rounded-none">
	<!-- Commissioner HUD (Header / Command Plane Status) -->
	<CommissionerHUD />

	<!-- Commissioner Arena (Matrix / Data Plane) -->
	<main class="tw-flex-1 tw-overflow-auto tw-relative">
		<CommissionerArena />
	</main>
</div>

<style>
	.commissioner-matrix-shell {
		border-radius: 0;
	}
</style>

