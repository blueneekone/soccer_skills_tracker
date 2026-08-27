<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';

	$effect(() => {
		if (!browser) return;
		untrack(() => {
			const view = page.url.searchParams.get('view') || page.url.searchParams.get('tab');
			if (view === 'schedule') {
				goto('/coach/logistics?tab=calendar');
			} else if (view === 'designer') {
				goto('/coach/forge?tab=designer');
			} else {
				goto('/coach/forge?tab=library');
			}
		});
	});
</script>

<svelte:head>
	<title>Coach · Redirecting to The Forge · SSTRACKER</title>
</svelte:head>

<div class="tw-p-8 tw-text-center tw-font-mono tw-text-xs tw-text-slate-400">
	Redirecting to Tactical Forge & Playbook Studio…
</div>
