<script>
	const INK_PALETTE = /** @type {const} */ (['#00f0ff', '#ff00ff', '#ffff00', '#ffffff']);

	const hudBtn =
		'tw-rounded-lg tw-border tw-border-white/15 tw-bg-black/40 tw-px-3 tw-py-2 tw-font-mono tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-white/75 tw-transition-all hover:tw-border-[#00f0ff]/45 hover:tw-text-[#00f0ff] sm:tw-px-4';

	const hudBtnActive =
		'tw-border-[#00f0ff]/70 tw-bg-[#00f0ff]/20 tw-text-[#00f0ff] tw-shadow-[inset_0_0_10px_rgba(0,240,255,0.5)]';

	let {
		warRoomTool = $bindable(),
		simPlaying = $bindable(),
		simScrub = $bindable(),
		showLabels = $bindable(),
		activeRouteColor = $bindable(),
		routeDrawKind = $bindable(),
		recallBench,
		clearRoutesOnly,
	} = $props();
</script>

<div
	class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-50 tw-flex tw-flex-col tw-justify-end tw-p-3 sm:tw-p-4"
	aria-label="Pitch edge HUD"
>
	<div
		class="tw-flex tw-w-full tw-flex-wrap tw-items-end tw-justify-center tw-gap-3 md:tw-justify-between md:tw-gap-4"
	>
		<!-- Zone 1: Systems -->
		<div
			class="tw-pointer-events-auto tw-order-2 tw-flex tw-max-w-full tw-flex-col tw-gap-2 tw-rounded-xl tw-border tw-border-[#00f0ff]/30 tw-bg-black/60 tw-p-3 tw-backdrop-blur-md tw-shadow-[0_10px_40px_rgba(0,0,0,0.5)] md:tw-order-1 md:tw-max-w-[min(100%,22rem)]"
		>
			<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
				<button type="button" class={hudBtn} onclick={recallBench}>Recall</button>
				<button
					type="button"
					class="{hudBtn} {showLabels ? hudBtnActive : ''}"
					onclick={() => (showLabels = !showLabels)}
					aria-pressed={showLabels}
					aria-label="Toggle pitch zone labels"
				>
					Labels
				</button>
			</div>
			<div
				class="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-border-t tw-border-white/10 tw-pt-2"
				aria-label="Simulator playback"
			>
				<button
					type="button"
					class="{hudBtn} {simPlaying ? hudBtnActive : ''}"
					onclick={() => (simPlaying = !simPlaying)}
					aria-pressed={simPlaying}
					aria-label={simPlaying ? 'Pause simulation' : 'Play simulation'}
				>
					{simPlaying ? 'Pause' : 'Play'}
				</button>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					bind:value={simScrub}
					class="tg-hud-scrub tw-h-1 tw-min-w-[6rem] tw-flex-1 tw-cursor-pointer tw-accent-[#00f0ff] sm:tw-w-[min(8rem,28vw)]"
					aria-valuetext={`Timeline ${Math.round(simScrub * 100)} percent`}
					oninput={() => (simPlaying = false)}
				/>
			</div>
		</div>

		<!-- Zone 3: Reactor core — ink palette -->
		<div
			class="tw-pointer-events-auto tw-order-1 tw-flex tw-w-full tw-max-w-[min(100%,28rem)] tw-flex-row tw-flex-wrap tw-items-center tw-justify-center tw-gap-2 tw-rounded-full tw-border tw-border-[#00f0ff]/35 tw-bg-black/55 tw-px-4 tw-py-2 tw-backdrop-blur-md tw-shadow-[0_0_32px_rgba(0,240,255,0.38)] md:tw-order-2 md:tw-w-auto md:tw-max-w-none"
		>
			<span class="tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.22em] tw-text-[#00f0ff]/90">Ink</span>
			{#each INK_PALETTE as color (color)}
				<button
					type="button"
					style="background-color: {color}; box-shadow: {activeRouteColor === color ?
						`0 0 14px ${color}`
					:	'none'};"
					class="tw-h-7 tw-w-10 tw-shrink-0 tw-skew-x-[-15deg] tw-rounded-md tw-border tw-transition-all {activeRouteColor === color ?
						'tw-scale-105 tw-border-white'
					:	'tw-border-white/25 hover:tw-border-white/50 hover:tw-opacity-100 tw-opacity-80'}"
					onclick={() => (activeRouteColor = color)}
					aria-label="Select route color"
				></button>
			{/each}
		</div>

		<!-- Zone 2: Weapons -->
		<div
			class="tw-pointer-events-auto tw-order-3 tw-flex tw-max-w-full tw-flex-col tw-gap-2 tw-rounded-xl tw-border tw-border-[#00f0ff]/30 tw-bg-black/60 tw-p-3 tw-backdrop-blur-md tw-shadow-[0_10px_40px_rgba(0,0,0,0.5)] md:tw-max-w-[min(100%,24rem)] md:tw-items-end"
		>
			<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2">
				<button
					type="button"
					class="{hudBtn} {warRoomTool === 'DRAG' ? hudBtnActive : ''}"
					onclick={() => (warRoomTool = 'DRAG')}
					aria-pressed={warRoomTool === 'DRAG'}
				>
					Drag
				</button>
				<button
					type="button"
					class="{hudBtn} {warRoomTool === 'ROUTE' ? hudBtnActive : ''}"
					onclick={() => (warRoomTool = 'ROUTE')}
					aria-pressed={warRoomTool === 'ROUTE'}
				>
					Route
				</button>
				{#if warRoomTool === 'ROUTE'}
					<button
						type="button"
						class="{hudBtn} {routeDrawKind === 'curve' ? hudBtnActive : ''}"
						onclick={() => (routeDrawKind = 'curve')}
						aria-pressed={routeDrawKind === 'curve'}
						aria-label="Curved route"
					>
						Curve
					</button>
					<button
						type="button"
						class="{hudBtn} {routeDrawKind === 'cut' ? hudBtnActive : ''}"
						onclick={() => (routeDrawKind = 'cut')}
						aria-pressed={routeDrawKind === 'cut'}
						aria-label="Cut route with sharp corners"
					>
						Cut
					</button>
				{/if}
				<button
					type="button"
					class="{hudBtn} tw-border-[#ff0033]/35 tw-text-[#ff3366] hover:tw-border-[#ff0033]/70 hover:tw-text-[#ff0033]"
					onclick={clearRoutesOnly}
				>
					Clear routes
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	:global(.tg-hud-scrub) {
		-webkit-appearance: none;
		appearance: none;
		height: 0.25rem;
		border-radius: 0;
		background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(0, 240, 255, 0.42));
		border: 1px solid rgba(0, 240, 255, 0.25);
	}
	:global(.tg-hud-scrub::-webkit-slider-thumb) {
		-webkit-appearance: none;
		appearance: none;
		width: 0.55rem;
		height: 0.75rem;
		border-radius: 0;
		background: #00f0ff;
		box-shadow: 0 0 10px rgba(0, 240, 255, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.35);
	}
	:global(.tg-hud-scrub::-moz-range-thumb) {
		width: 0.55rem;
		height: 0.75rem;
		border-radius: 0;
		background: #00f0ff;
		box-shadow: 0 0 10px rgba(0, 240, 255, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.35);
	}
</style>
