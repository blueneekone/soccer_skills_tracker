<script lang="ts">
	import type { TacticsTrainingEngine } from './TacticsTrainingEngine.svelte';
	import { CoachIntentEngineView } from '$lib/coach/intent/index.js';
	import CoachDrillDesignerStudio from '$lib/components/coach/drill/CoachDrillDesignerStudio.svelte';
	import CoachDrillLibraryArena from '$lib/components/coach/drill/CoachDrillLibraryArena.svelte';
	import CoachForgeHelpModal from '$lib/components/coach/drill/CoachForgeHelpModal.svelte';

	// War Room imports
	import { CoachTacticalEngine } from '../tactical/CoachTacticalEngine.svelte.js';
	import '$lib/styles/coach-tactics-stratagem.css';
	import TacticalArena from '$lib/components/coach/TacticalArena.svelte';
	import TacticalHUD from '$lib/components/coach/TacticalHUD.svelte';

	// Match Day imports
	import { MatchDayEngine } from '../matchday/MatchDayEngine.svelte';
	import MatchDayHUD from '../matchday/MatchDayHUD.svelte';
	import MatchDayArena from '../matchday/MatchDayArena.svelte';

	interface Props {
		engine: TacticsTrainingEngine;
	}

	let { engine }: Props = $props();

	// Instantiate persistent sub-engines for War Room & Match Day
	const warRoomEngine = new CoachTacticalEngine();
	warRoomEngine.subscribe();

	const matchDayEngine = new MatchDayEngine();
	matchDayEngine.subscribe();
</script>

<svelte:window onkeydown={(e) => {
	if (engine.activeTab === 'war-room') {
		warRoomEngine.gridEngine.handleKeyDown(e);
	}
}} />

