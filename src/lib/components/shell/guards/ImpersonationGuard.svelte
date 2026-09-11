<script lang="ts">
	import type { Snippet } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import ImpersonationBanner from '$lib/components/shell/ImpersonationBanner.svelte';

	let { children }: { children?: Snippet } = $props();

	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		impersonationStore.init();
		return () => {
			impersonationStore.teardown();
		};
	});
</script>

{#if impersonationStore.active}
	<ImpersonationBanner />
{/if}

{#if children}
	{@render children()}
{/if}
