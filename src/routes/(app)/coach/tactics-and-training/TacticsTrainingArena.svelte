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
		<!-- WAR ROOM COMMAND LAUNCHPAD & WHITEBOARD -->
		<div class="tw-max-w-[1700px] tw-mx-auto tw-p-4 sm:tw-p-6 tw-space-y-6">
			<!-- Hero Command Banner -->
			<div class="tw-bg-[#0f172a]/95 tw-backdrop-blur-md tw-border tw-border-[#334155] tw-rounded-xl tw-p-6 tw-shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)] tw-border-t-[rgba(255,255,255,0.08)] tw-flex tw-flex-col md:tw-flex-row md:tw-items-center md:tw-justify-between tw-gap-4">
				<div>
					<div class="tw-flex tw-items-center tw-gap-2.5">
						<span class="tw-inline-block tw-h-3 tw-w-3 tw-rounded-full tw-bg-[#fbbf24] tw-shadow-[0_0_12px_#fbbf24] tw-animate-pulse"></span>
						<h2 class="tw-font-mono tw-font-black tw-text-base sm:tw-text-lg tw-tracking-widest tw-text-white tw-uppercase tw-m-0">
							TACTICAL WAR ROOM STUDIO
						</h2>
					</div>
					<p class="tw-text-xs sm:tw-text-sm tw-text-slate-400 tw-mt-1 tw-max-w-2xl">
						Full-pitch vector whiteboard with coordinate-mapped passing routes, defensive press triggers, and real-time playbook compilation.
					</p>
				</div>
				<div class="tw-flex tw-items-center tw-gap-3">
					<a
						href="/coach/tactical"
						class="tw-inline-flex tw-items-center tw-gap-2.5 tw-bg-[#fbbf24] hover:tw-bg-[#f59e0b] tw-text-black tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-wider tw-px-5 tw-py-3 tw-rounded-lg tw-shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:tw-shadow-[0_0_25px_rgba(251,191,36,0.6)] active:tw-scale-[0.98] tw-transition-all tw-no-underline tw-cursor-pointer"
					>
						<span>↗</span>
						<span>LAUNCH FULLSCREEN WAR ROOM</span>
					</a>
				</div>
			</div>

			<!-- Interactive Tactical Pitch Stage -->
			<div class="coach-tactics-shell tw-w-full tw-h-[calc(100vh-260px)] tw-min-h-[620px] tw-relative tw-overflow-hidden tw-font-mono tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-xl tw-shadow-2xl">
				<!-- Top Right Pop-Out Overlay Button -->
				<a
					href="/coach/tactical"
					class="tw-absolute tw-top-4 tw-right-4 tw-z-[2000] tw-bg-[#0f172a]/90 hover:tw-bg-[#0f172a] tw-backdrop-blur-md tw-border tw-border-[#fbbf24]/60 hover:tw-border-[#fbbf24] tw-text-[#fbbf24] hover:tw-text-white tw-font-mono tw-text-xs tw-font-bold tw-px-3.5 tw-py-2 tw-rounded-lg tw-shadow-lg tw-flex tw-items-center tw-gap-2 tw-transition-all tw-no-underline"
					title="Pop out into dedicated full-page view"
				>
					<span>⤢</span>
					<span>EXPAND FULL SCREEN</span>
				</a>

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
		</div>

	{:else if engine.activeTab === 'matchday'}
		<!-- MATCH DAY CONSOLE -->
		<div class="tw-max-w-[1700px] tw-mx-auto tw-p-4 sm:tw-p-6 tw-space-y-6">
			<MatchDayHUD engine={matchDayEngine} />
			<MatchDayArena engine={matchDayEngine} />
		</div>
	{/if}
</div>
