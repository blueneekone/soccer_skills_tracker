<script lang="ts">
	import type { TacticsTrainingEngine } from './TacticsTrainingEngine.svelte';

	interface Props {
		engine: TacticsTrainingEngine;
	}

	let { engine }: Props = $props();

	const tabs = [
		{
			id: 'forge' as const,
			label: 'The Forge',
			icon: '🛠️',
			desc: 'Intent Engine • Drill Designer • Playbook',
		},
		{
			id: 'war-room' as const,
			label: 'War Room',
			icon: '🗺️',
			desc: 'Pitch Whiteboard • Passing Vectors • Simulation',
		},
		{
			id: 'matchday' as const,
			label: 'Match Day',
			icon: '⚽',
			desc: 'Sideline Telemetry • Box Scores • Mistake Notes',
		},
	];
</script>

<header class="tw-bg-[#080d1a] tw-border-b tw-border-[#334155] tw-sticky tw-top-0 tw-z-40 tw-shadow-2xl" style="border-radius: 0px;">
	<!-- Top Command Bar: Identity, Squad Anchor & Global Help -->
	<div class="tw-max-w-[1700px] tw-mx-auto tw-px-4 sm:tw-px-6 lg:tw-px-8 tw-py-3 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
		<!-- Left: Identity & Squad Badge -->
		<div class="tw-flex tw-items-center tw-gap-3">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-w-2.5 tw-h-2.5 tw-bg-[#14b8a6] tw-animate-pulse" style="border-radius: 0px;"></span>
				<h1 class="tw-font-mono tw-font-black tw-text-sm sm:tw-text-base tw-tracking-widest tw-text-white tw-uppercase tw-m-0">
					TACTICS & TRAINING
				</h1>
			</div>
			<div class="tw-h-4 tw-w-px tw-bg-[#334155] tw-hidden sm:tw-block"></div>
			<span class="tw-font-mono tw-text-xs tw-text-slate-400 tw-tracking-wider tw-uppercase tw-hidden sm:tw-inline">
				Unified Sideline Suite
			</span>
			{#if engine.teamScope.currentTeam}
				<div class="tw-h-4 tw-w-px tw-bg-[#334155] tw-hidden md:tw-block"></div>
				<span class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-slate-200 tw-font-mono tw-text-[11px] tw-px-2.5 tw-py-0.5 tw-hidden md:tw-inline-flex tw-items-center tw-gap-1.5" style="border-radius: 0px;">
					<span class="tw-text-[#daff0a]">▶</span> {engine.teamScope.currentTeam.name}
				</span>
			{/if}
		</div>

		<!-- Right: Quick Action Controls & Help -->
		<div class="tw-flex tw-items-center tw-gap-2">
			{#if engine.activeTab === 'forge'}
				<button
					type="button"
					onclick={() => engine.toggleHelpModal()}
					class="tw-bg-[#0f172a] hover:tw-bg-slate-800 tw-border tw-border-[#334155] hover:tw-border-[#14b8a6]/60 tw-text-slate-300 hover:tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-medium tw-px-3 tw-py-1.5 active:tw-scale-[0.98] tw-transition-all tw-inline-flex tw-items-center tw-gap-2 tw-cursor-pointer"
					style="border-radius: 0px;"
					title="Open Forge Operating Manual & System Help"
				>
					<span class="tw-text-[#14b8a6]">📖</span>
					<span class="tw-hidden sm:tw-inline">Help & Manual</span>
					<span class="sm:tw-hidden">Help</span>
				</button>
			{/if}

			<!-- Telemetry Readout Pill -->
			<div class="tw-flex tw-items-center tw-gap-2 tw-font-mono tw-text-[11px]">
				<span class="tw-px-2.5 tw-py-1 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-[#14b8a6]" style="border-radius: 0px;">
					STATUS: <strong class="tw-text-white">ONLINE</strong>
				</span>
			</div>
		</div>
	</div>

	<!-- Primary Segmented Tab Navigation: The Forge | War Room | Match Day -->
	<div class="tw-border-t tw-border-[#334155] tw-bg-[#040814]">
		<div class="tw-max-w-[1700px] tw-mx-auto tw-px-4 sm:tw-px-6 lg:tw-px-8">
			<nav class="tw-flex tw-items-center tw-gap-1.5 tw-py-2 tw-overflow-x-auto" aria-label="Tactics and Training Navigation">
				{#each tabs as tab}
					{@const isActive = engine.activeTab === tab.id}
					<button
						type="button"
						onclick={() => engine.setTab(tab.id)}
						class="tw-flex tw-items-center tw-gap-2.5 tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-all tw-whitespace-nowrap tw-cursor-pointer {isActive ? 'tw-bg-[#0f172a] tw-text-[#fbbf24] tw-border tw-border-[#fbbf24] tw-shadow-lg' : 'tw-bg-transparent tw-text-slate-400 tw-border tw-border-transparent hover:tw-text-white hover:tw-bg-slate-900/60'}"
						style="border-radius: 0px;"
					>
						<span class="tw-text-sm">{tab.icon}</span>
						<span>{tab.label}</span>
						<span class="tw-hidden lg:tw-inline tw-text-[10px] tw-font-normal tw-text-slate-500 tw-lowercase">
							({tab.desc.split('•')[0].trim()})
						</span>
					</button>
				{/each}
			</nav>
		</div>
	</div>
</header>
