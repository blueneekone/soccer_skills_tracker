<script lang="ts">
	import type { AdminUsersEngine } from './AdminUsersEngine.svelte.js';
	import GlobalUsersToolbar from '$lib/components/admin/GlobalUsersToolbar.svelte';
	import GlobalUsersRbacTabs from '$lib/components/admin/GlobalUsersRbacTabs.svelte';

	let { engine }: { engine: AdminUsersEngine } = $props();
</script>

<GlobalUsersToolbar
	bind:searchInput={engine.searchInput}
	searchApplied={engine.searchApplied}
	loading={engine.loading}
	rangeStart={engine.rangeStart}
	rangeEnd={engine.rangeEnd}
	totalLabel={engine.totalLabel}
	onSearchInput={(value) => (engine.searchInput = value)}
	onSearchKey={engine.onSearchKey}
	onRunSearch={() => void engine.runSearch()}
	onClearSearch={() => void engine.clearSearch()}
	onAddAdmin={() => (engine.showAddAdmin = true)}
/>

{#if engine.flashErr}
	<p class="gu-flash gu-flash--err" role="alert">{engine.flashErr}</p>
{/if}
{#if engine.flashOk}
	<p class="gu-flash gu-flash--ok" role="status">{engine.flashOk}</p>
{/if}
{#if engine.err}
	<p class="gu-flash gu-flash--err" role="alert">{engine.err}</p>
{/if}

<div class="gu-summary">
	<span class="gu-summary__item">
		<span class="gu-summary__k">Segment total</span>
		<span class="gu-summary__v">{engine.totalLabel}</span>
	</span>
	{#if engine.searchApplied}
		<span class="gu-summary__item">
			<span class="gu-summary__k">Search</span>
			<span class="gu-summary__v gu-summary__v--mono">email ≥ "{engine.searchApplied}"</span>
		</span>
	{/if}
	<span class="gu-summary__item gu-summary__item--end">
		<span class="gu-summary__k">Showing</span>
		<span class="gu-summary__v">
			{engine.rows.length > 0 ? `${engine.rangeStart.toLocaleString()}–${engine.rangeEnd.toLocaleString()}` : '0'}
		</span>
	</span>
</div>

<GlobalUsersRbacTabs activeTab={engine.activeTab} onTabChange={(tab) => (engine.activeTab = tab)} />
