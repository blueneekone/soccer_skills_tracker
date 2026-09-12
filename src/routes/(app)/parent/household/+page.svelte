<script lang="ts">
	import { ParentHouseholdEngine } from './ParentHouseholdEngine.svelte.js';
	import ParentHouseholdArena from './ParentHouseholdArena.svelte';
	import ParentHouseholdHUD from './ParentHouseholdHUD.svelte';

	const engine = new ParentHouseholdEngine();
	engine.init();
</script>

<ParentHouseholdHUD {engine} />
<ParentHouseholdArena {engine} />
