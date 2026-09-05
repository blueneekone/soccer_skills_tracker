<script lang="ts">
	import { HouseholdEngine } from './HouseholdEngine.svelte.js';
	import HouseholdArena from './HouseholdArena.svelte';

	const engine = new HouseholdEngine();
	engine.init();
</script>

<HouseholdArena {engine} />
