<script lang="ts">
		import AdminDashboardEngine from './AdminDashboardEngine.svelte';
	import AdminDashboardHUD from './AdminDashboardHUD.svelte';
	import AdminOverviewArena from './AdminOverviewArena.svelte';

	// The Shell (+page.svelte) acts purely as an unauthenticated-safe Z0 wrapper
	// that instantiates the Engine and mounts the HUD and Arena.
	const engine = new AdminDashboardEngine();
</script>

<div class="tw-min-h-screen tw-bg-[#000000] tw-text-[#FAFAFA] tw-font-sans tw-flex tw-flex-col">
	<AdminDashboardHUD {engine} />
	<main class="tw-flex-1 tw-flex tw-flex-col">
		<AdminOverviewArena {engine} />
	</main>
</div>
