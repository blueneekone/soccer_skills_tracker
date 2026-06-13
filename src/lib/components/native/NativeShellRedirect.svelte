<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		getNativeDefaultRoute,
		isNativeCapacitorShell,
		isNativeParentFirstEntry,
	} from '$lib/native/nativeShell';

	$effect(() => {
		if (!browser || !isNativeCapacitorShell()) return;
		if (authStore.isLoading) return;
		const path = page.url.pathname;
		if (!isNativeParentFirstEntry(path)) return;
		void goto(getNativeDefaultRoute(authStore.isAuthenticated), { replaceState: true });
	});
</script>
