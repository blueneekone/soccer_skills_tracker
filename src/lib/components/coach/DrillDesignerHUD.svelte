<script lang="ts">
	import type { DrillDesignerEngine } from './DrillDesignerEngine.svelte.ts';

	let { engine }: { engine: DrillDesignerEngine } = $props();
</script>

<div class="card-body">
	<select bind:value={engine.workoutType}>
		<option value="foundation">Brilliant Basics</option>
		<option value="cardio">Cardio / Warm-Up</option>
		<option value="core">Core Strength</option>
		<option value="ball_mastery">Ball Mastery</option>
		<option value="gameday">Gameday Drill</option>
	</select>
	<input type="text" bind:value={engine.workoutName} placeholder="Drill name (required)" />
	<label>Target duration (minutes) <input type="number" bind:value={engine.workoutDuration} min="1" max="120" /></label>
	<textarea bind:value={engine.workoutDesc} rows="3" placeholder="Coaching cues, constraints, progressions…"></textarea>
</div>

<style>
	select, input, textarea { margin-bottom: 10px; }
</style>
