<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/coach/tactical' + window.location.search, { replaceState: true });
	});
</script>
