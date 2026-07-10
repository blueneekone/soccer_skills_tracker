<svelte:head>
	<!-- Prevent accidental pinch-zoom on the tactical board touch canvas -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
</svelte:head>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { CoachTacticalEngine } from './CoachTacticalEngine.svelte.js';
	import '$lib/styles/coach-tactics-stratagem.css';
	import TacticalArena from '$lib/components/coach/TacticalArena.svelte';
	import DrillDesignerTab from '$lib/components/coach/DrillDesignerTab.svelte';
	import TacticalHUD from '$lib/components/coach/TacticalHUD.svelte';
	import { scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	const engine = new CoachTacticalEngine();
	engine.subscribe();
</script>

<svelte:window onkeydown={engine.gridEngine.handleKeyDown} />

<!--
  War Room Mounting Shell — immersive fullscreen console overlay.
  position:fixed + inset:0 gives the SVG a guaranteed viewport-sized box so
  coordinate math, radial hub, and route drawing all work correctly.
  z-index 1050: above sidebar(50), topbar(60), context-switcher(1000);
  below command palette(9999) so Cmd+K remains accessible.
-->
<div
	class="coach-tactics-shell tw-fixed tw-inset-0 tw-overflow-hidden"
	style="z-index: 1050;"
	in:scale={{ duration: 350, start: 0.97, easing: quintOut }}
>
	<DrillDesignerTab teamId={engine.activeSquadId ?? ''} />

	<button
		type="button"
		class="coach-tac-exit coach-os-action-chip"
		aria-label="Exit War Room"
		onclick={() => goto('/coach')}
	>
		✕ Exit War Room
	</button>
</div>
