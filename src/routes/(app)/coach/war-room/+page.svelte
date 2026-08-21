<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';

	/** WARROOM-SINGLE-SURFACE — canonical route redirects to interactive War Room. */
	onMount(() => {
		if (!browser) return;
		const qs = page.url.searchParams.toString();
		const dest = qs ? `/coach/tactical?${qs}` : '/coach/tactical';
		untrack(() => void goto(dest, { replaceState: true }));
	});
</script>
