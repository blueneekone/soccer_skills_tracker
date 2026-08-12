<script lang="ts">
	import type { AuditLoginEngine } from './AuditLoginEngine.svelte';

	let { engine }: { engine: AuditLoginEngine } = $props();
</script>

{#if engine.errorMsg}
	<p style="color: red;" class="tw-mt-4 tw-font-bold" role="alert">Error: {engine.errorMsg}</p>
{/if}
