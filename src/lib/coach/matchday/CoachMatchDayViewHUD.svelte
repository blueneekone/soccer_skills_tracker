<script lang="ts">
	import type { CoachMatchDayViewEngine } from './CoachMatchDayViewEngine.svelte.js';

	let { engine }: { engine: CoachMatchDayViewEngine } = $props();
</script>

<div class="tw-bg-[#0b0f19] tw-border-b tw-border-[#334155] tw-px-4 tw-py-2.5 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-z-20">
	<div class="tw-flex tw-items-center tw-gap-2.5 tw-flex-wrap">
		<span class="tw-text-[10px] tw-font-mono tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest">
			GAME:
		</span>
		<span class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#14b8a6]">
			{engine.opponentTeam ? `vs ${engine.opponentTeam}` : 'Current Match'}
		</span>
		<span class="tw-text-[10px] tw-font-mono tw-px-2 tw-py-0.5 tw-border {engine.matchState === 'running' ? 'tw-bg-[#14b8a6]/60 tw-border-[#14b8a6]/60 tw-text-[#14b8a6] tw-animate-pulse' : engine.matchState === 'paused' ? 'tw-bg-amber-950/60 tw-border-[#f59e0b]/60 tw-text-[#fbbf24]' : engine.matchState === 'ended' ? 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-400' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-[#daff0a]'}">
			{engine.matchState === 'running' ? '● LIVE IN PLAY' : engine.matchState === 'paused' ? '⏸ PAUSED' : engine.matchState === 'ended' ? '✓ FINAL' : 'PRE-MATCH'}
		</span>
	</div>

	<div class="tw-flex tw-items-center tw-gap-2.5">
		{#if engine.savedMatches.length > 0}
			<select
				aria-label="Select match record"
				class="tw-bg-[#0f172a] tw-border tw-border-slate-700 tw-text-slate-300 tw-font-mono tw-text-xs tw-px-2.5 tw-py-1.5 tw-outline-none hover:tw-border-[#14b8a6] tw-cursor-pointer"
				value={engine.sessionMatchId}
				onchange={(e) => engine.selectSavedMatch(e.currentTarget.value)}
			>
				<option value={engine.sessionMatchId}>Current Game ({engine.opponentTeam || 'Untitled'})</option>
				{#each engine.savedMatches as sm (sm.id)}
					{#if sm.id !== engine.sessionMatchId}
						<option value={sm.id}>
							{sm.opponentTeam ? `vs ${sm.opponentTeam}` : sm.id} ({sm.homeScore ?? 0}-{sm.awayScore ?? 0})
							{sm.matchState === 'ended' ? '· Final' : '· Live'}
						</option>
					{/if}
				{/each}
			</select>
		{/if}

		<button
			type="button"
			onclick={() => engine.createNewMatch()}
			class="tw-bg-[#14b8a6]/20 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6] hover:tw-text-[#000000] tw-font-mono tw-font-bold tw-text-xs tw-px-3 tw-py-1.5 tw-transition-colors"
		>
			+ NEW MATCH
		</button>
	</div>
</div>

<header class="coach-match-z4-strap" aria-label="Match clock">
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
		<div>
			<p class="coach-match-z4-strap__label">Match clock · {engine.activeTeamLabel} {engine.opponentTeam ? `vs ${engine.opponentTeam.toUpperCase()}` : ''}</p>
			<p class="coach-match-z4-strap__clock" aria-live="polite">{engine.matchClockDisplay}</p>
			<p class="coach-match-z4-strap__period">{engine.matchPeriodLabel}</p>
		</div>

		<div class="tw-flex tw-items-center tw-gap-2.5 tw-flex-wrap">
			{#if engine.matchState === 'not_started'}
				<button
					type="button"
					class="tw-bg-[#daff0a] tw-text-[#000000] tw-font-mono tw-font-black tw-text-xs tw-px-5 tw-py-2.5 tw-tracking-wider tw-uppercase hover:tw-bg-lime-400 tw-transition-all tw-shadow-[0_0_15px_rgba(218,255,10,0.3)]"
					onclick={() => void engine.startMatch()}
				>
					▶ START MATCH
				</button>
			{:else if engine.matchState === 'running'}
				<button class:interactive={true}
					type="button"
					class="tw-bg-[#f59e0b] tw-text-[#000000] tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-py-2.5 tw-tracking-wider tw-uppercase hover:tw-bg-[#fbbf24] tw-transition-colors"
					onclick={() => engine.pauseMatch()}
				>
					⏸ PAUSE MATCH
				</button>
				<button
					type="button"
					class="tw-bg-[#f59e0b] tw-text-[#fafafa] tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-py-2.5 tw-tracking-wider tw-uppercase hover:tw-bg-[#f59e0b] tw-transition-colors"
					onclick={() => void engine.endMatch()}
				>
					🏁 FINAL WHISTLE
				</button>
			{:else if engine.matchState === 'paused'}
				<button
					type="button"
					class="tw-bg-[#14b8a6] tw-text-[#000000] tw-font-mono tw-font-black tw-text-xs tw-px-4 tw-py-2.5 tw-tracking-wider tw-uppercase hover:tw-bg-[#14b8a6] tw-transition-colors"
					onclick={() => engine.resumeMatch()}
				>
					▶ RESUME MATCH
				</button>
				<button
					type="button"
					class="tw-bg-[#f59e0b] tw-text-[#fafafa] tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-py-2.5 tw-tracking-wider tw-uppercase hover:tw-bg-[#f59e0b] tw-transition-colors"
					onclick={() => void engine.endMatch()}
				>
					🏁 FINAL WHISTLE
				</button>
			{:else if engine.matchState === 'ended'}
				<div class="tw-flex tw-items-center tw-gap-2">
					<span class="tw-px-3 tw-py-2 tw-bg-[#f59e0b]/60 tw-border tw-border-red-500/60 tw-text-red-300 tw-font-mono tw-text-xs tw-font-bold tw-uppercase">
						FINAL SCORE: {engine.homeScore} - {engine.awayScore}
					</span>
					<button
						type="button"
						class="tw-bg-[#14b8a6] tw-text-[#000000] tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-py-2 tw-uppercase hover:tw-bg-teal-300 tw-transition-colors"
						onclick={() => engine.createNewMatch()}
					>
						+ NEW MATCH
					</button>
				</div>
			{/if}
		</div>
	</div>
</header>
