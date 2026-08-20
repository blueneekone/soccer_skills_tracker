<script lang="ts">
	import { ClubManagementEngine } from './ClubManagementEngine.svelte.js';
	import ClubManagementHUD from './ClubManagementHUD.svelte';
	import ClubManagementArena from './ClubManagementArena.svelte';

	const engine = new ClubManagementEngine();
</script>

<svelte:head>
	<title>Club Management — Director OS</title>
</svelte:head>

<div class="pd-page-root tw-h-[100dvh] tw-overflow-hidden tw-bg-[#000000] tw-text-[#FAFAFA] tw-flex tw-flex-col">
	<ClubManagementHUD {engine} />
	<main class="tw-flex-1 tw-flex tw-flex-col tw-min-w-0 tw-overflow-y-auto">
		<ClubManagementArena {engine} />
	</main>
</div>
