<script lang="ts">
	import type { AdminOrgsEngine } from './AdminOrgsEngine.svelte.js';
	import OrganizationsToolbar from '$lib/components/admin/OrganizationsToolbar.svelte';
	import OrganizationsToastStack from '$lib/components/admin/OrganizationsToastStack.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { ADMIN_SPORT_TABS } from '$lib/admin/organizationsConstants.js';

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

<Tabs
	tabs={ADMIN_SPORT_TABS.filter((t) => t.key === 'all' || (engine.sportCounts[t.key] ?? 0) > 0).map(
		(t) => ({
			id: t.key,
			label: t.key === 'all' ? t.label : `${t.label} (${engine.sportCounts[t.key] ?? 0})`
		})
	)}
	activeTab={engine.activeSportTab}
	onTabChange={(id) => (engine.activeSportTab = id as typeof engine.activeSportTab)}
/>
