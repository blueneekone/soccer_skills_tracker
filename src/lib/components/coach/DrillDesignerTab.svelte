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

<div class="designer-tab">
	<div class="bento-section">
		<div class="card">
			<div class="card-header">Drill designer</div>
			
			<DrillDesignerHUD {engine} />

			<div class="card-body">
				<label>Spatial Layout</label>
				<DrillDesignerArena {engine} />
				<button class="btn-primary w-100 tw-mt-4" onclick={() => engine.saveWorkout()}>Save to team library</button>
			</div>
		</div>

		<div class="card">
			<div class="card-header">Team drill library</div>
			<div class="card-body p-0">
				<ul class="session-list">
					{#if engine.loadingSaved}
						<li class="session-empty">Loading team drills…</li>
					{:else if engine.savedTeamDrills.length === 0}
						<li class="session-empty">No team drills yet — save one above to assign from Intent Engine.</li>
					{:else}
						{#each engine.savedTeamDrills as d (d.id)}
							<li class="session-item workout-item">
								<div class="flex-1">
									<b>{d.title}</b>
									{#if d.attributeId}
										<div class="text-sm-sub">Attribute: {d.attributeId}</div>
									{/if}
								</div>
							</li>
						{/each}
					{/if}
				</ul>
			</div>
		</div>
	</div>
</div>

<style>
	/* Styles moved to HUD and Arena respectively. Keep layout if necessary. */
</style>
