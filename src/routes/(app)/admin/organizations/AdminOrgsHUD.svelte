<script lang="ts">
	import type { AdminOrgsEngine } from './AdminOrgsEngine.svelte.js';
	import OrganizationsToolbar from '$lib/components/admin/OrganizationsToolbar.svelte';
	import OrganizationsToastStack from '$lib/components/admin/OrganizationsToastStack.svelte';
	import OrganizationsSportTabs from '$lib/components/admin/OrganizationsSportTabs.svelte';

	let { engine }: { engine: AdminOrgsEngine } = $props();
</script>

<OrganizationsToolbar
	clubs={engine.clubs}
	bind:orgSearch={engine.orgSearch}
	clubsLoading={engine.clubsLoading}
	filteredCount={engine.filteredClubs.length}
	totalCount={engine.clubs.length}
	filterOpen={engine.filterOpen}
	filterActiveCount={engine.filterActiveCount}
	bind:filterVerification={engine.filterVerification}
	bind:filterStates={engine.filterStates}
	bind:filterTiers={engine.filterTiers}
	bind:filterRegionQuery={engine.filterRegionQuery}
	bind:filterRootEl={engine.filterRootEl}
	showAddForm={engine.showAddForm}
	onToggleFilter={engine.toggleFilter}
	onCloseFilter={engine.closeFilter}
	onResetFilters={engine.resetFilters}
	onToggleAddForm={() => (engine.showAddForm = !engine.showAddForm)}
	onImportStackSports={engine.importViaStackSports}
	onFilterVerificationChange={(v) => (engine.filterVerification = v)}
	onFilterTiersChange={(tiers) => (engine.filterTiers = tiers)}
	onFilterStatesChange={(states) => (engine.filterStates = states)}
	onFilterRegionQueryChange={(q) => (engine.filterRegionQuery = q)}
/>

<OrganizationsToastStack toasts={engine.toasts} />

<OrganizationsSportTabs
	activeSportTab={engine.activeSportTab}
	sportCounts={engine.sportCounts}
	onTabChange={(tab) => (engine.activeSportTab = tab)}
/>
