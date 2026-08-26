<script lang="ts">
	import type { MatchDayEngine } from './MatchDayEngine.svelte';

	let { engine }: { engine: MatchDayEngine } = $props();
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
					<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-font-bold">LOCKED</span>
				{/if}
			</div>
			<select
				id="matchday-target-player"
				bind:value={engine.selectedPlayerId}
				class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none"
				style="border-radius: 0px;"
			>
				<option value="">-- ALL SQUAD / UNASSIGNED --</option>
				{#each engine.roster as player}
					<option value={player.id}>{player.name}</option>
				{/each}
			</select>
		</div>

		<!-- Uniform 5-Column Tactical Action Grid (Even Heights, Enterprise Palette) -->
		<div class="tw-mb-6">
			<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-widest tw-mb-2">QUICK ACTION TELEMETRY PADS</div>
			<div class="tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 lg:tw-grid-cols-5 tw-gap-2.5">
				<!-- 1. GOAL -->
				<button
					type="button"
					onclick={() => engine.logEvent('GOAL', 'GOAL LOGGED')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-emerald-950/40 tw-border tw-border-emerald-500/80 tw-text-emerald-300 hover:tw-bg-emerald-500 hover:tw-text-black tw-transition-all active:tw-scale-95 group"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-black">+ GOAL</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">+10 XP</span>
				</button>

				<!-- 2. YELLOW CARD -->
				<button
					type="button"
					onclick={() => engine.logEvent('YELLOW_CARD', 'YELLOW CARD LOGGED')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-amber-950/40 tw-border tw-border-amber-400/80 tw-text-amber-300 hover:tw-bg-amber-400 hover:tw-text-black tw-transition-all active:tw-scale-95 group"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-black">+ YELLOW</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">CAUTION</span>
				</button>

				<!-- 3. RED CARD -->
				<button
					type="button"
					onclick={() => engine.logEvent('RED_CARD', 'RED CARD LOGGED')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-rose-950/40 tw-border tw-border-rose-500/80 tw-text-rose-300 hover:tw-bg-rose-600 hover:tw-text-white tw-transition-all active:tw-scale-95 group"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-white">+ RED CARD</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-white/80">DISMISSAL</span>
				</button>

				<!-- 4. SUB -->
				<button
					type="button"
					onclick={() => engine.logEvent('SUB', 'PLAYER SUB LOGGED')}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-teal-950/40 tw-border tw-border-[#14b8a6]/80 tw-text-[#14b8a6] hover:tw-bg-[#14b8a6] hover:tw-text-black tw-transition-all active:tw-scale-95 group"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-black tw-tracking-wider group-hover:tw-text-black">+ SUB</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-80 group-hover:tw-text-black/80">ROTATION</span>
				</button>

				<!-- 5. LOG MISTAKE (DISCIPLINED SLATE/ROSE - FIXED FROM PURPLE) -->
				<button
					type="button"
					onclick={() => engine.logMistake()}
					class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-16 tw-p-2 tw-bg-slate-900 tw-border tw-border-slate-600 tw-text-slate-200 hover:tw-border-rose-400 hover:tw-bg-rose-950/40 hover:tw-text-rose-300 tw-transition-all active:tw-scale-95 group col-span-2 sm:col-span-1"
					style="border-radius: 0px;"
				>
					<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-wider group-hover:tw-text-rose-300">⚡ MISTAKE</span>
					<span class="tw-font-mono tw-text-[9px] tw-opacity-70 group-hover:tw-text-rose-300/80">TARGET CUE</span>
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
					Matchday Roster Allocation & Substitution Deck
				</h2>
			</div>
			<span class="tw-font-mono tw-text-xs tw-text-slate-400">Drag & Drop Allocation</span>
		</div>

		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
			<div>
				<h3 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-wider tw-mb-2.5">Starting XI (Pitch)</h3>
				<div class="tw-space-y-2 tw-p-4 tw-bg-[#000000] tw-border tw-border-[#334155] tw-min-h-[260px] tw-flex tw-flex-col tw-justify-center tw-items-center">
					<div class="tw-text-xs tw-text-slate-500 tw-font-mono text-center">
						Drag starting players into active pitch formation slots...
					</div>
				</div>
			</div>
			<div>
				<h3 class="tw-font-mono tw-text-xs tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-wider tw-mb-2.5">Available Substitutes (Bench)</h3>
				<div class="tw-space-y-2 tw-p-4 tw-bg-[#000000] tw-border tw-border-[#334155] tw-min-h-[260px] tw-flex tw-flex-col tw-justify-center tw-items-center">
					<div class="tw-text-xs tw-text-slate-500 tw-font-mono text-center">
						Drag bench players here to stage substitution warmups...
					</div>
				</div>
			</div>
		</div>
	</div>
	{/if}

	{#if engine.activeTab === 'review'}
	<!-- Post-Match Data Table Tab (Vanguard SIEM Standard) -->
	<div class="tw-col-span-12 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 tw-shadow-xl" style="border-radius: 0px;">
		<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-5">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-w-2 tw-h-2 tw-bg-[#14b8a6]"></span>
				<h2 class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-widest">
					Post-Match Telemetry Audit Matrix
				</h2>
			</div>
			<span class="tw-font-mono tw-text-xs tw-text-slate-400">Total Logged: {engine.events.length} Events</span>
		</div>

		<div class="tw-w-full tw-overflow-x-auto">
			<table class="tw-w-full tw-text-left tw-border-collapse">
				<thead>
					<tr class="tw-border-b tw-border-[#334155] tw-bg-[#000000]">
						<th class="tw-p-3 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-tracking-wider">Timestamp</th>
						<th class="tw-p-3 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-tracking-wider">Event Code</th>
						<th class="tw-p-3 tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-tracking-wider">Audit Label (Click to Edit)</th>
					</tr>
				</thead>
				<tbody class="tw-divide-y tw-divide-[#334155]/40">
					{#each engine.events as evt (evt.id)}
					<tr class="hover:tw-bg-[#000000]/70 tw-transition-colors">
						<td class="tw-p-3 tw-font-mono tw-text-xs tw-text-slate-300">{evt.time}</td>
						<td class="tw-p-3 tw-font-mono tw-text-xs">
							<span class="tw-px-2 tw-py-0.5 tw-border {evt.type === 'GOAL' ? 'tw-bg-emerald-950/60 tw-border-emerald-500 tw-text-emerald-300' : evt.type.includes('CARD') ? 'tw-bg-amber-950/60 tw-border-amber-400 tw-text-amber-300' : evt.type === 'SUB' ? 'tw-bg-teal-950/60 tw-border-[#14b8a6] tw-text-[#14b8a6]' : 'tw-bg-slate-900 tw-border-slate-600 tw-text-slate-300'}">
								{evt.type}
							</span>
						</td>
						<td class="tw-p-3">
							<input
								type="text"
								value={evt.label}
								onchange={(e) => engine.editEvent(evt.id, e.currentTarget.value)}
								class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-text-white tw-font-mono tw-text-xs tw-w-full tw-px-2.5 tw-py-1 focus:tw-border-[#14b8a6] focus:tw-outline-none"
								style="border-radius: 0px;"
							/>
						</td>
					</tr>
					{/each}
					{#if engine.events.length === 0}
					<tr>
						<td colspan="3" class="tw-p-8 tw-text-center tw-text-xs tw-text-slate-500 tw-font-mono">
							No match telemetry events recorded for this session.
						</td>
					</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
	{/if}
</div>
