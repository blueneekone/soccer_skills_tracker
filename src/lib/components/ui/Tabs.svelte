<script lang="ts">
	interface TabItem {
		id: string;
		label: string;
	}

	interface Props {
		tabs: TabItem[];
		activeTab: string;
		onTabChange: (id: string) => void;
	}

	let { tabs, activeTab, onTabChange }: Props = $props();
</script>

<div class="tw-flex tw-gap-2 tw-p-1 tw-bg-[#0f172a]/50 tw-backdrop-blur-md tw-border tw-border-slate-800/50 tw-rounded-lg tw-w-fit" role="tablist">
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === tab.id}
			class="tw-px-4 tw-py-2 tw-rounded-md tw-text-sm tw-font-medium tw-transition-colors {activeTab === tab.id ? 'tw-bg-[#14b8a6]/10 tw-text-[#FAFAFA]' : 'tw-text-[#94A3B8] hover:tw-text-[#D4D4D8] hover:tw-bg-slate-800/30'} focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-teal-500"
			onclick={() => onTabChange(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>
