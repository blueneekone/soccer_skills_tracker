<svelte:head>
	<!-- Prevent accidental pinch-zoom on the tactical board touch canvas -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
</svelte:head>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { CoachTacticalEngine } from '../tactical/CoachTacticalEngine.svelte.js';
	import '$lib/styles/coach-tactics-stratagem.css';
	import TacticalArena from '$lib/components/coach/TacticalArena.svelte';
	import TacticalHUD from '$lib/components/coach/TacticalHUD.svelte';
	import { scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	const engine = new CoachTacticalEngine({ isSandbox: true });
	engine.subscribe();
</script>

<svelte:window onkeydown={engine.gridEngine.handleKeyDown} />

<div
	class="coach-tactics-shell pd-page-root tw-fixed tw-inset-0 tw-overflow-hidden tw-font-mono"
	style="z-index: 1050;"
	in:scale={{ duration: 350, start: 0.97, easing: quintOut }}
>
	<div class="tw-absolute tw-top-0 tw-left-0 tw-w-full tw-bg-[#000000] tw-border-b tw-border-[#fbbf24] tw-text-[#fbbf24] tw-text-center tw-font-mono tw-text-xs tw-py-2 tw-z-[9999]">[ SANDBOX MODE // REAL-WORLD ROSTER SYNC DISABLED PENDING BACKGROUND CLEARANCE ]</div>
	<TacticalArena model={engine.gridEngine} warRoomTool={engine.warRoomTool} isHalfField={engine.isHalfField} />
	{#if engine.isToolbarVisible}
		<TacticalHUD
			model={engine.gridEngine}
			isHalfField={engine.isHalfField}
			onToggleHalfField={() => engine.isHalfField = !engine.isHalfField}
			onToggleToolbar={() => engine.isToolbarVisible = !engine.isToolbarVisible}
			onExit={() => { untrack(() => { goto('/coach/dashboard'); }); }}
		/>
	{:else}
		<button
			type="button"
			class="coach-os-action-chip tw-absolute tw-bottom-4 tw-left-4 tw-z-[2000]"
			onclick={() => engine.isToolbarVisible = true}
		>
			<span class="tw-text-[#14b8a6]">↑ SHOW TOOLS</span>
		</button>
	{/if}
</div>
