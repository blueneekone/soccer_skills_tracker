<script lang="ts">
	import type { MatchDayEngine } from './MatchDayEngine.svelte';

	let { engine }: { engine: MatchDayEngine } = $props();

	function formatTime(ts: number): string {
		return new Date(ts).toLocaleTimeString();
	}
</script>

<div class="tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-p-4 tw-rounded-none" style="border-radius: 0px;">
	<!-- Active Status Bar -->
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-3">
		<div class="tw-flex tw-items-center tw-gap-3">
			<span class="tw-inline-block tw-w-3 tw-h-3 tw-bg-[#fbbf24] tw-animate-pulse" style="border-radius: 0px;"></span>
			{#if engine.isShieldActive}
				<div class="tw-font-mono tw-text-xs tw-text-[#fbbf24] tw-font-bold">
					[ SHIELD_ACTIVE: CAR_RIDE_HOME_LOCKOUT ]
					<span class="tw-block tw-text-[11px] tw-opacity-90">
						CAR_RIDE_HOME_SHIELD_ACTIVE: SENSITIVE PLAYER CARD DATA LOCKED UNTIL {formatTime(engine.lockedUntil)}
					</span>
				</div>
			{:else}
				<div class="tw-font-mono tw-text-xs tw-text-gray-400">
					[ SHIELD_INACTIVE: UNLOCKED ]
				</div>
			{/if}
		</div>

		<div class="tw-flex tw-items-center tw-gap-2">
			<button
				type="button"
				aria-label="Toggle Car Ride Home Shield"
				onclick={() => engine.toggleShield()}
				class="tw-bg-[#0a0a0a] tw-text-[#fbbf24] tw-border tw-border-[#fbbf24] tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-font-bold hover:tw-bg-[#fbbf24] hover:tw-text-black tw-transition-colors"
				style="border-radius: 0px;"
			>
				TOGGLE SHIELD
			</button>
			<button
				type="button"
				aria-label="Toggle Game Whistle"
				onclick={() => engine.toggleWhistle()}
				class="tw-bg-[#0a0a0a] tw-text-[#06b6d4] tw-border tw-border-[#06b6d4] tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-font-bold hover:tw-bg-[#06b6d4] hover:tw-text-black tw-transition-colors"
				style="border-radius: 0px;"
			>
				{engine.isWhistleActive ? 'GAME WHISTLE: ACTIVE' : 'GAME WHISTLE: INACTIVE'}
			</button>
		</div>
	</div>

	<!-- Diagnostic Telemetry Stream -->
	<div class="tw-mb-4 tw-p-2 tw-bg-[#0a0a0a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
		<div class="tw-font-mono tw-text-[10px] tw-text-[#06b6d4] tw-uppercase tw-tracking-widest tw-mb-1">Telemetry Stream</div>
		{#each engine.telemetryLogs.slice(0, 3) as log}
			<div class="tw-font-mono tw-text-xs tw-text-gray-300">{log}</div>
		{/each}
	</div>

	<!-- TARGET Coaching Prompt Engine -->
	<div
		class="target-prompt-container tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-p-4"
		style="font-family: Switzer, sans-serif; border-radius: 0px;"
	>
		<div class="tw-font-mono tw-text-xs tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-tracking-wider tw-mb-2">
			TARGET Coaching Cues
		</div>
		<ul class="tw-space-y-1.5 tw-text-sm tw-text-gray-200">
			{#each engine.targetPrompts as prompt}
				<li class="tw-flex tw-items-start tw-gap-2">
					<span class="tw-text-[#06b6d4] tw-font-bold">›</span>
					<span>{prompt}</span>
				</li>
			{/each}
		</ul>
	</div>
</div>
