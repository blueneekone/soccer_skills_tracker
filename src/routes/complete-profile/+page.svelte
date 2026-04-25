<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/setup', { replaceState: true });
	});
</script>

<p class="tw-p-6 tw-text-center tw-font-mono tw-text-sm tw-text-zinc-500">Redirecting to setup…</p>
