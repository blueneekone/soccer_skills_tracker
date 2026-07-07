<script lang="ts">
	import type { RecruitersEngine } from './RecruitersEngine.svelte.js';
	import AdminConsoleSearch from '$lib/components/admin/AdminConsoleSearch.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: RecruitersEngine } = $props();
</script>

<div class="tw-flex tw-flex-col tw-gap-4 tw-mb-4 tw-w-full">
	<!-- Top Row: Title and Metrics -->
	<div class="tw-flex tw-justify-between tw-items-end tw-border-b tw-border-[#334155] tw-pb-4">
		<div>
			<h1 class="tw-text-2xl tw-font-bold tw-text-[#FAFAFA] tw-m-0 tw-leading-none">Recruiter Marketplace</h1>
			<div class="tw-text-[#94A3B8] tw-text-sm tw-font-mono tw-mt-2">
				Super-admin oversight for NCAA, Pro and Club scouts.
			</div>
		</div>
		<div class="tw-text-right">
			<div class="tw-text-[#14b8a6] tw-text-xl tw-font-bold tw-font-mono tw-leading-none">
				{engine.filteredRows.length}
			</div>
			<div class="tw-text-[10px] tw-text-[#94A3B8] tw-font-mono tw-uppercase tw-tracking-widest tw-mt-1">
				OF {engine.rows.length} SCOUTS
			</div>
		</div>
	</div>

	<!-- Bottom Row: Unified SIEM Action Bar -->
	<div class="v-admin-toolbar tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
		<div class="tw-flex-1 tw-min-w-[320px]">
			<AdminConsoleSearch
				bind:value={engine.searchInput}
				placeholder="Search by email, scout name, or agency"
				ariaLabel="Filter recruiters"
			/>
		</div>

		<div class="tw-flex tw-items-center tw-gap-3">
			<button
				type="button"
				class="v-toolbar-btn tw-px-3"
				onclick={() => void engine.loadRecruiters()}
				disabled={engine.loading}
				title={engine.loading ? 'Syncing…' : 'Refresh'}
				aria-label="Refresh recruiter list from Firestore"
			>
				<Icon name={"nav.refresh" as IconName} class="tw-text-lg {engine.loading ? 'tw-animate-spin' : ''}" />
			</button>
			
			<div class="tw-ml-1">
				<Tabs
					tabs={[
						{ id: '', label: `All (${engine.counts.total})` },
						{ id: 'pending', label: `Pending (${engine.counts.pending})` },
						{ id: 'verified', label: `Verified (${engine.counts.verified})` },
						{ id: 'rejected', label: `Rejected (${engine.counts.rejected})` }
					]}
					activeTab={engine.statusFilter}
					onTabChange={(id) => (engine.statusFilter = id as 'pending' | 'verified' | 'rejected' | '')}
				/>
			</div>
		</div>
	</div>
</div>

{#if engine.flashErr}
	<div class="tw-bg-[#0f172a] tw-border tw-border-[var(--vanguard-red,#f43f5e)] tw-text-[var(--vanguard-red,#f43f5e)] tw-px-4 tw-py-2 tw-rounded-none tw-font-mono tw-text-sm tw-mb-4" role="alert">{engine.flashErr}</div>
{/if}
{#if engine.flashOk}
	<div class="tw-bg-[#0f172a] tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-px-4 tw-py-2 tw-rounded-none tw-font-mono tw-text-sm tw-mb-4" role="status">{engine.flashOk}</div>
{/if}
{#if engine.err}
	<div class="tw-bg-[#0f172a] tw-border tw-border-[var(--vanguard-red,#f43f5e)] tw-text-[var(--vanguard-red,#f43f5e)] tw-px-4 tw-py-2 tw-rounded-none tw-font-mono tw-text-sm tw-mb-4" role="alert">{engine.err}</div>
{/if}
