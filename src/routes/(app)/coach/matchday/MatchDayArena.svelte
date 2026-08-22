<script lang="ts">
	import type { MatchDayEngine } from './MatchDayEngine.svelte';

	let { engine }: { engine: MatchDayEngine } = $props();
</script>

<div class="tw-grid tw-grid-cols-12 tw-gap-4" style="border-radius: 0px;">
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
</div>