<div class="tw-w-full tw-min-h-[calc(100vh-120px)] tw-bg-[#000000] tw-text-[#fafafa]">
	{#if engine.activeTab === 'forge'}
		<!-- THE FORGE WORKSPACE -->
		<div class="tw-max-w-[1700px] tw-mx-auto tw-p-4 sm:tw-p-6">
			<!-- Sub-nav: Intent Engine | Drill Designer | Drill Library -->
			<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-6">
				<nav class="tw-flex tw-items-center tw-gap-2 tw-overflow-x-auto" aria-label="Forge Workspace Tabs">
					<button
						type="button"
						onclick={() => engine.setForgeSubTab('intent')}
						class="tw-flex tw-items-center tw-gap-2 tw-px-3.5 tw-py-1.5 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-transition-all tw-cursor-pointer {engine.forgeSubTab === 'intent' ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]' : 'tw-bg-transparent tw-text-slate-400 tw-border tw-border-transparent hover:tw-text-white'}"
						style="border-radius: 0px;"
					>
						<span>🎯</span>
						<span>Intent Engine</span>
					</button>
					<button
						type="button"
						onclick={() => engine.setForgeSubTab('designer')}
						class="tw-flex tw-items-center tw-gap-2 tw-px-3.5 tw-py-1.5 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-transition-all tw-cursor-pointer {engine.forgeSubTab === 'designer' ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]' : 'tw-bg-transparent tw-text-slate-400 tw-border tw-border-transparent hover:tw-text-white'}"
						style="border-radius: 0px;"
					>
						<span>📐</span>
						<span>Drill Designer</span>
					</button>
					<button
						type="button"
						onclick={() => engine.setForgeSubTab('library')}
						class="tw-flex tw-items-center tw-gap-2 tw-px-3.5 tw-py-1.5 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-transition-all tw-cursor-pointer {engine.forgeSubTab === 'library' ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]' : 'tw-bg-transparent tw-text-slate-400 tw-border tw-border-transparent hover:tw-text-white'}"
						style="border-radius: 0px;"
					>
						<span>📚</span>
						<span>Drill Library</span>
					</button>
				</nav>

				<span class="tw-font-mono tw-text-xs tw-text-slate-400 tw-hidden md:inline">
					Active Squad: <strong class="tw-text-white">{engine.teamScope.teamLabel || 'Your Squad'}</strong>
				</span>
			</div>

			<!-- Active Forge View -->
			{#if engine.forgeSubTab === 'intent'}
				<CoachIntentEngineView showDrillLibraryLink={true} />
			{:else if engine.forgeSubTab === 'designer'}
				<CoachDrillDesignerStudio
					teamId={engine.effectiveTeamId}
					onDrillSaved={() => engine.setForgeSubTab('library')}
					onDeployToIntent={() => engine.setForgeSubTab('intent')}
				/>
			{:else}
				<CoachDrillLibraryArena
					teamId={engine.effectiveTeamId}
					onOpenInDesigner={() => engine.setForgeSubTab('designer')}
					onDeployToIntent={() => engine.setForgeSubTab('intent')}
					onNewDrill={() => engine.setForgeSubTab('designer')}
				/>
			{/if}
		</div>

		<!-- Operating Manual & System Help Modal -->
		<CoachForgeHelpModal
			open={engine.showHelpModal}
			onClose={() => engine.showHelpModal = false}
		/>

	{:else if engine.activeTab === 'war-room'}
		<!-- AUTO-FULLSCREEN WAR ROOM -->
		<div class="coach-tactics-shell tw-fixed tw-inset-0 tw-z-[9999] tw-w-screen tw-h-screen tw-overflow-hidden tw-font-mono tw-bg-[#020617]">
			<!-- Close button to exit fullscreen War Room back to Forge -->
			<button
				type="button"
				class="tw-absolute tw-top-4 tw-right-4 tw-z-[2000] tw-bg-[#0f172a]/90 hover:tw-bg-[#0f172a] tw-backdrop-blur-md tw-border tw-border-[#ef4444]/60 hover:tw-border-[#ef4444] tw-text-[#ef4444] hover:tw-text-white tw-font-mono tw-text-xs tw-font-bold tw-px-3.5 tw-py-2 tw-rounded-lg tw-shadow-lg tw-flex tw-items-center tw-gap-2 tw-transition-all tw-cursor-pointer"
				onclick={() => engine.setTab('forge')}
				aria-label="Exit War Room"
			>
				<span>✕</span>
				<span>MINIMIZE WAR ROOM</span>
			</button>

			<TacticalArena
				model={warRoomEngine.gridEngine}
				warRoomTool={warRoomEngine.warRoomTool}
				isHalfField={warRoomEngine.isHalfField}
			/>

			{#if warRoomEngine.isToolbarVisible}
				<TacticalHUD
					model={warRoomEngine.gridEngine}
					teamId={warRoomEngine.teamScope.selectedTeamId || engine.effectiveTeamId}
					ondeploy={(cartridge) => warRoomEngine.deployPlay(cartridge)}
					isHalfField={warRoomEngine.isHalfField}
					onToggleHalfField={() => warRoomEngine.isHalfField = !warRoomEngine.isHalfField}
					onToggleToolbar={() => warRoomEngine.isToolbarVisible = !warRoomEngine.isToolbarVisible}
					onExit={() => engine.setTab('forge')}
				/>
			{:else}
				<button
					type="button"
					class="coach-os-action-chip tw-absolute tw-bottom-4 tw-left-4 tw-z-[2000] tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-cursor-pointer tw-rounded"
					onclick={() => warRoomEngine.isToolbarVisible = true}
				>
					<span class="tw-text-[#14b8a6]">↑ SHOW TOOLS</span>
				</button>
			{/if}
		</div>

	{:else if engine.activeTab === 'matchday'}
		<!-- MATCH DAY CONSOLE -->
		<div class="tw-max-w-[1700px] tw-mx-auto tw-p-4 sm:tw-p-6 tw-space-y-6">
			<MatchDayHUD engine={matchDayEngine} />
			<MatchDayArena engine={matchDayEngine} />
		</div>
	{/if}
</div>
