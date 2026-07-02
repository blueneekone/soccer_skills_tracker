<script lang="ts">
	import type { AdminUsersEngine } from './AdminUsersEngine.svelte.js';
	import GlobalUsersDataTable from '$lib/components/admin/GlobalUsersDataTable.svelte';
	import AddAdminModal from '$lib/components/admin/AddAdminModal.svelte';
	import GlobalUsersDeactivateModal from '$lib/components/admin/GlobalUsersDeactivateModal.svelte';
	import GlobalUsersPurgeModal from '$lib/components/admin/GlobalUsersPurgeModal.svelte';

	let { engine }: { engine: AdminUsersEngine } = $props();
</script>

<GlobalUsersDataTable
	rows={engine.rows}
	loading={engine.loading}
	activeTab={engine.activeTab}
	searchApplied={engine.searchApplied}
	clubNameMap={engine.clubNameMap}
	openMenuFor={engine.openMenuFor}
	loginAsBusyFor={engine.loginAsBusyFor}
	pageIndex={engine.pageIndex}
	hasNextPage={engine.hasNextPage}
	canDeactivateUser={engine.canDeactivateUser}
	onToggleMenu={engine.toggleMenu}
	onEditAdmin={engine.openEditAdmin}
	onLoginAs={(row) => void engine.loginAs(row)}
	onDeactivate={engine.openDeactivate}
	onPurge={engine.openPurge}
	onPrevPage={() => void engine.goPrev()}
	onNextPage={() => void engine.goNext()}
/>

<AddAdminModal
	bind:open={engine.showAddAdmin}
	onClose={() => (engine.showAddAdmin = false)}
	onGranted={(em) => {
		engine.flashOk = `${em} granted admin access.`;
		engine.showAddAdmin = false;
	}}
/>

{#if engine.deactivateTarget}
	<GlobalUsersDeactivateModal
		target={engine.deactivateTarget}
		busy={engine.deactivateBusy}
		err={engine.deactivateErr}
		isSelf={engine.isRevokeTargetSelf(engine.deactivateTarget)}
		onClose={engine.closeDeactivate}
		onConfirm={() => void engine.handleRevokeAccess()}
	/>
{/if}

{#if engine.purgeStep > 0}
	<GlobalUsersPurgeModal
		step={engine.purgeStep}
		targetEmail={engine.purgeTargetEmail}
		targetName={engine.purgeTargetName}
		bind:typedConfirmation={engine.purgeTypedConfirmation}
		bind:reason={engine.purgeReason}
		busy={engine.purgeBusy}
		err={engine.purgeErr}
		onClose={engine.closePurge}
		onAdvance={engine.advancePurge}
		onConfirm={() => void engine.confirmPurge()}
	/>
{/if}
