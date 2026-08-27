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

<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 sm:tw-p-5 tw-shadow-2xl" style="border-radius: 0px;">
	{#if engine.lightningDistance <= 10}
		<div
			class="tw-w-full tw-p-3 tw-mb-4 tw-font-mono tw-text-xs sm:tw-text-sm tw-font-bold tw-uppercase tw-text-center tw-tracking-wider tw-border {engine.lightningDistance < 6 ? 'tw-bg-rose-950/90 tw-border-rose-500 tw-text-rose-200 tw-animate-pulse' : 'tw-bg-amber-950/90 tw-border-amber-500 tw-text-amber-200'}"
			style="border-radius: 0px;"
			data-testid="weather-banner"
		>
			{#if engine.lightningDistance < 6}
				⚡ [ RED LOCKDOWN ] LIGHTNING DETECTED WITHIN {engine.lightningDistance} MILES. FIELD LOCKED. EVACUATE PLAYERS IMMEDIATELY.
			{:else}
				⚠️ [ AMBER ALERT ] LIGHTNING DETECTED WITHIN {engine.lightningDistance} MILES. PREPARE TO SEEK SHELTER.
			{/if}
		</div>
	{/if}

	<!-- High-Contrast Tactical Scoreboard Strap -->
	<div class="tw-mb-4 tw-p-4 tw-bg-[#000000] tw-border tw-border-[#334155] tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
		<!-- Left: Our Team -->
		<div class="tw-flex tw-items-center tw-gap-3">
			<div class="tw-h-3 tw-w-3 tw-bg-[#14b8a6]"></div>
			<div>
				<div class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-uppercase tw-tracking-widest">HOME SQUAD</div>
				<div class="tw-font-mono tw-text-sm sm:tw-text-base tw-font-black tw-text-white tw-uppercase tw-truncate tw-max-w-[200px]">
					{engine.teamScope.teamLabel || 'OUR SQUAD'}
				</div>
			</div>
		</div>

		<!-- Center Scoreboard -->
		<div class="tw-flex tw-items-center tw-gap-4 sm:tw-gap-6 tw-bg-[#0f172a] tw-px-5 tw-py-2 tw-border tw-border-[#334155]">
			<div class="tw-flex tw-items-center tw-gap-2">
				<button
					type="button"
					onclick={() => { if (engine.homeScore > 0) engine.homeScore -= 1; engine.finalScore = `${engine.homeScore} - ${engine.awayScore}`; }}
					class="tw-w-6 tw-h-6 tw-bg-slate-900 hover:tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-xs tw-flex tw-items-center tw-justify-center tw-cursor-pointer"
					title="Decrease Home Score"
				>
					-
				</button>
				<span class="tw-font-mono tw-text-3xl sm:tw-text-4xl tw-font-black tw-text-[#daff0a] tw-tabular-nums">
					{engine.homeScore}
				</span>
				<button
					type="button"
					onclick={() => { engine.homeScore += 1; engine.finalScore = `${engine.homeScore} - ${engine.awayScore}`; }}
					class="tw-w-6 tw-h-6 tw-bg-slate-900 hover:tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-xs tw-flex tw-items-center tw-justify-center tw-cursor-pointer"
					title="Increase Home Score"
				>
					+
				</button>
			</div>

			<span class="tw-font-mono tw-text-xs tw-text-slate-500 tw-font-bold">VS</span>

			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-font-mono tw-text-3xl sm:tw-text-4xl tw-font-black tw-text-[#fafafa] tw-tabular-nums">
					{engine.awayScore}
				</span>
				<div class="tw-flex tw-flex-col tw-gap-1">
					<button
						type="button"
						onclick={() => { engine.awayScore += 1; engine.finalScore = `${engine.homeScore} - ${engine.awayScore}`; }}
						class="tw-w-5 tw-h-3.5 tw-bg-slate-900 hover:tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-[9px] tw-flex tw-items-center tw-justify-center tw-cursor-pointer"
						title="Opponent Goal (+1)"
					>
						▲
					</button>
					<button
						type="button"
						onclick={() => { if (engine.awayScore > 0) engine.awayScore -= 1; engine.finalScore = `${engine.homeScore} - ${engine.awayScore}`; }}
						class="tw-w-5 tw-h-3.5 tw-bg-slate-900 hover:tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-[9px] tw-flex tw-items-center tw-justify-center tw-cursor-pointer"
						title="Opponent Goal (-1)"
					>
						▼
					</button>
				</div>
			</div>
		</div>

		<!-- Right: Opponent Input / Name -->
		<div class="tw-flex tw-items-center tw-gap-3">
			<div class="tw-text-right">
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-widest">OPPONENT</div>
				<input
					type="text"
					bind:value={engine.opponentName}
					placeholder="OPPONENT NAME"
					class="tw-bg-[#0f172a] tw-border tw-border-[#334155] focus:tw-border-[#fbbf24] tw-text-white tw-font-mono tw-text-xs tw-px-2 tw-py-1 tw-w-36 tw-text-right tw-uppercase tw-outline-none"
				/>
			</div>
			<div class="tw-h-3 tw-w-3 tw-bg-[#fbbf24]"></div>
		</div>
	</div>

	<!-- Game Clock & Match Controls Strap (Z2 Well) -->
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-mb-4 tw-p-3.5 tw-bg-[#000000] tw-border tw-border-[#334155]">
		<div class="tw-flex tw-items-center tw-gap-4">
			<div>
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-widest">GAME CLOCK</div>
				<div class="tw-font-mono tw-text-2xl sm:tw-text-3xl tw-font-black tw-text-[#fbbf24] tw-tabular-nums tw-tracking-tight">{matchClockDisplay}</div>
			</div>
			<div class="tw-flex tw-items-center tw-gap-1.5 tw-px-2.5 tw-py-1 tw-border tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-wider {engine.matchStatus === 'running' ? 'tw-bg-emerald-950/60 tw-border-emerald-500/80 tw-text-emerald-400 tw-animate-pulse' : engine.matchStatus === 'paused' ? 'tw-bg-amber-950/60 tw-border-amber-500/80 tw-text-amber-400' : engine.matchStatus === 'ended' ? 'tw-bg-slate-900 tw-border-slate-700 tw-text-slate-400' : 'tw-bg-slate-900/80 tw-border-slate-700 tw-text-[#fbbf24]'}">
				<span class="tw-w-1.5 tw-h-1.5 {engine.matchStatus === 'running' ? 'tw-bg-emerald-400' : engine.matchStatus === 'paused' ? 'tw-bg-amber-400' : engine.matchStatus === 'ended' ? 'tw-bg-slate-400' : 'tw-bg-[#fbbf24]'}"></span>
				{engine.matchStatus === 'running' ? 'LIVE' : engine.matchStatus === 'paused' ? 'PAUSED' : engine.matchStatus === 'ended' ? 'FINAL' : 'PRE-MATCH'}
			</div>
		</div>

		<!-- Match Action Controls (Symmetrical, Uniform Heights) -->
		<div class="tw-flex tw-items-center tw-gap-2">
			{#if engine.matchStatus === 'not_started'}
				<button
					type="button"
					onclick={() => engine.startMatch()}
					class="tw-inline-flex tw-items-center tw-justify-center tw-bg-[#fbbf24] tw-text-black tw-font-mono tw-font-black tw-text-xs tw-px-5 tw-h-10 tw-uppercase tw-tracking-wider hover:tw-bg-lime-400 tw-transition-all active:tw-scale-95 tw-shadow-md"
					style="border-radius: 0px;"
				>
					▶ START MATCH
				</button>
			{:else if engine.matchStatus === 'running'}
				<button
					type="button"
					onclick={() => engine.pauseMatch()}
					class="tw-inline-flex tw-items-center tw-justify-center tw-bg-amber-500/20 tw-text-amber-300 tw-border tw-border-amber-500 tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-h-10 tw-uppercase hover:tw-bg-amber-500 hover:tw-text-black tw-transition-all active:tw-scale-95"
					style="border-radius: 0px;"
				>
					⏸ PAUSE
				</button>
				<button
					type="button"
					onclick={() => engine.endMatch()}
					class="tw-inline-flex tw-items-center tw-justify-center tw-bg-rose-950/50 tw-text-rose-300 tw-border tw-border-rose-500 tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-h-10 tw-uppercase hover:tw-bg-rose-600 hover:tw-text-white tw-transition-all active:tw-scale-95"
					style="border-radius: 0px;"
				>
					🏁 FINAL WHISTLE
				</button>
			{:else if engine.matchStatus === 'paused'}
				<button
					type="button"
					onclick={() => engine.resumeMatch()}
					class="tw-inline-flex tw-items-center tw-justify-center tw-bg-emerald-500/20 tw-text-emerald-300 tw-border tw-border-emerald-500 tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-h-10 tw-uppercase hover:tw-bg-emerald-500 hover:tw-text-black tw-transition-all active:tw-scale-95"
					style="border-radius: 0px;"
				>
					▶ RESUME
				</button>
				<button
					type="button"
					onclick={() => engine.endMatch()}
					class="tw-inline-flex tw-items-center tw-justify-center tw-bg-rose-950/50 tw-text-rose-300 tw-border tw-border-rose-500 tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-h-10 tw-uppercase hover:tw-bg-rose-600 hover:tw-text-white tw-transition-all active:tw-scale-95"
					style="border-radius: 0px;"
				>
					🏁 FINAL WHISTLE
				</button>
			{:else if engine.matchStatus === 'ended'}
				<button
					type="button"
					onclick={() => engine.resetClock()}
					class="tw-inline-flex tw-items-center tw-justify-center tw-bg-[#14b8a6]/20 tw-text-[#14b8a6] tw-border tw-border-[#14b8a6] tw-font-mono tw-font-bold tw-text-xs tw-px-4 tw-h-10 tw-uppercase hover:tw-bg-[#14b8a6] hover:tw-text-black tw-transition-all active:tw-scale-95"
					style="border-radius: 0px;"
				>
					+ NEW MATCH
				</button>
			{/if}
		</div>
	</div>

	<!-- Active Status Bar (Uniform Sizing & Proportions) -->
	<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-3">
		<div class="tw-flex tw-items-center tw-gap-3">
			<span class="tw-inline-block tw-w-2.5 tw-h-2.5 tw-bg-[#fbbf24] tw-animate-pulse" style="border-radius: 0px;"></span>
			{#if engine.isShieldActive}
				<div class="tw-font-mono tw-text-xs tw-text-[#fbbf24] tw-font-bold">
					[ SHIELD_ACTIVE: CAR_RIDE_HOME_LOCKOUT ]
					<span class="tw-block tw-text-[11px] tw-text-slate-300 tw-font-normal">
						CAR_RIDE_HOME_SHIELD_ACTIVE: SENSITIVE PLAYER CARD DATA LOCKED UNTIL {formatTime(engine.lockedUntil)}
					</span>
				</div>
			{:else}
				<div class="tw-font-mono tw-text-xs tw-text-slate-400">
					[ SHIELD_INACTIVE: UNLOCKED ]
				</div>
			{/if}
		</div>

		<!-- Status Buttons Deck (Matching Heights & Aesthetic) -->
		<div class="tw-flex tw-items-center tw-gap-2">
			<button
				type="button"
				aria-label="Toggle Car Ride Home Shield"
				onclick={() => engine.toggleShield()}
				class="tw-h-8 tw-bg-[#000000] tw-text-[#fbbf24] tw-border tw-border-[#fbbf24]/70 tw-px-3 tw-font-mono tw-text-xs tw-font-bold hover:tw-bg-[#fbbf24] hover:tw-text-black tw-transition-colors"
				style="border-radius: 0px;"
			>
				TOGGLE SHIELD
			</button>
			<button
				type="button"
				aria-label="Toggle Game Whistle"
				onclick={() => engine.toggleWhistle()}
				class="tw-h-8 tw-bg-[#000000] tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]/70 tw-px-3 tw-font-mono tw-text-xs tw-font-bold hover:tw-bg-[#14b8a6] hover:tw-text-black tw-transition-colors"
				style="border-radius: 0px;"
			>
				{engine.isWhistleActive ? 'GAME WHISTLE: ACTIVE' : 'GAME WHISTLE: INACTIVE'}
			</button>

			<button
				type="button"
				onclick={() => engine.isHelpDrawerOpen = true}
				class="tw-h-8 tw-bg-[#000000] tw-text-slate-400 tw-border tw-border-[#334155] tw-px-3 tw-font-mono tw-text-xs tw-font-bold hover:tw-text-white hover:tw-border-slate-400 tw-transition-colors"
				style="border-radius: 0px;"
			>
				⚙ SETTINGS
			</button>
		</div>
	</div>

	<!-- TARGET Coaching Prompt Engine -->
	{#key engine.targetPrompts}
		<div
			class="target-prompt-container tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-3.5 tw-transition-all tw-duration-300"
			style="font-family: Switzer, sans-serif; border-radius: 0px;"
		>
			<div class="tw-font-mono tw-text-[11px] tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-tracking-widest tw-mb-2">
				🎯 TARGET Coaching Cues
			</div>
			<ul class="tw-space-y-1.5 tw-text-xs sm:tw-text-sm tw-text-slate-200">
				{#each engine.targetPrompts as prompt}
					<li class="tw-flex tw-items-start tw-gap-2">
						<span class="tw-text-[#14b8a6] tw-font-bold">›</span>
						<span class="{prompt.startsWith('RESET') || prompt.startsWith('PARK IT') ? 'tw-text-[#fbbf24] tw-font-bold' : ''}">{prompt}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/key}
</div>

<!-- Slide-Out Help Drawer (Z4) -->
{#if engine.isHelpDrawerOpen}
	<div class="tw-fixed tw-inset-y-0 tw-right-0 tw-w-80 tw-bg-[#000000] tw-border-l tw-border-[#334155] tw-z-50 tw-p-6 tw-shadow-2xl tw-transform tw-transition-transform">
		<div class="tw-flex tw-justify-between tw-items-center tw-mb-6 tw-border-b tw-border-[#334155] tw-pb-3">
			<h2 class="tw-font-mono tw-text-sm tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-tracking-wider">Match Day Settings</h2>
			<button onclick={() => engine.isHelpDrawerOpen = false} class="tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-xs">✕ CLOSE</button>
		</div>

		<div class="tw-space-y-5">
			<div class="tw-flex tw-flex-col tw-gap-3.5">
				<div>
					<label class="tw-block tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-mb-1">Opposing Team Name</label>
					<input type="text" bind:value={engine.opponentName} class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" placeholder="Enter opponent..." style="border-radius: 0px;" />
				</div>
				<div>
					<label class="tw-block tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-mb-1">Final Score</label>
					<input type="text" bind:value={engine.finalScore} class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-white tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" placeholder="e.g. 2-1" style="border-radius: 0px;" />
				</div>
				<div>
					<label class="tw-block tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-mb-1">Match Start Time</label>
					<div class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-text-slate-300 tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-h-8 tw-flex tw-items-center" style="border-radius: 0px;">
						{engine.matchStartTime ? new Date(engine.matchStartTime).toLocaleString() : 'Not started'}
					</div>
				</div>
			</div>

			<div class="tw-p-3 tw-bg-[#0f172a] tw-border tw-border-[#334155]" style="border-radius: 0px;">
				<div class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-uppercase tw-tracking-widest tw-mb-2">Telemetry Stream</div>
				<div class="tw-space-y-1 tw-max-h-28 tw-overflow-y-auto">
					{#each engine.telemetryLogs.slice(0, 4) as log}
						<div class="tw-font-mono tw-text-[10px] tw-text-slate-300 tw-truncate">{log}</div>
					{/each}
				</div>

				<div class="tw-mt-3 tw-flex tw-gap-1.5">
					<button class="tw-text-[10px] tw-font-mono tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-slate-300 tw-px-2 tw-py-1 hover:tw-border-amber-400" onclick={() => engine.simulateLightning(8.5)} style="border-radius: 0px;">Sim 8.5m</button>
					<button class="tw-text-[10px] tw-font-mono tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-slate-300 tw-px-2 tw-py-1 hover:tw-border-rose-400" onclick={() => engine.simulateLightning(5.2)} style="border-radius: 0px;">Sim 5.2m</button>
					<button class="tw-text-[10px] tw-font-mono tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-slate-300 tw-px-2 tw-py-1 hover:tw-border-emerald-400" onclick={() => engine.simulateLightning(20)} style="border-radius: 0px;">Clear</button>
				</div>
			</div>

			<div class="tw-text-xs tw-text-slate-300 tw-space-y-3">
				<div>
					<h3 class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-font-bold tw-uppercase tw-mb-1">Game Whistle</h3>
					<p class="tw-text-[11px] tw-text-slate-400">Controls the active state of match recording. Whistle must be active to log live events.</p>
				</div>
				<div>
					<h3 class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-font-bold tw-uppercase tw-mb-1">Car Ride Home Shield</h3>
					<p class="tw-text-[11px] tw-text-slate-400">Activates the 15-minute post-match parent lockout protocol to eliminate car ride anxiety.</p>
				</div>
			</div>
		</div>
	</div>
{/if}
