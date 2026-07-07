<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import AdminConsoleSearch from '$lib/components/admin/AdminConsoleSearch.svelte';

	interface Props {
		searchInput: string;
		searchApplied: string;
		loading: boolean;
		rangeStart: number;
		rangeEnd: number;
		totalLabel: string;
		onSearchInput: (value: string) => void;
		onSearchKey: (e: KeyboardEvent) => void;
		onRunSearch: () => void;
		onClearSearch: () => void;
		onAddAdmin: () => void;
	}

	let {
		searchInput = $bindable(''),
		searchApplied,
		loading,
		rangeStart,
		rangeEnd,
		totalLabel,
		onSearchInput,
		onSearchKey,
		onRunSearch,
		onClearSearch,
		onAddAdmin,
	}: Props = $props();
</script>

<div class="tw-flex tw-flex-col tw-gap-4 tw-mb-4 tw-w-full">
	<!-- Top Row: Title and Metrics -->
	<div class="tw-flex tw-justify-between tw-items-end tw-border-b tw-border-[#334155] tw-pb-4">
		<div>
			<h1 class="tw-text-2xl tw-font-bold tw-text-[#FAFAFA] tw-m-0 tw-leading-none">Global Users</h1>
			<div class="tw-text-[#94A3B8] tw-text-sm tw-font-mono tw-mt-2">
				Every account across every tenant. Server-side prefix search.
			</div>
		</div>
		<div class="tw-text-right">
			<div class="tw-text-[#14b8a6] tw-text-xl tw-font-bold tw-font-mono tw-leading-none">
				{#if loading && rangeEnd === 0}
					—
				{:else}
					{rangeStart}–{rangeEnd}
				{/if}
			</div>
			<div class="tw-text-[10px] tw-text-[#94A3B8] tw-font-mono tw-uppercase tw-tracking-widest tw-mt-1">
				OF {totalLabel} LOADED
			</div>
		</div>
	</div>

	<!-- Bottom Row: Unified SIEM Action Bar -->
	<div class="v-admin-toolbar tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
		<div class="tw-flex-1 tw-min-w-[320px]">
			<AdminConsoleSearch
				bind:value={searchInput}
				placeholder="Search by email prefix (press Enter)"
				ariaLabel="Search users by email"
				showClear={Boolean(searchApplied)}
				submitLabel="Search"
				{loading}
				onSearch={onRunSearch}
				onClear={onClearSearch}
				onkeydown={onSearchKey}
			/>
		</div>

		<div class="tw-flex tw-items-center">
			<button
				type="button"
				class="v-toolbar-btn tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/10"
				onclick={onAddAdmin}
				aria-haspopup="dialog"
			>
				<Icon name={'user.plus' as IconName} aria-hidden="true" />
				Add Admin
			</button>
		</div>
	</div>
</div>
