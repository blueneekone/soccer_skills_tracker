<script lang="ts">
	import { TACTICS_TRAINING_TABS, type TacticsTrainingEngine } from './TacticsTrainingEngine.svelte.js';

	let { engine }: { engine: TacticsTrainingEngine } = $props();
</script>

<header class="tw-bg-[#0f172a] tw-border-b tw-border-[#334155] tw-px-6 tw-py-4 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-4 tw-rounded-none">
	<div class="tw-flex tw-items-center tw-gap-3">
		<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-nuclear-yellow tw-uppercase tw-tracking-widest" style="color: #daff0a;">
			DIRECTOR OS
		</span>
		<span class="tw-text-slate-600">/</span>
		<h1 class="tw-font-sans tw-text-lg tw-font-extrabold tw-text-white tw-tracking-tight tw-m-0">
			Tactics & Training
		</h1>
	</div>

	<nav aria-label="Tactics and training sub-views" class="tw-flex tw-items-center tw-gap-1 tw-bg-[#020617] tw-p-1 tw-border tw-border-[#334155] tw-rounded-none tw-overflow-x-auto">
		{#each TACTICS_TRAINING_TABS as tab (tab.id)}
			<button
				type="button"
				class="tw-px-4 tw-py-2 tw-text-xs tw-font-mono tw-font-bold tw-transition-colors tw-rounded-none tw-whitespace-nowrap {engine.activeTab === tab.id ? 'tw-bg-[#daff0a] tw-text-slate-950' : 'tw-text-slate-400 hover:tw-text-white hover:tw-bg-slate-800'}"
				onclick={() => engine.setActiveTab(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</nav>
</header>
