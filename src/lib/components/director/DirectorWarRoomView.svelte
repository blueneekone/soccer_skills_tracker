<script lang="ts">
	import { CoachTacticalEngine } from '../../../routes/(app)/coach/tactical/CoachTacticalEngine.svelte.js';
	import '$lib/styles/coach-tactics-stratagem.css';
	import TacticalArena from '$lib/components/coach/TacticalArena.svelte';
	import TacticalHUD from '$lib/components/coach/TacticalHUD.svelte';

	const engine = new CoachTacticalEngine();
	engine.subscribe();
</script>

<svelte:window onkeydown={engine.gridEngine.handleKeyDown} />

<div class="coach-tactics-shell tw-w-full tw-h-[100dvh] tw-relative tw-overflow-hidden tw-font-mono tw-bg-[#020617] tw-rounded-none">
	<TacticalArena model={engine.gridEngine} warRoomTool={engine.warRoomTool} isHalfField={engine.isHalfField} />
	{#if engine.isToolbarVisible}
		<TacticalHUD
			model={engine.gridEngine}
			isHalfField={engine.isHalfField}
			onToggleHalfField={() => (engine.isHalfField = !engine.isHalfField)}
			onToggleToolbar={() => (engine.isToolbarVisible = !engine.isToolbarVisible)}
		/>
	{:else}
		<button
			type="button"
			class="coach-os-action-chip tw-absolute tw-bottom-4 tw-left-4 tw-z-[2000]"
			onclick={() => (engine.isToolbarVisible = true)}
		>
			<span class="tw-text-[#14b8a6]">↑ SHOW TOOLS</span>
		</button>
	{/if}
</div>
