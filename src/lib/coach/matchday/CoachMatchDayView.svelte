<script lang="ts">
	import '$lib/styles/coach-match-day-scoreboard.css';
	import CoachMatchDayViewHUD from './CoachMatchDayViewHUD.svelte';
	import CoachMatchDayViewArena from './CoachMatchDayViewArena.svelte';
	import { CoachMatchDayViewEngine } from './CoachMatchDayViewEngine.svelte.js';

	const engine = new CoachMatchDayViewEngine();
</script>

<div class="coach-match-shell">
	<a href="/coach/dashboard" class="coach-match-exit coach-os-action-chip">HUB</a>
	<CoachMatchDayViewHUD {engine} />
	<CoachMatchDayViewArena {engine} />
</div>
