<script lang="ts">
	import AdminDashboardEngine from './AdminDashboardEngine.svelte.js';
	import AdminDashboardHUD from './AdminDashboardHUD.svelte';
	import AdminOverviewArena from './AdminOverviewArena.svelte';

	// The Shell (+page.svelte) acts purely as an unauthenticated-safe Z0 wrapper
	// that instantiates the Engine and mounts the HUD and Arena.
	const engine = new AdminDashboardEngine();
</script>

<div class="pd-page-root tw-min-h-screen tw-bg-[#000000] tw-text-[#FAFAFA] tw-flex tw-flex-col">
	<AdminDashboardHUD {engine} />
	<main class="tw-flex-1 tw-flex tw-flex-col tw-min-w-0">
		<AdminOverviewArena {engine} />
	</main>
</div>
