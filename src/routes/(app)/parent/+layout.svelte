<script lang="ts">
	import '$lib/styles/parent-lounge-shell.css';
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="parent-os-root parent-lounge-shell">
	<div class="parent-lounge-z1-well">
		{@render children?.()}
	</div>
</div>
