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

<div class="tw-flex tw-gap-6 tw-border-b tw-border-[#334155] tw-w-full" role="tablist">
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === tab.id}
			class="tw-pb-3 tw-text-[13px] tw-font-mono tw-tracking-widest tw-uppercase tw-transition-colors focus-visible:tw-outline-none tw-relative
				{activeTab === tab.id 
					? 'tw-text-[#FAFAFA]' 
					: 'tw-text-[#94A3B8] hover:tw-text-[#D4D4D8]'}"
			onclick={() => onTabChange(tab.id)}
		>
			{tab.label}
			{#if activeTab === tab.id}
				<span class="tw-absolute tw-bottom-0 tw-left-0 tw-w-full tw-h-[2px] tw-bg-[#14b8a6]"></span>
			{/if}
		</button>
	{/each}
</div>
