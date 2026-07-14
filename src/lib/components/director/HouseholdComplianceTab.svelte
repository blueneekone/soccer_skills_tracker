<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	
	let { clubId = '' } = $props();

	// Simulated Household Data
	let households = $state([
		{ id: 'hh_1', parentName: 'Sarah Connor', parentEmail: 'sarah@example.com', athletes: 2, vpcStatus: 'Verified', safeSportFlags: 0 },
		{ id: 'hh_2', parentName: 'John Doe', parentEmail: 'john@example.com', athletes: 1, vpcStatus: 'Pending', safeSportFlags: 0 },
		{ id: 'hh_3', parentName: 'Jane Smith', parentEmail: 'jane@example.com', athletes: 3, vpcStatus: 'Action Required', safeSportFlags: 1 },
		{ id: 'hh_4', parentName: 'Ellen Ripley', parentEmail: 'ellen@example.com', athletes: 1, vpcStatus: 'Verified', safeSportFlags: 0 },
		{ id: 'hh_5', parentName: 'Neo Anderson', parentEmail: 'neo@example.com', athletes: 2, vpcStatus: 'Verified', safeSportFlags: 0 }
	]);

	let searchQuery = $state('');
	let currentPage = $state(1);
	const PAGE_SIZE = 25;

	// Derived filtering and pagination
	let filteredHouseholds = $derived(
		households.filter(hh => {
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			return hh.parentName.toLowerCase().includes(q) || hh.parentEmail.toLowerCase().includes(q);
		})
	);

	let totalPages = $derived(Math.max(1, Math.ceil(filteredHouseholds.length / PAGE_SIZE)));

	let paginatedHouseholds = $derived(
		filteredHouseholds.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
	);

	function prevPage() {
		if (currentPage > 1) currentPage--;
	}

	function nextPage() {
		if (currentPage < totalPages) currentPage++;
	}

	// For Phase 4: Simulated drawer open
	function openHouseholdDrawer(id: string) {
		console.log(`Opening drawer for ${id} with focusCompliance: true`);
		// Implementation for opening the HouseholdDetailDrawer goes here.
		// openDrawer({ component: HouseholdDetailDrawer, props: { householdId: id, focusCompliance: true } });
	}
</script>

