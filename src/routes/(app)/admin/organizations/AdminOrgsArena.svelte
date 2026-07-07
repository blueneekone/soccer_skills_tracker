<script lang="ts">
	import type { AdminOrgsEngine } from './AdminOrgsEngine.svelte.js';
	import AddOrganizationModal from '$lib/components/admin/AddOrganizationModal.svelte';
	import OrganizationsAlerts from '$lib/components/admin/OrganizationsAlerts.svelte';
	import OrganizationsDataTable from '$lib/components/admin/OrganizationsDataTable.svelte';
	import OrganizationsPagination from '$lib/components/admin/OrganizationsPagination.svelte';

	let { engine }: { engine: AdminOrgsEngine } = $props();
</script>

	<AddOrganizationModal
		bind:form={engine.addClubForm}
		newSportMode={engine.newSportMode}
		saving={engine.clubSaving}
		err={engine.clubAddErr}
		isOpen={engine.isAddModalOpen}
		onClose={() => (engine.isAddModalOpen = false)}
		onSubmit={() => void engine.addClub()}
	/>

<OrganizationsAlerts clubsErr={engine.clubsErr}  />

<OrganizationsDataTable
	pagedClubs={engine.pagedClubs}
	totalClubs={engine.clubs.length}
	clubsLoading={engine.clubsLoading}
	getCompliance={engine.getCompliance}
/>

<OrganizationsPagination
	orgPage={engine.orgPage}
	orgTotalPages={engine.orgTotalPages}
	filteredCount={engine.filteredClubs.length}
	onPrev={() => (engine.orgPage = Math.max(0, engine.orgPage - 1))}
	onNext={() => (engine.orgPage = Math.min(engine.orgTotalPages - 1, engine.orgPage + 1))}
/>
