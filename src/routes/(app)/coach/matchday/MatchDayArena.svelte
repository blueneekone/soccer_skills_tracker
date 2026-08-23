<script lang="ts">
	import type { MatchDayEngine } from './MatchDayEngine.svelte';

	let { engine }: { engine: MatchDayEngine } = $props();
</script>

<div class="tw-flex tw-gap-2 tw-mb-4" style="border-radius: 0px;">
	<button onclick={() => engine.activeTab = 'live'} class="tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-transition-colors {engine.activeTab === 'live' ? 'tw-bg-[#06b6d4] tw-text-black' : 'tw-bg-[#1e293b] tw-text-gray-400 tw-border tw-border-[#334155] hover:tw-text-white'}">[ LIVE MATCH ]</button>
	<button onclick={() => engine.activeTab = 'roster'} class="tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-transition-colors {engine.activeTab === 'roster' ? 'tw-bg-[#06b6d4] tw-text-black' : 'tw-bg-[#1e293b] tw-text-gray-400 tw-border tw-border-[#334155] hover:tw-text-white'}">[ ROSTER & SUBS ]</button>
	<button onclick={() => engine.activeTab = 'review'} class="tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-transition-colors {engine.activeTab === 'review' ? 'tw-bg-[#06b6d4] tw-text-black' : 'tw-bg-[#1e293b] tw-text-gray-400 tw-border tw-border-[#334155] hover:tw-text-white'}">[ POST-MATCH REVIEW ]</button>
</div>

