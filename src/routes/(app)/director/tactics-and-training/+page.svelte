<script lang="ts">
	import { TacticsTrainingEngine } from './TacticsTrainingEngine.svelte.js';
	import TacticsTrainingHUD from './TacticsTrainingHUD.svelte';
	import TacticsTrainingArena from './TacticsTrainingArena.svelte';

	const engine = new TacticsTrainingEngine();
</script>

<svelte:head>
	<title>Tactics & Training — Director OS</title>
</svelte:head>

<div class="pd-page-root tw-h-[100dvh] tw-overflow-hidden tw-bg-[#000000] tw-text-[#FAFAFA] tw-flex tw-flex-col">
	<TacticsTrainingHUD {engine} />
	<main class="tw-flex-1 tw-flex tw-flex-col tw-min-w-0 tw-overflow-y-auto">
		<TacticsTrainingArena {engine} />
	</main>
</div>
