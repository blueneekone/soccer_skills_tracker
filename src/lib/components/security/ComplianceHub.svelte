<script lang="ts">
	import ComplianceHubHUD from './ComplianceHubHUD.svelte';
	import ComplianceHubArena from './ComplianceHubArena.svelte';
	import { ComplianceHubEngine } from './ComplianceHubEngine.svelte.js';

	const engine = new ComplianceHubEngine();
</script>

<div class="ch-root">
	<ComplianceHubHUD {engine} />
	{#if engine.canAccess}
		<ComplianceHubArena {engine} />
	{/if}
</div>

<style>
	.ch-root {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem;
	}
</style>
