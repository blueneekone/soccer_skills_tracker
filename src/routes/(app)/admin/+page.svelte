<script>
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	// Redirect legacy /admin to the new deep-routed overview page.
	// Uses $effect so it only fires in the browser (SSR safe).
	$effect(() => {
		if (browser) goto('/admin/overview', { replaceState: true });
	});
</script>
