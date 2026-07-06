<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { ADMIN_SPORT_TABS } from '$lib/admin/organizationsConstants.js';
	import type { AdminSportTabKey } from '$lib/types/adminOrganizations.js';

	interface Props {
		activeSportTab: AdminSportTabKey;
		sportCounts: Record<string, number>;
		onTabChange: (tab: AdminSportTabKey) => void;
	}

	let { activeSportTab, sportCounts, onTabChange }: Props = $props();

	const SPORT_TABS = ADMIN_SPORT_TABS;
</script>

<div class="v-admin-tab-nav" role="tablist" aria-label="Filter by sport">
	{#each SPORT_TABS as tab (tab.key)}
		{@const count = sportCounts[tab.key] ?? 0}
		{@const isActive = activeSportTab === tab.key}
		{#if tab.key === 'all' || count > 0}
			<button
				type="button"
				role="tab"
				aria-selected={isActive}
				class="v-admin-tab"
				class:v-admin-tab--active={isActive}
				data-sport={tab.key}
				onclick={() => onTabChange(tab.key)}
			>
				<Icon name={tab.icon as IconName} aria-hidden="true" />
				<span class="v-admin-tab__label">{tab.label}</span>
				<span class="v-admin-tab__n">{count}</span>
			</button>
		{/if}
	{/each}
</div>
