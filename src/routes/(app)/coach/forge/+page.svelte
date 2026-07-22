<script lang="ts">
	import { ForgeEngine } from './ForgeEngine.svelte.js';
	import CurriculumBuilderArena from './CurriculumBuilderArena.svelte';
	import RagTerminalArena from './RagTerminalArena.svelte';

	const engine = new ForgeEngine();
	engine.init();
</script>

<svelte:head>
	<title>Coach — Tactical Forge</title>
</svelte:head>

<div class="tw-p-[clamp(16px,4vw,32px)] tw-bg-[#0B0F19] tw-w-full tw-h-full tw-flex-1 tw-flex tw-flex-col tw-gap-4">
	<header class="tw-py-3 tw-mb-4 tw-border-b tw-border-[#1E293B]">
		<div class="tw-text-xs tw-font-mono tw-tracking-widest tw-uppercase tw-text-slate-400">COACH COMMAND // TACTICAL FORGE</div>
	</header>

	<div class="tw-flex tw-items-center tw-border-b tw-border-[#334155]">
		<button 
			class="tw-px-6 tw-py-3 tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-transition-colors {engine.activeTab === 'builder' ? 'tw-border-b-2 tw-border-[#14b8a6] tw-text-[#14b8a6]' : 'tw-text-[#64748b] hover:tw-text-[#f8fafc]'}"
			onclick={() => engine.activeTab = 'builder'}
		>
			Curriculum Builder
		</button>
		<button 
			class="tw-px-6 tw-py-3 tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-transition-colors {engine.activeTab === 'ai' ? 'tw-border-b-2 tw-border-[#14b8a6] tw-text-[#14b8a6]' : 'tw-text-[#64748b] hover:tw-text-[#f8fafc]'}"
			onclick={() => engine.activeTab = 'ai'}
		>
			RAG Terminal
		</button>
	</div>

	{#if engine.activeTab === 'builder'}
		<CurriculumBuilderArena {engine} />
	{/if}

	{#if engine.activeTab === 'ai'}
		<RagTerminalArena {engine} />
	{/if}
</div>
