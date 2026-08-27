<script lang="ts">
	import { TacticsTrainingEngine } from './TacticsTrainingEngine.svelte';
	import TacticsTrainingHUD from './TacticsTrainingHUD.svelte';
	import TacticsTrainingArena from './TacticsTrainingArena.svelte';

	const engine = new TacticsTrainingEngine();
</script>

<svelte:head>
	<title>Coach • Tactics & Training | SSTracker</title>
</svelte:head>

<div class="pd-tactics-training-root tw-min-h-screen tw-bg-[#000000] tw-text-[#fafafa]">
	<TacticsTrainingHUD {engine} />
	<TacticsTrainingArena {engine} />
</div>
