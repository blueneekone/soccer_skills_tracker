<script lang="ts">
	import { CoachTacticalEngine } from '../../../routes/(app)/coach/tactical/CoachTacticalEngine.svelte.js';
	import TacticalArena from '$lib/components/coach/TacticalArena.svelte';
	import '$lib/styles/coach-tactics-stratagem.css';

	const engine = new CoachTacticalEngine();
	engine.subscribe();
</script>

<svelte:window onkeydown={engine.gridEngine.handleKeyDown} />

<div class="tw-relative tw-w-full tw-h-full tw-min-h-[400px] tw-bg-[#0B0F19] tw-rounded-lg tw-border tw-border-[#1E293B] tw-overflow-hidden">
	<TacticalArena model={engine.gridEngine} warRoomTool={engine.warRoomTool} />
</div>
