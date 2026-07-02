<script lang="ts">
	import type { AdminOrgsEngine } from './AdminOrgsEngine.svelte.js';
	import OrganizationsAddForm from '$lib/components/admin/OrganizationsAddForm.svelte';
	import OrganizationsAlerts from '$lib/components/admin/OrganizationsAlerts.svelte';
	import OrganizationsDataTable from '$lib/components/admin/OrganizationsDataTable.svelte';
	import OrganizationsPagination from '$lib/components/admin/OrganizationsPagination.svelte';

	let { engine }: { engine: AdminOrgsEngine } = $props();
</script>

{#if engine.showAddForm}
	<OrganizationsAddForm
		bind:form={engine.addClubForm}
		newSportMode={engine.newSportMode}
		saving={engine.clubSaving}
		err={engine.clubAddErr}
		onSubmit={() => void engine.addClub()}
	/>
{/if}

<OrganizationsAlerts clubsErr={engine.clubsErr} loginAsDirectorErr={engine.loginAsDirectorErr} />

<OrganizationsDataTable
	pagedClubs={engine.pagedClubs}
	totalClubs={engine.clubs.length}
	clubsLoading={engine.clubsLoading}
	openRowMenuId={engine.openRowMenuId}
	loginAsDirectorBusyFor={engine.loginAsDirectorBusyFor}
	getCompliance={engine.getCompliance}
	getTeamCount={engine.getTeamCount}
	onToggleRowMenu={engine.toggleRowMenu}
	onEdit={engine.openEdit}
	onCloseRowMenu={engine.closeRowMenu}
	onLoginAsDirector={(cl) => void engine.loginAsDirector(cl)}
	onDelete={(id, name) => void engine.deleteClub(id, name)}
/>

<OrganizationsPagination
	orgPage={engine.orgPage}
	orgTotalPages={engine.orgTotalPages}
	filteredCount={engine.filteredClubs.length}
	onPrev={() => (engine.orgPage = Math.max(0, engine.orgPage - 1))}
	onNext={() => (engine.orgPage = Math.min(engine.orgTotalPages - 1, engine.orgPage + 1))}
/>
