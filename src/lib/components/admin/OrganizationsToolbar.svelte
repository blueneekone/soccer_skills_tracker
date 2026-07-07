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

<div class="tw-flex tw-flex-col tw-gap-4 tw-mb-4 tw-w-full">
	<!-- Top Row: Title and Metrics -->
	<div class="tw-flex tw-justify-between tw-items-end tw-border-b tw-border-[#334155] tw-pb-4">
		<div>
			<h1 class="tw-text-2xl tw-font-bold tw-text-[#FAFAFA] tw-m-0 tw-leading-none">Organizations</h1>
			<div class="tw-text-[#94A3B8] tw-text-sm tw-font-mono tw-mt-2">
				Organization › Program › Team › Roster
			</div>
		</div>
		<div class="tw-text-right">
			<div class="tw-text-[#14b8a6] tw-text-xl tw-font-bold tw-font-mono tw-leading-none">
				{#if clubsLoading}—{:else}{filteredCount}{/if}
			</div>
			<div class="tw-text-[10px] tw-text-[#94A3B8] tw-font-mono tw-uppercase tw-tracking-widest tw-mt-1">
				OF {totalCount} TOTAL
			</div>
		</div>
	</div>

	<!-- Bottom Row: Unified SIEM Action Bar -->
	<div class="v-admin-toolbar tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
		<div class="tw-flex-1 tw-min-w-[320px]">
			<AdminConsoleSearch
				bind:value={orgSearch}
				placeholder="Filter organizations…"
				ariaLabel="Filter organizations"
			/>
		</div>

		<div class="tw-flex tw-items-center tw-gap-3">
			<div class="tw-relative" bind:this={filterRootEl}>
				<button
					type="button"
					class="v-toolbar-btn {filterOpen || filterActiveCount > 0 ? 'v-toolbar-btn--active' : ''}"
					aria-haspopup="dialog"
					aria-expanded={filterOpen}
					onclick={onToggleFilter}
				>
					<Icon name={'action.filter' as IconName} aria-hidden="true" />
					<span>Enterprise Filter</span>
					{#if filterActiveCount > 0}
						<span class="tw-ml-2 tw-bg-[#fbbf24] tw-text-[#0B0F19] tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold" aria-label="{filterActiveCount} active filters">
							{filterActiveCount}
						</span>
					{/if}
				</button>

				{#if filterOpen}
					<div class="tw-absolute tw-top-[calc(100%+8px)] tw-right-0 tw-z-50 tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-shadow-2xl">
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
					</div>
				{/if}
			</div>

			<button
				type="button"
				class="v-toolbar-btn"
				onclick={onImportStackSports}
				title="Import organizations from Stack Sports"
			>
				<Icon name={'action.download' as IconName} aria-hidden="true" />
				Import via Stack Sports API
			</button>

			<button
				type="button"
				class="v-toolbar-btn tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10"
				onclick={onToggleAddForm}
				aria-expanded={showAddForm}
			>
				<Icon name={showAddForm ? ('sys.close' as IconName) : ('action.add' as IconName)} aria-hidden="true" />
				{showAddForm ? 'Cancel' : 'Add Organization'}
			</button>
		</div>
	</div>
</div>
