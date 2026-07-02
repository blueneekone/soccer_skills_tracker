<script lang="ts">
	import type { RebatesEngine } from './RebatesEngine.svelte.js';

	let { engine }: { engine: RebatesEngine } = $props();
</script>

<header class="page-header">
	<div>
		<h1 class="page-title">Hotel Rebate CSV Upload</h1>
		<p class="page-subtitle">
			Fallback console for filing hotel block rebates without a partner API integration.
		</p>
	</div>
</header>

{#if engine.globalError}
	<div class="alert alert-error">{engine.globalError}</div>
{/if}
