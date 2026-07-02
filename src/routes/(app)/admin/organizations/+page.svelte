<script lang="ts">
	import { AdminOrgsEngine } from './AdminOrgsEngine.svelte.js';
	import AdminOrgsHUD from './AdminOrgsHUD.svelte';
	import AdminOrgsArena from './AdminOrgsArena.svelte';
	import OrganizationSidecar from '$lib/components/admin/OrganizationSidecar.svelte';
	import { patchClubLocally } from '$lib/admin/organizationsFilters.js';

	import '$lib/styles/enterprise-console.css';
	import '$lib/styles/admin-organizations.css';

	const engine = new AdminOrgsEngine();
	engine.subscribe();
</script>

<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6 tw-w-full">
	<div class="xl:tw-col-span-8 tw-min-w-0">
		<section class="tw-w-full orgs-panel orgs3-page">
			<AdminOrgsHUD {engine} />
			<AdminOrgsArena {engine} />
		</section>
	</div>
	
	<aside class="xl:tw-col-span-4 tw-min-w-0 tw-flex tw-flex-col tw-h-full">
		<OrganizationSidecar
			open={engine.editingClub !== null}
			club={engine.editingClub}
			onClose={engine.closeEdit}
			onSaved={(updated) => {
				engine.clubs = patchClubLocally(engine.clubs, updated);
			}}
		/>
		
		{#if !engine.editingClub}
			<div class="cc-chart-card cc-chart-card--soc tw-h-full tw-flex tw-items-center tw-justify-center tw-text-vanguard-text-muted" data-admin-shell="true">
				Select an organization to view details
			</div>
		{/if}
	</aside>
</div>
