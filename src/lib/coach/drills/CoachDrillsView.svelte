<script lang="ts">
	import '$lib/styles/coach-drill-library.css';
	import CoachDrillsViewHUD from './CoachDrillsViewHUD.svelte';
	import CoachDrillsViewArena from './CoachDrillsViewArena.svelte';
	import { CoachDrillsViewEngine } from './CoachDrillsViewEngine.svelte.js';

	const engine = new CoachDrillsViewEngine();
</script>

<svelte:head>
	<title>Coach · Drill Library & Playbook · SSTRACKER</title>
</svelte:head>

<div class="coach-drill-lib tw-relative tw-h-[100dvh] tw-overflow-hidden tw-w-full tw-px-3 tw-py-6 sm:tw-px-5">
	<section class="cdm-page">
		<CoachDrillsViewHUD {engine} />
		<CoachDrillsViewArena {engine} />
	</section>
</div>

<style>
	.cdm-page {
		--cdm-bg: #000000;
		--cdm-panel: #05050a;
		--cdm-line: rgba(255, 255, 255, 0.1);
		--cdm-cyber: #00d4ff;
		--cdm-toxic: #2dd4bf;
		--cdm-threat: #ff6b00;
		background: var(--cdm-bg);
	}
</style>
