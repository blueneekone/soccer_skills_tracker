<script lang="ts">
	import type { GlobalUsersTab } from '$lib/types/adminUsers.js';

	interface Props {
		activeTab: GlobalUsersTab;
		onTabChange: (tab: GlobalUsersTab) => void;
	}

	let { activeTab, onTabChange }: Props = $props();

	const TABS: { id: GlobalUsersTab; label: string }[] = [
		{ id: 'admins', label: 'Global Admins' },
		{ id: 'directors', label: 'Directors' },
		{ id: 'coaches', label: 'Coaches' },
		{ id: 'parents_players', label: 'Parents & Players' },
	];
</script>

<div
	class="v-admin-tab-nav tw-mb-6"
	role="tablist"
	aria-label="User segments by role"
>
	{#each TABS as tab (tab.id)}
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === tab.id}
			class="v-admin-tab focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-teal-500"
			class:v-admin-tab--active={activeTab === tab.id}
			onclick={() => onTabChange(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>
