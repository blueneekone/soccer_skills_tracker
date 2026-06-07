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

<nav class="cc-admin-bc" aria-label="Breadcrumb">
	<a class="cc-admin-bc__link" href="/admin/overview">Global Admin</a>
	<span class="cc-admin-bc__sep" aria-hidden="true">/</span>
	<span class="cc-admin-bc__current">Coach clearance</span>
</nav>

<CoachClearancePanopticon
	headerLabel="GLOBAL ADMIN — COACH CLEARANCE"
	pageTitle="Staff Clearance Matrix"
/>

<style>
	.cc-admin-bc {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.cc-admin-bc__link {
		color: rgba(20, 184, 166, 0.75);
		text-decoration: none;
	}

	.cc-admin-bc__link:hover {
		color: #14b8a6;
	}

	.cc-admin-bc__sep {
		color: rgba(229, 231, 235, 0.25);
	}

	.cc-admin-bc__current {
		color: rgba(229, 231, 235, 0.55);
	}
</style>
