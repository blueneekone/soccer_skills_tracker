<script lang="ts">
	import type { MatchDayEngine } from './MatchDayEngine.svelte';
	import MatchPlayerPickerModal from './MatchPlayerPickerModal.svelte';
	import MatchMistakePromptModal from './MatchMistakePromptModal.svelte';
	import MatchPostReviewPanel from './MatchPostReviewPanel.svelte';

	let { engine }: { engine: MatchDayEngine } = $props();

	let pendingStatType = $state<string | null>(null);
	let showPlayerPicker = $state(false);
	let showMistakeModal = $state(false);

	function handleStatClick(type: string) {
		if (engine.selectedPlayerId) {
			engine.logEvent(type);
		} else {
			pendingStatType = type;
			showPlayerPicker = true;
		}
	}

	function confirmStatPlayer(playerId: string) {
		if (pendingStatType) {
			engine.logEvent(pendingStatType, undefined, playerId);
		}
		pendingStatType = null;
		showPlayerPicker = false;
	}

	function confirmStatUnassigned() {
		if (pendingStatType) {
			engine.logEvent(pendingStatType, undefined, '');
		}
		pendingStatType = null;
		showPlayerPicker = false;
	}

	function handleRecordMistake(playerId: string, note: string) {
		engine.logMistake(note, playerId);
		showMistakeModal = false;
	}
</script>

<!-- Tactical Segmented Navigation Tabs (Z3 Identity) -->
<div class="tw-flex tw-flex-wrap tw-gap-1.5 tw-mb-4 tw-p-1 tw-bg-[#0f172a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
	<button
		type="button"
		onclick={() => engine.activeTab = 'live'}
		class="tw-flex-1 tw-min-w-[120px] tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-all {engine.activeTab === 'live' ? 'tw-bg-[#000000] tw-text-[#14b8a6] tw-border tw-border-[#14b8a6] tw-shadow-md' : 'tw-bg-transparent tw-text-slate-400 tw-border tw-border-transparent hover:tw-text-white hover:tw-bg-slate-800/50'}"
		style="border-radius: 0px;"
	>
		● LIVE TELEMETRY
	</button>
	<button
		type="button"
		onclick={() => engine.activeTab = 'roster'}
		class="tw-flex-1 tw-min-w-[120px] tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-all {engine.activeTab === 'roster' ? 'tw-bg-[#000000] tw-text-[#14b8a6] tw-border tw-border-[#14b8a6] tw-shadow-md' : 'tw-bg-transparent tw-text-slate-400 tw-border tw-border-transparent hover:tw-text-white hover:tw-bg-slate-800/50'}"
		style="border-radius: 0px;"
	>
		👥 ROSTER & SUBS
	</button>
	<button
		type="button"
		onclick={() => engine.activeTab = 'review'}
		class="tw-flex-1 tw-min-w-[120px] tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-all {engine.activeTab === 'review' ? 'tw-bg-[#000000] tw-text-[#14b8a6] tw-border tw-border-[#14b8a6] tw-shadow-md' : 'tw-bg-transparent tw-text-slate-400 tw-border tw-border-transparent hover:tw-text-white hover:tw-bg-slate-800/50'}"
		style="border-radius: 0px;"
	>
		📊 POST-MATCH REVIEW
	</button>
</div>

