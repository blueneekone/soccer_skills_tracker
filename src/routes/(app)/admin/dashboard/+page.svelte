<script>
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';

	// Redirect /admin/dashboard to /admin/overview (canonical platform admin dashboard)
	$effect(() => {
		if (browser) untrack(() => goto('/admin/overview', { replaceState: true }));
	});
</script>
