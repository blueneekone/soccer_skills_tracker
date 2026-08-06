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

<div class="tw-flex tw-items-center tw-gap-[clamp(8px,1vw,16px)] tw-border-b tw-border-slate-800 tw-pb-4">
	<div class="tw-flex tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-1 tw-rounded">
		{#each tabs as tab}
			<button
				type="button"
				class="tw-px-4 tw-py-2 tw-text-sm tw-font-mono tw-font-bold tw-uppercase tw-tracking-widest tw-rounded tw-transition-colors {engine.activeTab === tab.id ? 'tw-bg-slate-800 tw-text-[#14b8a6]' : 'tw-text-[#A1A1AA] hover:tw-text-[#FAFAFA]'}"
				onclick={() => engine.setActiveTab(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>
	
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
