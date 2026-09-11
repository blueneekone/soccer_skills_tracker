<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	$effect(() => {
		untrack(() => {
			goto('/fan/watch', { replaceState: true });
		});
	});
</script>
