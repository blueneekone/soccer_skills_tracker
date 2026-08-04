<script lang="ts">
	/**
	 * Commissioner OS — Shell (+page.svelte)
	 * The Vanguard Trinity Pattern Shell for the Commissioner Dashboard.
	 * Strictly a pure Z0 wrapper with zero inline logic.
	 */
	import CommissionerArena from '$lib/components/commissioner/CommissionerArena.svelte';
	import CommissionerHUD from '$lib/components/commissioner/CommissionerHUD.svelte';
</script>

<div class="tw-h-screen tw-w-full tw-bg-[#000000] tw-text-[#334155] tw-overflow-hidden tw-flex tw-flex-col tw-font-switzer">
	<!-- Commissioner HUD (Header / Command Plane Status) -->
	<CommissionerHUD />

	<!-- Commissioner Arena (Matrix / Data Plane) -->
	<main class="tw-flex-1 tw-overflow-auto tw-relative">
		<CommissionerArena />
	</main>
</div>
