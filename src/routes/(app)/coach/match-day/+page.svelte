<script lang="ts">
	import { CoachMatchDayView } from '$lib/coach/match-day/index.js';
	import HalftimeChoicePlanner from '$lib/components/coach/halftime-choice-planner.svelte';
</script>

<svelte:head>
	<title>Coach · Match Day · Sideline Terminal</title>
</svelte:head>

<CoachMatchDayView />

<div class="tw-mt-8">
	<HalftimeChoicePlanner />
</div>
