<script lang="ts">
	import '$lib/styles/coach-os.css';
	import '$lib/styles/coach-shell-dashboard.css';
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="coach-os-root tw-flex tw-flex-col tw-h-full tw-flex-1 tw-min-h-0 tw-min-w-0">
	{@render children?.()}
</div>