<div class="tw-grid tw-grid-cols-12 tw-gap-4" style="border-radius: 0px;">
	{#if engine.activeTab === 'live'}
	<!-- 12-Column Asymmetric Grid: Game Event Loggers -->
	<div class="tw-col-span-12 md:tw-col-span-8 tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-p-4" style="border-radius: 0px;">
		<div class="tw-font-mono tw-text-xs tw-text-[#06b6d4] tw-uppercase tw-tracking-wider tw-mb-3">
			Live Match Loggers (Sub-14ms Latency)
		</div>

		<div class="tw-flex tw-flex-wrap tw-gap-3 tw-mb-6">
			<button
				type="button"
				onclick={() => engine.logEvent('GOAL', 'GOAL LOGGED')}
				class="tw-bg-emerald-500 tw-text-black tw-font-mono tw-font-bold tw-px-4 tw-py-2 tw-text-sm hover:tw-opacity-90"
				style="border-radius: 0px;"
			>
				+ LOG GOAL
			</button>
			<button
				type="button"
				onclick={() => engine.logEvent('YELLOW_CARD', 'YELLOW CARD LOGGED')}
				class="tw-bg-[#fbbf24] tw-text-black tw-font-mono tw-font-bold tw-px-4 tw-py-2 tw-text-sm hover:tw-opacity-90"
				style="border-radius: 0px;"
			>
				+ YELLOW CARD
			</button>
			<button
				type="button"
				onclick={() => engine.logEvent('RED_CARD', 'RED CARD LOGGED')}
				class="tw-bg-red-600 tw-text-white tw-font-mono tw-font-bold tw-px-4 tw-py-2 tw-text-sm hover:tw-opacity-90"
				style="border-radius: 0px;"
			>
				+ RED CARD
			</button>
			<button
				type="button"
				onclick={() => engine.logEvent('SUB', 'PLAYER SUB LOGGED')}
				class="tw-bg-[#06b6d4] tw-text-black tw-font-mono tw-font-bold tw-px-4 tw-py-2 tw-text-sm hover:tw-opacity-90"
				style="border-radius: 0px;"
			>
				+ SUB
			</button>
			<button
				type="button"
				onclick={() => engine.logMistake()}
				class="tw-bg-purple-600 tw-text-white tw-font-mono tw-font-bold tw-px-4 tw-py-2 tw-text-sm hover:tw-opacity-90"
				style="border-radius: 0px;"
			>
				+ LOG MISTAKE
			</button>
		</div>

		<div class="tw-font-mono tw-text-xs tw-text-gray-400 tw-mb-2">MATCH EVENTS HISTORY</div>
		<div class="tw-space-y-2 tw-max-h-60 tw-overflow-y-auto">
			{#if engine.events.length === 0}
				<div class="tw-text-xs tw-text-gray-500 tw-font-mono">No match events logged yet.</div>
			{:else}
				{#each engine.events as evt (evt.id)}
					<div
						class="match-event-row tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-p-2 tw-flex tw-justify-between tw-items-center"
						style="border-radius: 0px;"
					>
						<span class="tw-font-mono tw-text-xs tw-text-[#06b6d4] tw-font-bold">{evt.label}</span>
						<span class="tw-font-mono tw-text-[11px] tw-text-gray-400">{evt.time}</span>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Sidebar Control Deck: Halftime Planner -->
	<div class="tw-col-span-12 md:tw-col-span-4 tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-p-4" style="border-radius: 0px;">
		<div class="tw-font-mono tw-text-xs tw-text-[#fbbf24] tw-uppercase tw-tracking-wider tw-mb-3">
			Halftime Tactical Control
		</div>

		<button
			type="button"
			onclick={() => engine.syncHalftimeChoice()}
			class="tw-w-full tw-bg-[#0a0a0a] tw-text-[#fbbf24] tw-border tw-border-[#fbbf24] tw-px-4 tw-py-2.5 tw-font-mono tw-text-xs tw-font-bold hover:tw-bg-[#fbbf24] hover:tw-text-black tw-transition-colors"
			style="border-radius: 0px;"
		>
			SYNC HALFTIME CHOICE
		</button>

		{#if engine.showHalftimeOverlay}
			<div
				class="halftime-choice-overlay tw-mt-4 tw-bg-[#0a0a0a] tw-border tw-border-[#fbbf24] tw-p-3"
				style="border-radius: 0px;"
			>
				<div class="tw-font-mono tw-text-xs tw-text-[#fbbf24] tw-font-bold tw-uppercase">
					ACTIVE SELECTION
				</div>
				<p class="tw-text-xs tw-text-gray-300 tw-mt-1">
					Player consensus map synchronized. Formations locked for 2nd half.
				</p>
			</div>
		{/if}
	</div>
	{/if}

	{#if engine.activeTab === 'roster'}
	<div class="tw-col-span-12 tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-p-4" style="border-radius: 0px;">
		<div class="tw-font-mono tw-text-xs tw-text-[#fbbf24] tw-uppercase tw-tracking-wider tw-mb-3">
			Starting Lineup vs Bench
		</div>
		<div class="tw-grid tw-grid-cols-2 tw-gap-6">
			<div>
				<h3 class="tw-font-mono tw-text-sm tw-text-gray-300 tw-mb-2">Starting Lineup</h3>
				<div class="tw-space-y-2 tw-p-4 tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-min-h-[200px]">
					<div class="tw-text-xs tw-text-gray-500 tw-font-mono">Drag players here...</div>
				</div>
			</div>
			<div>
				<h3 class="tw-font-mono tw-text-sm tw-text-gray-300 tw-mb-2">Bench</h3>
				<div class="tw-space-y-2 tw-p-4 tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-min-h-[200px]">
					<div class="tw-text-xs tw-text-gray-500 tw-font-mono">Drag players here...</div>
				</div>
			</div>
		</div>
	</div>
	{/if}

	{#if engine.activeTab === 'review'}
	<div class="tw-col-span-12 tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-p-4" style="border-radius: 0px;">
		<div class="tw-font-mono tw-text-xs tw-text-[#fbbf24] tw-uppercase tw-tracking-wider tw-mb-3">
			Post-Match Data Table
		</div>
		<div class="tw-w-full tw-overflow-x-auto">
			<table class="tw-w-full tw-text-left tw-border-collapse">
				<thead>
					<tr class="tw-border-b tw-border-[#334155]">
						<th class="tw-p-2 tw-font-sans tw-text-xs tw-text-gray-400">Time</th>
						<th class="tw-p-2 tw-font-sans tw-text-xs tw-text-gray-400">Event Type</th>
						<th class="tw-p-2 tw-font-sans tw-text-xs tw-text-gray-400">Label (Click to Edit)</th>
					</tr>
				</thead>
				<tbody>
					{#each engine.events as evt (evt.id)}
					<tr class="tw-border-b tw-border-[#334155]/50 hover:tw-bg-[#0a0a0a]">
						<td class="tw-p-2 tw-font-mono tw-text-[11px] tw-text-gray-300">{evt.time}</td>
						<td class="tw-p-2 tw-font-mono tw-text-xs tw-text-[#06b6d4]">{evt.type}</td>
						<td class="tw-p-2">
							<input type="text" value={evt.label} onchange={(e) => engine.editEvent(evt.id, e.currentTarget.value)} class="tw-bg-transparent tw-border-none tw-text-white tw-font-mono tw-text-xs tw-w-full focus:tw-ring-1 focus:tw-ring-[#06b6d4] tw-px-1" />
						</td>
					</tr>
					{/each}
					{#if engine.events.length === 0}
					<tr>
						<td colspan="3" class="tw-p-4 tw-text-center tw-text-xs tw-text-gray-500 tw-font-mono">No events recorded.</td>
					</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
	{/if}
</div>
