<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import CoachClearancePanopticon from '$lib/components/compliance/CoachClearancePanopticon.svelte';
	import DirectorBillingAuditPanel from '$lib/components/director/DirectorBillingAuditPanel.svelte';

	export const ssr = false;

	$effect(() => {
		if (authStore.isLoading) return;
		const allowed = ['director', 'registrar', 'super_admin', 'global_admin'];
		if (!authStore.isAuthenticated || !allowed.includes(authStore.role ?? '')) {
			if (browser) untrack(() => goto('/home', { replaceState: true }));
		}
	});

	const clubId = $derived(
		typeof authStore.tenantId === 'string' && authStore.tenantId.trim()
			? authStore.tenantId.trim()
			: (typeof (authStore.userProfile as Record<string, unknown> | null)?.clubId === 'string'
				? ((authStore.userProfile as Record<string, unknown>).clubId as string).trim()
				: ''),
	);
</script>

<CoachClearancePanopticon />

{#if clubId}
	<div style="margin-top: 1.5rem;">
		<DirectorBillingAuditPanel {clubId} />
	</div>
{/if}
