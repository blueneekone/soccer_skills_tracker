<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import AdminConsoleSearch from '$lib/components/admin/AdminConsoleSearch.svelte';
	import OrganizationsEnterpriseFilter from '$lib/components/admin/OrganizationsEnterpriseFilter.svelte';
	import type { AdminClub, AdminClubTierKey } from '$lib/types/adminOrganizations.js';

	interface Props {
		clubs: AdminClub[];
		orgSearch: string;
		clubsLoading: boolean;
		filteredCount: number;
		totalCount: number;
		filterOpen: boolean;
		filterActiveCount: number;
		filterVerification: 'all' | 'verified' | 'pending';
		filterStates: string[];
		filterTiers: AdminClubTierKey[];
		filterRegionQuery: string;
		filterRootEl?: HTMLElement | null;
		showAddForm: boolean;
		onToggleFilter: () => void;
		onCloseFilter: () => void;
		onResetFilters: () => void;
		onToggleAddForm: () => void;
		onImportStackSports: () => void;
		onFilterVerificationChange: (value: 'all' | 'verified' | 'pending') => void;
		onFilterTiersChange: (tiers: AdminClubTierKey[]) => void;
		onFilterStatesChange: (states: string[]) => void;
		onFilterRegionQueryChange: (query: string) => void;
	}

	let {
		clubs,
		orgSearch = $bindable(''),
		clubsLoading,
		filteredCount,
		totalCount,
		filterOpen,
		filterActiveCount,
		filterVerification = $bindable('all'),
		filterStates = $bindable([]),
		filterTiers = $bindable([]),
		filterRegionQuery = $bindable(''),
		filterRootEl = $bindable(null),
		showAddForm,
		onToggleFilter,
		onCloseFilter,
		onResetFilters,
		onToggleAddForm,
		onImportStackSports,
		onFilterVerificationChange,
		onFilterTiersChange,
		onFilterStatesChange,
		onFilterRegionQueryChange,
	}: Props = $props();
</script>

<div class="adm-toolbar">
	<div class="adm-toolbar__left">
		<h1 class="adm-toolbar__title">Organizations</h1>
		<div class="adm-toolbar__meta">
			<span class="adm-toolbar__sub">Organization › Program › Team › Roster</span>
			<span class="adm-toolbar__count">
				{#if clubsLoading}—{:else}{filteredCount} of {totalCount}{/if}
			</span>
		</div>
	</div>
	<div class="adm-toolbar__right">
		<div class="adm-toolbar__search-flex">
			<AdminConsoleSearch
				bind:value={orgSearch}
				placeholder="Filter organizations…"
				ariaLabel="Filter organizations"
			/>
		</div>

		<div class="orgs3-filter" bind:this={filterRootEl}>
			<button
				type="button"
				class="orgs3-filter-btn"
				class:orgs3-filter-btn--active={filterOpen || filterActiveCount > 0}
				aria-haspopup="dialog"
				aria-expanded={filterOpen}
				onclick={onToggleFilter}
			>
				<Icon name={'action.filter' as IconName} aria-hidden="true" />
				<span>Enterprise Filter</span>
				{#if filterActiveCount > 0}
					<span class="orgs3-filter-badge" aria-label="{filterActiveCount} active filters">
						{filterActiveCount}
					</span>
				{/if}
			</button>

			{#if filterOpen}
				<OrganizationsEnterpriseFilter
					{clubs}
					bind:filterVerification
					bind:filterStates
					bind:filterTiers
					bind:filterRegionQuery
					{filterActiveCount}
					onClose={onCloseFilter}
					onReset={onResetFilters}
					onVerificationChange={onFilterVerificationChange}
					onTiersChange={onFilterTiersChange}
					onStatesChange={onFilterStatesChange}
					onRegionQueryChange={onFilterRegionQueryChange}
				/>
			{/if}
		</div>

		<button
			type="button"
			class="orgs3-import-btn"
			onclick={onImportStackSports}
			title="Import organizations from Stack Sports"
		>
			<Icon name={'action.download' as IconName} aria-hidden="true" />
			Import via Stack Sports API
		</button>

		<button
			type="button"
			class="btn-primary"
			onclick={onToggleAddForm}
			aria-expanded={showAddForm}
		>
			<Icon name={showAddForm ? ('sys.close' as IconName) : ('action.add' as IconName)} aria-hidden="true" />
			{showAddForm ? 'Cancel' : 'Add Organization'}
		</button>
	</div>
</div>
