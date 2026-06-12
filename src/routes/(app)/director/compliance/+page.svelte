<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { pickDirectorClubId } from '$lib/director/pickDirectorClubId.js';
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

	const clubId = $derived(pickDirectorClubId(teamsStore, authStore, workspaceContextStore));
</script>

<div class="coach-clearance-director-stack">
	<CoachClearancePanopticon {clubId} />
	<DirectorBillingAuditPanel clubId={clubId || ''} />
</div>
