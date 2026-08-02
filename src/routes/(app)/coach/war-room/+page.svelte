<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	/** WARROOM-SINGLE-SURFACE — legacy route redirects to canonical War Room. */
	onMount(() => {
		if (!browser) return;
		const qs = page.url.searchParams.toString();
		const dest = qs ? `/coach/tactical?${qs}` : '/coach/tactical';
		void goto(dest, { replaceState: true });
	});
</script>
