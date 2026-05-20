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
	class="bento-mb-md tw-flex tw-flex-wrap bento-gap-xs tw-rounded-lg tw-border tw-border-slate-700/70 tw-bg-slate-950/60 tw-p-1"
	role="tablist"
	aria-label="User segments by role"
>
	{#each TABS as tab (tab.id)}
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === tab.id}
			class="tw-rounded-md tw-border-b-2 tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide tw-transition-colors focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-amber-500/80 {activeTab === tab.id
				? 'tw-border-amber-400 tw-bg-indigo-600 tw-text-white tw-shadow-inner tw-ring-2 tw-ring-indigo-400/50'
				: 'tw-border-transparent tw-bg-transparent tw-text-slate-400 hover:tw-bg-slate-800/80 hover:tw-text-slate-100'}"
			onclick={() => onTabChange(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>
