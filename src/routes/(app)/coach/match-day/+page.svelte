<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	$effect(() => {
		untrack(() => {
			goto('/coach/matchday', { replaceState: true });
		});
	});
</script>

