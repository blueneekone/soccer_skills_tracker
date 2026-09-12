<script lang="ts">
	import { ParentWorkoutEngine } from './ParentWorkoutEngine.svelte';
	import ParentWorkoutArena from './ParentWorkoutArena.svelte';

	const engine = new ParentWorkoutEngine();

	$effect(() => {
		engine.loadChildren();
	});
</script>

<svelte:head>
	<title>Log Workout · Parent OS</title>
</svelte:head>

<ParentWorkoutArena {engine} />
