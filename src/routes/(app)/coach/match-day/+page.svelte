<script lang="ts">
	import { CoachMatchDayView } from '$lib/coach/match-day/index.js';
	import HalftimeChoicePlanner from '$lib/components/coach/halftime-choice-planner.svelte';
</script>

<svelte:head>
	<title>Coach • Match Day • Sideline Terminal</title>
</svelte:head>

<div class="tw-p-4">
	<CoachMatchDayView />
	<HalftimeChoicePlanner />
</div>
