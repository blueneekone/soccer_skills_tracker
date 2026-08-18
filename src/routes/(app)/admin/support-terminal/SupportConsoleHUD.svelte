<script lang="ts">
	import type { SupportConsoleEngine, SupportTab } from './SupportConsoleEngine.svelte.ts';

	let { engine }: { engine: SupportConsoleEngine } = $props();

	const tabs: { id: SupportTab; label: string }[] = [
		{ id: 'users', label: 'User Ops' },
		{ id: 'teams', label: 'Team Ops' },
		{ id: 'claims', label: 'RBAC Repair' },
		{ id: 'system', label: 'System' }
	];
</script>

<div class="tw-flex tw-items-center tw-justify-between tw-flex-wrap tw-gap-3 tw-border-b tw-border-[#334155] tw-pb-4">
	<nav class="tw-flex tw-gap-1 tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-p-1 tw-rounded-none" aria-label="Support Terminal Sub-domains">
		{#each tabs as tab}
			<button
				type="button"
				class="tw-px-4 tw-py-2 tw-text-xs tw-font-mono tw-font-bold tw-uppercase tw-tracking-widest tw-rounded-none tw-transition-all {engine.activeTab === tab.id ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border-b-2 tw-border-[#14b8a6]' : 'tw-bg-transparent tw-text-[#94A3B8] hover:tw-text-[#FAFAFA] hover:tw-bg-white/[0.03]'}"
				onclick={() => engine.setActiveTab(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</nav>
	
	<div class="tw-flex-1 tw-flex tw-justify-end">
		{#if engine.isProcessing}
			<span class="tw-inline-flex tw-items-center tw-gap-2 tw-text-xs tw-font-mono tw-text-amber-400 tw-uppercase tw-tracking-wider">
				<span class="tw-w-2 tw-h-2 tw-bg-amber-400 tw-animate-pulse"></span>
				PROCESSING
			</span>
		{:else}
			<span class="tw-inline-flex tw-items-center tw-gap-2 tw-text-xs tw-font-mono tw-text-emerald-400 tw-uppercase tw-tracking-wider">
				<span class="tw-w-2 tw-h-2 tw-bg-emerald-400 tw-rounded-full"></span>
				IDLE
			</span>
		{/if}
	</div>
</div>
