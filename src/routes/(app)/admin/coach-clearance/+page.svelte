<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import CoachClearancePanopticon from '$lib/components/compliance/CoachClearancePanopticon.svelte';

	export const ssr = false;

	$effect(() => {
		if (authStore.isLoading) return;
		const allowed = ['super_admin', 'global_admin'];
		if (!authStore.isAuthenticated || !allowed.includes(authStore.role ?? '')) {
			if (browser) untrack(() => goto('/home', { replaceState: true }));
		}
	});
</script>

<nav class="coach-clearance-admin-bc" aria-label="Breadcrumb">
	<a class="coach-clearance-admin-bc__link" href="/admin/overview">Global Admin</a>
	<span class="coach-clearance-admin-bc__sep" aria-hidden="true">/</span>
	<span class="coach-clearance-admin-bc__current">Coach clearance</span>
</nav>

<CoachClearancePanopticon
	headerLabel="GLOBAL ADMIN — COACH CLEARANCE"
	pageTitle="Staff Clearance Matrix"
/>
