<script lang="ts">
	import { browser } from '$app/environment';
	import type { MatchDayEngine } from './MatchDayEngine.svelte';

	let { engine }: { engine: MatchDayEngine } = $props();

	function formatTime(ts: number): string {
		return new Date(ts).toLocaleTimeString();
	}

	const matchClockDisplay = $derived.by(() => {
		const t = Math.max(0, engine.elapsedSeconds);
		const m = Math.floor(t / 60);
		const s = t % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	});

	$effect(() => {
		if (!browser) return;
		let id: number | null = null;
		if (engine.matchStatus === 'running') {
			id = window.setInterval(() => {
				engine.elapsedSeconds += 1;
			}, 1000);
		}
		return () => {
			if (id) window.clearInterval(id);
		};
	});
</script>

<div class="tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-p-4 tw-rounded-none" style="border-radius: 0px;">
	<!-- Game Clock & Match Controls Strap -->
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-mb-4 tw-p-3 tw-bg-[#0a0a0a] tw-border tw-border-[#334155]">
		<div class="tw-flex tw-items-center tw-gap-4">
			<div>
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-widest">GAME CLOCK</div>
				<div class="tw-font-mono tw-text-2xl tw-font-black tw-text-[#daff0a] tw-tabular-nums">{matchClockDisplay}</div>
			</div>
			<span class="tw-text-[10px] tw-font-mono tw-px-2 tw-py-0.5 tw-border {engine.matchStatus === 'running' ? 'tw-bg-emerald-950/60 tw-border-emerald-500/60 tw-text-emerald-400 tw-animate-pulse' : engine.matchStatus === 'paused' ? 'tw-bg-amber-950/60 tw-border-amber-500/60 tw-text-amber-400' : engine.matchStatus === 'ended' ? 'tw-bg-slate-900 tw-border-slate-700 tw-text-slate-400' : 'tw-bg-slate-900 tw-border-slate-700 tw-text-[#daff0a]'}">
				{engine.matchStatus === 'running' ? '● LIVE' : engine.matchStatus === 'paused' ? '⏸ PAUSED' : engine.matchStatus === 'ended' ? '✓ FINAL' : 'PRE-MATCH'}
			</span>
		</div>

		<div class="tw-flex tw-items-center tw-gap-2">
			{#if engine.matchStatus === 'not_started'}
				<button
					type="button"
					onclick={() => engine.startMatch()}
					class="tw-bg-[#daff0a] tw-text-black tw-font-mono tw-font-black tw-text-xs tw-px-4 tw-py-2 tw-uppercase hover:tw-bg-lime-400 tw-transition-all"
				>
					▶ START MATCH
				</button>
			{:else if engine.matchStatus === 'running'}
				<button
					type="button"
					onclick={() => engine.pauseMatch()}
					class="tw-bg-amber-500 tw-text-black tw-font-mono tw-font-bold tw-text-xs tw-px-3 tw-py-2 tw-uppercase hover:tw-bg-amber-400 tw-transition-colors"
				>
					⏸ PAUSE
				</button>
				<button
					type="button"
					onclick={() => engine.endMatch()}
					class="tw-bg-red-600 tw-text-white tw-font-mono tw-font-bold tw-text-xs tw-px-3 tw-py-2 tw-uppercase hover:tw-bg-red-500 tw-transition-colors"
				>
					🏁 FINAL WHISTLE
				</button>
			{:else if engine.matchStatus === 'paused'}
				<button
					type="button"
					onclick={() => engine.resumeMatch()}
					class="tw-bg-emerald-500 tw-text-black tw-font-mono tw-font-bold tw-text-xs tw-px-3 tw-py-2 tw-uppercase hover:tw-bg-emerald-400 tw-transition-colors"
				>
					▶ RESUME
				</button>
				<button
					type="button"
					onclick={() => engine.endMatch()}
					class="tw-bg-red-600 tw-text-white tw-font-mono tw-font-bold tw-text-xs tw-px-3 tw-py-2 tw-uppercase hover:tw-bg-red-500 tw-transition-colors"
				>
					🏁 FINAL WHISTLE
				</button>
			{:else if engine.matchStatus === 'ended'}
				<button
					type="button"
					onclick={() => engine.resetClock()}
					class="tw-bg-[#14b8a6] tw-text-black tw-font-mono tw-font-bold tw-text-xs tw-px-3 tw-py-2 tw-uppercase hover:tw-bg-teal-300 tw-transition-colors"
				>
					+ NEW MATCH
				</button>
			{/if}
		</div>
	</div>


	<div class="tw-flex tw-gap-4 tw-mb-4 tw-p-3 tw-bg-[#0a0a0a] tw-border tw-border-[#334155]">
		<div class="tw-flex-1">
			<label class="tw-block tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-mb-1">Opposing Team Name</label>
			<input type="text" bind:value={engine.opponentName} class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" placeholder="Enter opponent..." />
		</div>
		<div class="tw-w-32">
			<label class="tw-block tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-mb-1">Final Score</label>
			<input type="text" bind:value={engine.finalScore} class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" placeholder="e.g. 2-1" />
		</div>
		<div class="tw-flex-1">
			<label class="tw-block tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-mb-1">Match Start Time</label>
			<div class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-gray-300 tw-px-3 tw-py-2 tw-font-mono tw-text-sm tw-h-9 tw-flex tw-items-center">
				{engine.matchStartTime ? new Date(engine.matchStartTime).toLocaleString() : 'Not started'}
			</div>
		</div>
	</div>

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

			<button
				type="button"
				onclick={() => engine.isHelpDrawerOpen = true}
				class="tw-bg-[#0a0a0a] tw-text-gray-400 tw-border tw-border-[#334155] tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-font-bold hover:tw-text-white tw-transition-colors"
				style="border-radius: 0px;"
			>
				[ ? HELP ]
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


	<!-- Slide-Out Help Drawer (Z4) -->
	{#if engine.isHelpDrawerOpen}
		<div class="tw-fixed tw-inset-y-0 tw-right-0 tw-w-80 tw-bg-[#0a0a0a] tw-border-l tw-border-[#334155] tw-z-50 tw-p-6 tw-transform tw-transition-transform">
			<div class="tw-flex tw-justify-between tw-items-center tw-mb-6">
				<h2 class="tw-font-mono tw-text-lg tw-text-[#fbbf24] tw-font-bold">Match Day Help</h2>
				<button onclick={() => engine.isHelpDrawerOpen = false} class="tw-text-gray-400 hover:tw-text-white tw-font-mono">✕ CLOSE</button>
			</div>

			<div class="tw-space-y-6">
				<div>
					<h3 class="tw-font-mono tw-text-sm tw-text-[#06b6d4] tw-mb-2">Game Whistle</h3>
					<p class="tw-text-sm tw-text-gray-300">Controls the active state of the match recording. Must be active to log events.</p>
				</div>

				<div>
					<h3 class="tw-font-mono tw-text-sm tw-text-[#06b6d4] tw-mb-2">Toggle Shield</h3>
					<p class="tw-text-sm tw-text-gray-300">Activates the "Car Ride Home" shield. This initiates a 15-minute post-game data lockout for parents and players to prevent immediate analysis in the car.</p>
				</div>
			</div>
		</div>
	{/if}
