<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import CoachClearancePanopticon from '$lib/components/compliance/CoachClearancePanopticon.svelte';

	$effect(() => {
		if (authStore.isLoading) return;
		const allowed = ['super_admin', 'global_admin'];
		if (!authStore.isAuthenticated || !allowed.includes(authStore.role ?? '')) {
			if (browser) untrack(() => goto('/admin/overview', { replaceState: true }));
		}
	});
</script>

<div
	class="pd-page-root coach-clearance-shell tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-min-h-0 tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border"
	style="padding: var(--bento-pad-liquid, clamp(20px, 4vw, 32px)); box-sizing: border-box;"
	data-admin-shell="true"
>
	<div class="coach-clearance-page tw-w-full tw-min-w-0 tw-flex tw-flex-col tw-min-h-0 tw-flex-1">
		<div class="coach-clearance-page__inner tw-w-full tw-max-w-none tw-flex tw-flex-col tw-min-h-0 tw-flex-1 tw-overflow-y-auto">
			<CoachClearancePanopticon
				headerLabel="GLOBAL ADMIN — COACH CLEARANCE"
				pageTitle="Staff Clearance Matrix"
			/>
		</div>
	</div>
</div>
