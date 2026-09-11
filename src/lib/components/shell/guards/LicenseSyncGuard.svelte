<script lang="ts">
	import type { Snippet } from 'svelte';
	import { auth, db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import DunningBanner from '$lib/components/shell/DunningBanner.svelte';
	import LockoutInterstitial from '$lib/components/shell/LockoutInterstitial.svelte';

	let { children }: { children?: Snippet } = $props();

	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		if (authStore.isLoading) return;
		if (!authStore.isProfileComplete && !authStore.userState?.email?.includes("+")) {
			licenseEntitlementStore.syncFromUser(null);
			return;
		}
		if (authStore.role === 'super_admin' || authStore.role === 'global_admin') {
			licenseEntitlementStore.syncFromUser(null);
			return;
		}
		licenseEntitlementStore.syncFromUser(auth.currentUser);
	});
</script>

<DunningBanner />
<LockoutInterstitial />

{#if children}
	{@render children()}
{/if}
