<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

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
			<div class="gu-search" role="search">
				<Icon name={'action.search' as IconName} aria-hidden="true" />
				<input
					type="search"
					value={searchInput}
					oninput={(e) => onSearchInput(e.currentTarget.value)}
					onkeydown={onSearchKey}
					placeholder="Search by email prefix (press Enter)"
					aria-label="Search users by email"
					autocomplete="off"
					spellcheck="false"
				/>
				{#if searchApplied}
					<button
						type="button"
						class="gu-search__clear"
						onclick={onClearSearch}
						aria-label="Clear search"
						title="Clear search"
					>
						<Icon name={'sys.close' as IconName} aria-hidden="true" />
					</button>
				{/if}
				<button
					type="button"
					class="gu-search__submit"
					onclick={onRunSearch}
					disabled={loading}
					aria-label="Run search"
				>
					Search
				</button>
			</div>
		</div>
	</div>
</div>