<div class="tw-grid tw-grid-cols-12 tw-gap-5" style="border-radius: 0px;">
	{#if engine.activeTab === 'live'}
	<!-- 12-Column Asymmetric Bento Grid: Game Event Loggers (Col 8) -->
	<div class="tw-col-span-12 lg:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 sm:tw-p-5 tw-shadow-xl" style="border-radius: 0px;">
		<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-w-2 tw-h-2 tw-bg-[#14b8a6]"></span>
				<h2 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-widest">
					Tactical Telemetry Pad (Sub-14ms Latency)
				</h2>
			</div>
			<span class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">Instant Dispatch</span>
		</div>

		<!-- Target Player Selector Well -->
		<div class="tw-mb-5 tw-p-3.5 tw-bg-[#000000] tw-border tw-border-[#334155]">
			<div class="tw-flex tw-items-center tw-justify-between tw-mb-1.5">
				<label for="matchday-target-player" class="tw-block tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-wider">Active Target Player</label>
				{#if engine.selectedPlayerId}
					{@const activeP = engine.roster.find(p => p.id === engine.selectedPlayerId)}
					<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-font-bold">LOCKED: {activeP?.name || engine.selectedPlayerId}</span>
				{/if}
			</div>
			<select
				id="matchday-target-player"
				bind:value={engine.selectedPlayerId}
				class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none tw-rounded-none"
			>
				<option value="">-- ALL SQUAD / UNASSIGNED (CLICK TO PICK) --</option>
				{#each engine.roster as player}
					<option value={player.id}>
						{player.jersey ? `#${player.jersey} ` : ''}{player.name} ({player.initials || 'PL'})
					</option>
				{/each}
			</select>

			<!-- Quick-Select Squad Chips -->
			{#if engine.roster.length > 0}
				<div class="tw-flex tw-flex-wrap tw-gap-1.5 tw-mt-2.5">
					{#each engine.roster as player}
						<button
							type="button"
							class="tw-flex tw-items-center tw-gap-1.5 tw-px-2 tw-py-1 tw-border tw-font-mono tw-text-[10px] tw-transition-all tw-cursor-pointer {engine.selectedPlayerId === player.id ? 'tw-bg-[#14b8a6]/20 tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-[#334155] tw-text-slate-300 hover:tw-border-slate-400'}"
							onclick={() => { engine.selectedPlayerId = (engine.selectedPlayerId === player.id ? '' : player.id); }}
						>
							<span class="tw-text-[#daff0a] tw-font-bold">{player.jersey ? `#${player.jersey}` : player.initials}</span>
							<span class="tw-truncate tw-max-w-[80px]">{player.name.split(' ')[0]}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Uniform 5-Column Tactical Action Grid (10 Even Pads) -->
		<div class="tw-mb-6">
			<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-widest tw-mb-2">QUICK ACTION TELEMETRY PADS</div>
			<div class="tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 lg:tw-grid-cols-5 tw-gap-2.5">
				<!-- 1. GOAL -->
				<button
					type="button"
					onclick={() => handleStatClick('GOAL')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-emerald-950/40 tw-border tw-border-emerald-500/80 tw-text-emerald-300 hover:tw-bg-emerald-500 hover:tw-text-black tw-transition-all active:tw-scale-95 group tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-black">+ GOAL</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">+10 XP</span>
				</button>

				<!-- 2. ASSIST -->
				<button
					type="button"
					onclick={() => handleStatClick('ASSIST')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-teal-950/40 tw-border tw-border-teal-400/80 tw-text-teal-300 hover:tw-bg-teal-400 hover:tw-text-black tw-transition-all active:tw-scale-95 group tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-black">+ ASSIST</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">+6 XP</span>
				</button>

				<!-- 3. SHOT -->
				<button
					type="button"
					onclick={() => handleStatClick('SHOT')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-cyan-950/40 tw-border tw-border-cyan-400/80 tw-text-cyan-300 hover:tw-bg-cyan-400 hover:tw-text-black tw-transition-all active:tw-scale-95 group tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-black">+ SHOT</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">TARGET</span>
				</button>

				<!-- 4. TACKLE -->
				<button
					type="button"
					onclick={() => handleStatClick('TACKLE')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-blue-950/40 tw-border tw-border-blue-400/80 tw-text-blue-300 hover:tw-bg-blue-400 hover:tw-text-black tw-transition-all active:tw-scale-95 group tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-black">+ TACKLE</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">WON</span>
				</button>

				<!-- 5. SAVE -->
				<button
					type="button"
					onclick={() => handleStatClick('SAVE')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-sky-950/40 tw-border tw-border-sky-400/80 tw-text-sky-300 hover:tw-bg-sky-400 hover:tw-text-black tw-transition-all active:tw-scale-95 group tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-black">+ SAVE</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">KEEPER</span>
				</button>

				<!-- 6. FOUL -->
				<button
					type="button"
					onclick={() => handleStatClick('FOUL')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-slate-900 tw-border tw-border-amber-600/80 tw-text-amber-300 hover:tw-bg-amber-600 hover:tw-text-black tw-transition-all active:tw-scale-95 group tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-wider group-hover:tw-text-black">+ FOUL</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">WHISTLE</span>
				</button>

				<!-- 7. YELLOW CARD -->
				<button
					type="button"
					onclick={() => handleStatClick('YELLOW_CARD')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-amber-950/40 tw-border tw-border-amber-400/80 tw-text-amber-300 hover:tw-bg-amber-400 hover:tw-text-black tw-transition-all active:tw-scale-95 group tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-black">+ YELLOW</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">CAUTION</span>
				</button>

				<!-- 8. RED CARD -->
				<button
					type="button"
					onclick={() => handleStatClick('RED_CARD')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-rose-950/40 tw-border tw-border-rose-500/80 tw-text-rose-300 hover:tw-bg-rose-600 hover:tw-text-white tw-transition-all active:tw-scale-95 group tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-white">+ RED CARD</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-white/80">DISMISSAL</span>
				</button>

				<!-- 9. SUB -->
				<button
					type="button"
					onclick={() => engine.logEvent('SUB', 'PLAYER SUB LOGGED')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-slate-900 tw-border tw-border-[#14b8a6]/80 tw-text-[#14b8a6] hover:tw-bg-[#14b8a6] hover:tw-text-black tw-transition-all active:tw-scale-95 group tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-black">+ SUB</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">ROTATION</span>
				</button>

				<!-- 10. LOG MISTAKE WITH PROMPT -->
				<button
					type="button"
					onclick={() => showMistakeModal = true}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-rose-950/50 tw-border tw-border-rose-500 tw-text-rose-200 hover:tw-bg-rose-600 hover:tw-text-white tw-transition-all active:tw-scale-95 group tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-wider group-hover:tw-text-white">⚡ MISTAKE</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-white/90">NOTE PROMPT</span>
				</button>
			</div>
		</div>

		<!-- Match Events History Feed -->
		<div class="tw-flex tw-items-center tw-justify-between tw-mb-2.5">
			<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-widest">
				MATCH EVENTS STREAM ({engine.events.length})
			</div>
			{#if engine.events.length > 0}
				<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6]">● REALTIME ACTIVE</span>
			{/if}
		</div>

		<div class="tw-space-y-1.5 tw-max-h-64 tw-overflow-y-auto tw-p-2 tw-bg-[#000000] tw-border tw-border-[#334155]">
			{#if engine.events.length === 0}
				<div class="tw-py-8 tw-text-center tw-text-xs tw-text-slate-500 tw-font-mono">
					No match events logged yet. Select a player and punch an action pad above.
				</div>
			{:else}
				{#each engine.events as evt (evt.id)}
					<div
						class="match-event-row tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-3 tw-py-2 tw-flex tw-justify-between tw-items-center hover:tw-border-[#14b8a6]/60 tw-transition-colors"
						style="border-radius: 0px;"
					>
						<div class="tw-flex tw-items-center tw-gap-2.5">
							<span class="tw-w-1.5 tw-h-1.5 {evt.type === 'GOAL' ? 'tw-bg-emerald-400' : evt.type.includes('CARD') ? 'tw-bg-amber-400' : evt.type === 'SUB' ? 'tw-bg-[#14b8a6]' : 'tw-bg-rose-400'}"></span>
							<span class="tw-font-mono tw-text-xs tw-text-white tw-font-bold">{evt.label}</span>
						</div>
						<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-bg-[#000000] tw-px-2 tw-py-0.5 tw-border tw-border-[#334155]">
							{evt.time}
						</span>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Sidebar Control Deck: Halftime Planner & Status (Col 4) -->
	<div class="tw-col-span-12 lg:tw-col-span-4 tw-space-y-5">
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 sm:tw-p-5 tw-shadow-xl" style="border-radius: 0px;">
			<div class="tw-flex tw-items-center tw-gap-2 tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4">
				<span class="tw-w-2 tw-h-2 tw-bg-[#fbbf24]"></span>
				<h2 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#fbbf24] tw-uppercase tw-tracking-widest">
					Halftime Tactical Control
				</h2>
			</div>

			<p class="tw-text-xs tw-text-slate-300 tw-font-sans tw-mb-4 leading-relaxed">
				Broadcast synchronized player consensus map and freeze 1st half performance logs for the tactical briefing.
			</p>

			<button
				type="button"
				onclick={() => engine.syncHalftimeChoice()}
				class="tw-w-full tw-h-11 tw-bg-[#000000] tw-text-[#fbbf24] tw-border tw-border-[#fbbf24] tw-px-4 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider hover:tw-bg-[#fbbf24] hover:tw-text-black tw-transition-all active:tw-scale-95 tw-shadow-lg"
				style="border-radius: 0px;"
			>
				⚡ SYNC HALFTIME CHOICE
			</button>

			{#if engine.showHalftimeOverlay}
				<div
					class="halftime-choice-overlay tw-mt-4 tw-bg-[#000000] tw-border tw-border-[#fbbf24] tw-p-3.5 tw-animate-fadeIn"
					style="border-radius: 0px;"
				>
					<div class="tw-flex tw-items-center tw-gap-2 tw-font-mono tw-text-xs tw-text-[#fbbf24] tw-font-bold tw-uppercase">
						<span class="tw-w-2 tw-h-2 tw-bg-[#fbbf24] tw-animate-ping"></span>
						ACTIVE SELECTION LOCKED
					</div>
					<p class="tw-text-xs tw-text-slate-300 tw-mt-1.5 leading-relaxed">
						Player consensus map synchronized. Formations locked for 2nd half kickoff.
					</p>
				</div>
			{/if}
		</div>

		<!-- Match Day Side-line Vitals -->
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 tw-shadow-xl" style="border-radius: 0px;">
			<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-widest tw-mb-3">SIDE-LINE VITALS</div>
			<div class="tw-space-y-2 tw-font-mono tw-text-xs">
				<div class="tw-flex tw-justify-between tw-items-center tw-p-2 tw-bg-[#000000] tw-border tw-border-[#334155]">
					<span class="tw-text-slate-400">OPPONENT:</span>
					<span class="tw-text-white tw-font-bold">{engine.opponentName || 'NOT SPECIFIED'}</span>
				</div>
				<div class="tw-flex tw-justify-between tw-items-center tw-p-2 tw-bg-[#000000] tw-border tw-border-[#334155]">
					<span class="tw-text-slate-400">SCORE:</span>
					<span class="tw-text-[#fbbf24] tw-font-bold">{engine.finalScore || '0 - 0'}</span>
				</div>
				<div class="tw-flex tw-justify-between tw-items-center tw-p-2 tw-bg-[#000000] tw-border tw-border-[#334155]">
					<span class="tw-text-slate-400">LIGHTNING PROXIMITY:</span>
					<span class="tw-font-bold {engine.lightningDistance < 6 ? 'tw-text-rose-400' : engine.lightningDistance <= 10 ? 'tw-text-amber-400' : 'tw-text-emerald-400'}">
						{engine.lightningDistance} MILES
					</span>
				</div>
			</div>
		</div>
	</div>
	{/if}

	{#if engine.activeTab === 'roster'}
	<!-- Roster & Subs Management Tab -->
	<div class="tw-col-span-12 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 tw-shadow-xl" style="border-radius: 0px;">
		<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-5">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-w-2 tw-h-2 tw-bg-[#fbbf24]"></span>
				<h2 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#fbbf24] tw-uppercase tw-tracking-widest">
					Matchday Squad & Active Rotation Deck ({engine.roster.length} Athletes)
				</h2>
			</div>
			<div class="tw-flex tw-items-center tw-gap-2">
				<a
					href="/coach/logistics?tab=roster"
					class="tw-font-mono tw-text-[11px] tw-text-[#14b8a6] hover:tw-underline"
				>
					[ Manage Full Roster → ]
				</a>
			</div>
		</div>

		{#if engine.loadingRoster}
			<div class="tw-p-8 tw-bg-[#000000] tw-border tw-border-[#334155] tw-text-center">
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-m-0">Loading team squad from database…</p>
			</div>
		{:else if engine.roster.length === 0}
			<div class="tw-p-8 tw-bg-[#000000] tw-border tw-border-dashed tw-border-[#334155] tw-text-center">
				<p class="tw-font-mono tw-text-xs tw-text-[#fbbf24] tw-font-bold tw-mb-2">NO SQUAD PLAYERS FOUND</p>
				<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-mb-4">Ingest your team roster on the logistics tab to populate the matchday console.</p>
				<a
					href="/coach/logistics?tab=roster"
					class="tw-inline-block tw-px-4 tw-py-2 tw-bg-[#14b8a6] tw-text-black tw-font-mono tw-text-xs tw-font-bold"
				>
					GO TO ROSTER INGESTION →
				</a>
			</div>
		{:else}
			<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
				<!-- Starting Lineup Panel -->
				<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-4">
					<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-2.5 tw-mb-3">
						<h3 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-wider tw-m-0">
							Active Lineup on Pitch ({engine.starters.length})
						</h3>
						<span class="tw-font-mono tw-text-[10px] tw-text-emerald-400 tw-font-bold">● IN PLAY</span>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-2">
						{#each engine.starters as player (player.id)}
							<div class="tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-2.5 hover:tw-border-[#14b8a6] tw-transition-colors">
								<div class="tw-flex tw-items-center tw-gap-3 tw-min-w-0">
									<span class="tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-border tw-border-[#14b8a6] tw-bg-[#14b8a6]/20 tw-text-[11px] tw-font-mono tw-font-black tw-text-[#14b8a6]">
										{player.initials || 'PL'}
									</span>
									<div>
										<div class="tw-font-mono tw-text-xs tw-font-bold tw-text-white tw-truncate">{player.name}</div>
										<div class="tw-font-mono tw-text-[10px] tw-text-slate-400">
											{player.jersey ? `JERSEY #${player.jersey}` : 'NO NUMBER'}
											{player.position ? ` • ${player.position}` : ''}
										</div>
									</div>
								</div>
								<div class="tw-flex tw-items-center tw-gap-2">
									<button
										type="button"
										class="tw-px-2.5 tw-py-1 tw-bg-amber-950/40 tw-border tw-border-amber-500/60 tw-text-amber-300 hover:tw-bg-amber-500 hover:tw-text-black tw-font-mono tw-text-[10px] tw-font-bold tw-transition-colors"
										onclick={() => engine.moveToBench(player.id)}
									>
										↘ TO BENCH
									</button>
								</div>
							</div>
						{/each}
						{#if engine.starters.length === 0}
							<p class="tw-font-mono tw-text-xs tw-text-slate-500 tw-text-center tw-py-4">No active starters. Move players from the bench.</p>
						{/if}
					</div>
				</div>

				<!-- Bench / Substitutes Panel -->
				<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-4">
					<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-2.5 tw-mb-3">
						<h3 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#fbbf24] tw-uppercase tw-tracking-wider tw-m-0">
							Bench & Available Substitutes ({engine.bench.length})
						</h3>
						<span class="tw-font-mono tw-text-[10px] tw-text-slate-400">READY</span>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-2">
						{#each engine.bench as player (player.id)}
							<div class="tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-2.5 hover:tw-border-[#fbbf24] tw-transition-colors">
								<div class="tw-flex tw-items-center tw-gap-3 tw-min-w-0">
									<span class="tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-border tw-border-[#334155] tw-bg-[#020617] tw-text-[11px] tw-font-mono tw-font-black tw-text-slate-300">
										{player.initials || 'PL'}
									</span>
									<div>
										<div class="tw-font-mono tw-text-xs tw-font-bold tw-text-slate-200 tw-truncate">{player.name}</div>
										<div class="tw-font-mono tw-text-[10px] tw-text-slate-400">
											{player.jersey ? `JERSEY #${player.jersey}` : 'NO NUMBER'}
											{player.position ? ` • ${player.position}` : ''}
										</div>
									</div>
								</div>
								<div class="tw-flex tw-items-center tw-gap-2">
									<button
										type="button"
										class="tw-px-2.5 tw-py-1 tw-bg-emerald-950/40 tw-border tw-border-emerald-500/60 tw-text-emerald-300 hover:tw-bg-emerald-500 hover:tw-text-black tw-font-mono tw-text-[10px] tw-font-bold tw-transition-colors"
										onclick={() => engine.moveToStarters(player.id)}
									>
										↗ SUB IN
									</button>
								</div>
							</div>
						{/each}
						{#if engine.bench.length === 0}
							<p class="tw-font-mono tw-text-xs tw-text-slate-500 tw-text-center tw-py-4">No players currently on the bench.</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
	{/if}

	{#if engine.activeTab === 'review'}
		<MatchPostReviewPanel {engine} />
	{/if}
</div>

<MatchPlayerPickerModal
	open={showPlayerPicker}
	statType={pendingStatType || 'GOAL'}
	roster={engine.roster}
	onSelectPlayer={confirmStatPlayer}
	onSelectUnassigned={confirmStatUnassigned}
	onClose={() => { showPlayerPicker = false; pendingStatType = null; }}
/>

<MatchMistakePromptModal
	open={showMistakeModal}
	roster={engine.roster}
	initialPlayerId={engine.selectedPlayerId}
	onConfirm={handleRecordMistake}
	onClose={() => showMistakeModal = false}
/>
