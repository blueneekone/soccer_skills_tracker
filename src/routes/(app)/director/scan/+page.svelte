<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	$effect(() => {
		untrack(() => {
			goto('/director/events', { replaceState: true });
		});
	});
</script>

<div class="tw-p-6 tw-text-[#D4D4D8] tw-bg-[#0f172a] tw-font-mono tw-text-sm">
	Redirecting to Director Events...
</div>
