<script lang="ts">
	import type { ForgeEngine } from './ForgeEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { browser } from '$app/environment';

	let { engine }: { engine: ForgeEngine } = $props();

	function sortableList(node: HTMLElement, options: any) {
		if (!browser) return;
		let sortable: any;
		import('sortablejs').then(m => {
			const Sortable = m.default;
			sortable = Sortable.create(node, {
				...options,
				animation: 150,
				ghostClass: 'sortable-ghost',
				dragClass: 'sortable-drag'
			});
		});
		return {
			destroy() {
				if (sortable) sortable.destroy();
			}
		};
	}
</script>

{#if engine.showAlert}
	<div class="vanguard-panel tw-w-full tw-mb-6 tw-border-[#fbbf24] tw-bg-[#fbbf24]/10 tw-p-4 tw-flex tw-items-start tw-gap-4 tw-transition-all tw-duration-200">
		<Icon name={"status.pulse" as IconName} size={24} class="tw-text-[#fbbf24] tw-shrink-0" />
		<div class="tw-flex-1">
			<div class="tw-font-mono tw-text-xs tw-text-[#fbbf24] tw-font-bold tw-mb-1">RL ADAPTIVE ENGINE // BIOMETRIC WARNING</div>
			<div class="tw-font-mono tw-text-sm tw-text-[#fbbf24]/90">Player X's heart rate variability suggests a 15% reduction in drill intensity today. We recommend replacing AEROBIC FITNESS with a lower-load phase play.</div>
		</div>
		<button onclick={() => engine.showAlert = false} class="tw-text-[#fbbf24]/60 hover:tw-text-[#fbbf24] tw-transition-colors">
			<Icon name={"nav.close" as IconName} size={20} />
		</button>
	</div>
{/if}

<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-items-start">
	<div class="vanguard-panel lg:tw-col-span-4 tw-flex tw-flex-col tw-p-0">
		<div class="tw-bg-[#020617] tw-border-b tw-border-[#334155] tw-p-3 tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase tw-tracking-widest">
			Drill Library
		</div>
		<div 
			class="tw-p-4 tw-flex tw-flex-col tw-gap-2 tw-min-h-[200px]"
			use:sortableList={{ group: { name: 'drills', pull: 'clone', put: false }, sort: false }}
		>
			{#each engine.drillLibrary as drill (drill.id)}
				<div class="tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-p-3 tw-font-mono tw-text-xs tw-text-[#e2e8f0] tw-cursor-move hover:tw-border-[#14b8a6] tw-transition-colors tw-duration-150">
					{drill.title}
				</div>
			{/each}
		</div>
	</div>

	<div class="lg:tw-col-span-8 tw-flex tw-flex-col tw-gap-6">
		<div 
			class="tw-grid tw-gap-4" 
			style="grid-template-columns: repeat(auto-fit, minmax(clamp(200px, 25vw, 400px), 1fr));"
		>
			{#each engine.microcycles as mc (mc.id)}
				<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-flex-col">
					<div class="tw-bg-[#020617] tw-border-b tw-border-[#334155] tw-p-3 tw-flex tw-items-center tw-justify-between">
						<span class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-uppercase tw-tracking-widest">{mc.title}</span>
					</div>
					<div 
						class="tw-p-4 tw-flex tw-flex-col tw-gap-2 tw-min-h-[150px]"
						use:sortableList={{ group: 'drills' }}
					>
					</div>
				</div>
			{/each}
		</div>

		<div class="tw-flex tw-justify-end">
			<button 
				class="tw-bg-[#14b8a6] hover:tw-bg-[#0d9488] active:tw-scale-[0.97] tw-text-[#020617] tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-px-8 tw-py-3 tw-transition-all tw-duration-200 disabled:tw-opacity-50"
				onclick={() => engine.commitMacrocycle()}
				disabled={engine.isCommitting}
			>
				{engine.isCommitting ? 'COMMITTING...' : 'COMMIT MACROCYCLE'}
			</button>
		</div>
	</div>
</div>

<style>
	:global(.sortable-ghost) {
		opacity: 0.4;
		border: 1px dashed #14b8a6 !important;
	}
	:global(.sortable-drag) {
		cursor: grabbing !important;
		box-shadow: 0 10px 25px rgba(0,0,0,0.5);
	}
</style>
