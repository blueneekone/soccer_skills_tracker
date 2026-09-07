<script lang="ts">
	import { LogWorkoutEngine } from './LogWorkoutEngine.svelte';
	import LogWorkoutArena from './LogWorkoutArena.svelte';

	const engine = new LogWorkoutEngine();

	$effect(() => {
		engine.loadChildren();
	});
</script>

<svelte:head>
	<title>Log Workout · Parent OS</title>
</svelte:head>

<LogWorkoutArena {engine} />
