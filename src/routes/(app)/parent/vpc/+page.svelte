<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	$effect(() => {
		untrack(() => {
			goto('/parent/dashboard/vpc', { replaceState: true });
		});
	});
</script>
