<script lang="ts">
	
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="coach-clearance-shell">
	{@render children?.()}
</div>
