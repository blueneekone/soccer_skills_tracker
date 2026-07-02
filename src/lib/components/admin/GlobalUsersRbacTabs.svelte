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
	class="bento-mb-md tw-flex tw-flex-wrap tw-gap-2 tw-rounded-lg tw-border tw-border-slate-800 tw-bg-slate-900/60 tw-p-2"
	role="tablist"
	aria-label="User segments by role"
>
	{#each TABS as tab (tab.id)}
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === tab.id}
			class="tab-nav focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-teal-500"
			class:tab-nav--active={activeTab === tab.id}
			onclick={() => onTabChange(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>
