<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, untrack } from 'svelte';

	onMount(() => {
		untrack(() => goto('/coach/tactical' + window.location.search, { replaceState: true }));
	});
</script>
