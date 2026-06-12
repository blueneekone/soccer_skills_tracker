<script lang="ts">
	import '$lib/styles/coach-clearance-siem.css';
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="coach-clearance-shell">
	{@render children?.()}
</div>
