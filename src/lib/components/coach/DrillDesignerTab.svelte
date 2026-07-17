<script lang="ts">
	import { DrillDesignerEngine } from './DrillDesignerEngine.svelte.js';
	import DrillDesignerArena from './DrillDesignerArena.svelte';
	import DrillDesignerHUD from './DrillDesignerHUD.svelte';

	let { teamId = '', onDrillSaved = () => {} }: { teamId?: string, onDrillSaved?: () => void } = $props();

	const engine = new DrillDesignerEngine();

	$effect(() => {
		engine.setTeamId(teamId);
		engine.setOnDrillSaved(onDrillSaved);
	});

	engine.subscribe();
</script>

<div class="bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6">
	<!-- Main Arena spans 8 columns -->
	<div class="bento-span-8 lg:tw-col-span-8 tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-flex tw-flex-col tw-overflow-hidden">
		<div class="tw-p-4 tw-border-b tw-border-[#334155]">
			<h2 class="tw-text-white tw-font-bold tw-text-lg">Drill Designer</h2>
		</div>
		<div class="tw-p-4 tw-flex-1">
			<DrillDesignerArena {engine} />
			<button class="tw-w-full tw-mt-4 tw-bg-[#14b8a6] tw-text-black tw-font-bold tw-py-3 tw-rounded-xl tw-hover:bg-[#0d9488] tw-transition-colors" onclick={() => engine.saveWorkout()}>
				Save to Team Library
			</button>
		</div>
	</div>

	<!-- HUD and Library spans 4 columns -->
	<div class="bento-span-4 lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6">
		<div class="tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-p-4">
			<DrillDesignerHUD {engine} />
		</div>

		<div class="tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-p-4 tw-flex-1">
			<h3 class="tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest tw-mb-4">TEAM DRILL LIBRARY</h3>
			<ul class="tw-space-y-2">
				{#if engine.loadingSaved}
					<li class="tw-text-white">Loading team drills…</li>
				{:else if engine.savedTeamDrills.length === 0}
					<li class="tw-text-[#94a3b8] tw-text-sm">No team drills yet — save one above to assign from Intent Engine.</li>
				{:else}
					{#each engine.savedTeamDrills as d (d.id)}
						<li class="tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-xl tw-p-3 tw-flex tw-flex-col">
							<span class="tw-text-white tw-font-bold">{d.title}</span>
							{#if d.attributeId}
								<span class="tw-text-[#14b8a6] tw-text-xs tw-font-mono mt-1">[{d.attributeId}]</span>
							{/if}
						</li>
					{/each}
				{/if}
			</ul>
		</div>
	</div>
</div>

<style>
	/* Styles moved to HUD and Arena respectively. Keep layout if necessary. */
</style>
