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

<div class="adm-toolbar">
	<div class="adm-toolbar__left">
		<h1 class="adm-toolbar__title">Global Users</h1>
		<div class="adm-toolbar__meta">
			<span class="adm-toolbar__sub">
				Every account across every tenant. Email-prefix search is server-side; no client
				enumeration of the full collection.
			</span>
			<span class="adm-toolbar__count">
				{#if loading && rangeEnd === 0}
					…
				{:else}
					{rangeStart}–{rangeEnd} of {totalLabel} loaded
				{/if}
			</span>
		</div>
	</div>
	<div class="adm-toolbar__right">
		<div class="gu-page-actions" role="group" aria-label="Page actions">
			<button
				type="button"
				class="gu-add-admin-btn"
				onclick={onAddAdmin}
				aria-haspopup="dialog"
			>
				<Icon name={'user.plus' as IconName} aria-hidden="true" />
				Add Admin
			</button>
		</div>
		<div class="adm-toolbar__search-flex">
			<AdminConsoleSearch
				bind:value={searchInput}
				placeholder="Search by email prefix (press Enter)"
				ariaLabel="Search users by email"
				showClear={Boolean(searchApplied)}
				submitLabel="Search"
				loading={loading}
				onSearch={onRunSearch}
				onClear={onClearSearch}
				onkeydown={onSearchKey}
			/>
		</div>
	</div>
</div>