<div class="tw-flex tw-flex-col tw-gap-4 tw-font-sans">
	<!-- Search Injection -->
	<div class="tw-relative tw-w-full md:tw-max-w-md">
		<div class="tw-absolute tw-inset-y-0 tw-left-0 tw-pl-3 tw-flex tw-items-center tw-pointer-events-none">
			<Icon name={"sys.search" as IconName} class="tw-h-4 tw-w-4 tw-text-slate-400" />
		</div>
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search households by parent name or email..."
			class="tw-block tw-w-full tw-pl-10 tw-pr-3 tw-py-2 tw-border tw-border-[#334155] tw-rounded-md tw-bg-[#0f172a] tw-text-sm tw-text-white tw-placeholder-slate-400 focus:tw-outline-none focus:tw-ring-1 focus:tw-ring-teal-500 focus:tw-border-teal-500"
		/>
	</div>

	<!-- Enterprise Data Table Conversion -->
	<div class="v-table-wrap tw-overflow-x-auto tw-border tw-border-[#334155] tw-rounded-[var(--radius-premium,24px)] tw-bg-[#0f172a]">
		<table class="v-table tw-w-full tw-text-left tw-border-collapse">
			<thead>
				<tr>
					<th class="tw-bg-slate-900/70 tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0] tw-px-6 tw-py-4 tw-font-semibold">Household Primary (Parent)</th>
					<th class="tw-bg-slate-900/70 tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0] tw-px-6 tw-py-4 tw-font-semibold">Linked Operatives</th>
					<th class="tw-bg-slate-900/70 tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0] tw-px-6 tw-py-4 tw-font-semibold">VPC Status</th>
					<th class="tw-bg-slate-900/70 tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0] tw-px-6 tw-py-4 tw-font-semibold">SafeSport Flags</th>
					<th class="tw-bg-slate-900/70 tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0] tw-px-6 tw-py-4 tw-font-semibold tw-text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="v-table__body">
				{#each paginatedHouseholds as hh}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<tr class="ec-table__row-click tw-border-t tw-border-[#334155] hover:tw-bg-slate-800/50 tw-cursor-pointer tw-transition-colors" onclick={() => openHouseholdDrawer(hh.id)}>
						<td class="tw-px-6 tw-py-4">
							<div class="tw-flex tw-flex-col">
								<span class="tw-text-sm tw-font-bold tw-text-white">{hh.parentName}</span>
								<span class="tw-text-xs tw-text-slate-400 tw-font-mono">{hh.parentEmail}</span>
							</div>
						</td>
						<td class="tw-px-6 tw-py-4 tw-font-mono tw-text-sm tw-text-slate-300">
							{hh.athletes} {hh.athletes === 1 ? 'Athlete' : 'Athletes'}
						</td>
						<td class="tw-px-6 tw-py-4">
							<div class="tw-flex tw-items-center tw-gap-2">
								{#if hh.vpcStatus === 'Verified'}
									<div class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-green-500"></div>
									<span class="tw-text-xs tw-text-green-400 tw-font-bold">Verified</span>
								{:else if hh.vpcStatus === 'Pending'}
									<div class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-amber-500"></div>
									<span class="tw-text-xs tw-text-amber-400 tw-font-bold">Pending</span>
								{:else}
									<div class="tw-relative tw-flex tw-h-2 tw-w-2">
										<span class="tw-animate-ping tw-absolute tw-inline-flex tw-h-full tw-w-full tw-rounded-full tw-bg-red-400 tw-opacity-75"></span>
										<span class="tw-relative tw-inline-flex tw-rounded-full tw-h-2 tw-w-2 tw-bg-red-500"></span>
									</div>
									<span class="tw-text-xs tw-text-red-400 tw-font-bold">Action Required</span>
								{/if}
							</div>
						</td>
						<td class="tw-px-6 tw-py-4">
							{#if hh.safeSportFlags > 0}
								<span class="tw-px-2 tw-py-1 tw-rounded tw-bg-red-500/10 tw-text-red-400 tw-font-mono tw-text-xs tw-font-bold">{hh.safeSportFlags} FLAG{hh.safeSportFlags > 1 ? 'S' : ''}</span>
							{:else}
								<span class="tw-text-slate-500 tw-font-mono tw-text-xs tw-font-bold">0 FLAGS</span>
							{/if}
						</td>
						<td class="tw-px-6 tw-py-4 tw-text-right">
							<button class="tw-text-teal-400 hover:tw-text-teal-300 tw-text-xs tw-uppercase tw-tracking-wider tw-font-bold tw-transition-colors" onclick={(e) => { e.stopPropagation(); openHouseholdDrawer(hh.id); }}>
								Review &rarr;
							</button>
						</td>
					</tr>
				{/each}
				
				{#if paginatedHouseholds.length === 0}
					<tr>
						<td colspan="5" class="tw-px-6 tw-py-8 tw-text-center tw-text-slate-400 tw-font-mono tw-text-sm">
							No households found matching your query.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination Controls -->
	<div class="tw-flex tw-items-center tw-justify-between tw-px-4 tw-py-2 tw-font-mono tw-text-sm tw-text-slate-400">
		<button 
			class="tw-px-3 tw-py-1 tw-rounded hover:tw-bg-slate-800 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-transition-colors"
			onclick={prevPage}
			disabled={currentPage === 1}
		>
			&lt; Prev
		</button>
		
		<span>Page {currentPage} of {totalPages}</span>
		
		<button 
			class="tw-px-3 tw-py-1 tw-rounded hover:tw-bg-slate-800 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-transition-colors"
			onclick={nextPage}
			disabled={currentPage === totalPages}
		>
			Next &gt;
		</button>
	</div>
</div>
