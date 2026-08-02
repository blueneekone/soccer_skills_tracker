<script lang="ts">
	/**
	 * Commissioner OS — Shell (+page.svelte)
	 * The Vanguard Trinity Pattern Shell for the Commissioner Dashboard.
	 * Strictly a pure Z0 wrapper with zero inline logic.
	 */
	import CommissionerArena from '$lib/components/commissioner/CommissionerArena.svelte';
	import CommissionerHUD from '$lib/components/commissioner/CommissionerHUD.svelte';
</script>

<div class="h-screen w-full bg-[#000000] text-[#334155] overflow-hidden flex flex-col font-switzer">
	<!-- Commissioner HUD (Header / Command Plane Status) -->
	<CommissionerHUD />

	<!-- Commissioner Arena (Matrix / Data Plane) -->
	<main class="flex-1 overflow-auto relative">
		<CommissionerArena />
	</main>
</div>
