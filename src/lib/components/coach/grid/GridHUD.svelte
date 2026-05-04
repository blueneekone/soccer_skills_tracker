<script>
	import { fade } from 'svelte/transition';

	const INK_PALETTE = /** @type {const} */ (['#00f0ff', '#ff00ff', '#ffff00', '#ffffff']);

	const deckBtn =
		'tw-rounded-lg tw-border tw-border-white/15 tw-bg-black/35 tw-px-3 tw-py-2 tw-font-mono tw-text-[10px] tw-font-bold tw-tracking-[0.18em] tw-text-white/70 tw-backdrop-blur-sm tw-transition-colors hover:tw-border-[#00f0ff]/45 hover:tw-text-[#00f0ff] hover:tw-shadow-[0_0_16px_rgba(0,240,255,0.12)]';

	const deckBtnActive =
		'tw-border-[#00f0ff]/55 tw-bg-[#00f0ff]/12 tw-text-[#00f0ff] tw-shadow-[inset_0_0_14px_rgba(0,240,255,0.18),0_0_12px_rgba(0,240,255,0.08)]';

	let {
		warRoomTool = $bindable(),
		isHolotableMode = $bindable(false),
		simulator,
		showLabels = $bindable(),
		activeRouteColor = $bindable(),
		routeDrawKind = $bindable(),
		/** @type {string | null} */
		focusedPlayerId = null,
		/** @type {{ id: string; name?: string; number?: string; position?: string }[]} */
		allTokens = [],
		recallBench,
		clearRoutesOnly,
	} = $props();

	const scrubNorm = $derived(
		simulator.maxDuration > 0 ? simulator.currentTime / simulator.maxDuration : 0,
	);

	function onScrubInput(/** @type {Event & { currentTarget: HTMLInputElement }} */ e) {
		const v = Number(e.currentTarget.value);
		simulator.scrub(v * simulator.maxDuration);
	}
</script>

<div
	class="tw-grid tw-h-full tw-w-full tw-grid-cols-3 tw-items-center tw-px-6 tw-font-mono tw-text-xs tw-uppercase tw-tracking-[0.2em] md:tw-px-12"
	aria-label="War room command console"
>
	<div class="tw-flex tw-min-w-0 tw-flex-wrap tw-items-center tw-justify-start tw-gap-4">
		<button
			type="button"
			class="{deckBtn} {warRoomTool === 'DRAG' ? deckBtnActive : ''}"
			onclick={() => (warRoomTool = 'DRAG')}
			aria-pressed={warRoomTool === 'DRAG'}
		>
			[ DRAG ]
		</button>
		<button
			type="button"
			class="{deckBtn} {warRoomTool === 'ROUTE' ? deckBtnActive : ''}"
			onclick={() => (warRoomTool = 'ROUTE')}
			aria-pressed={warRoomTool === 'ROUTE'}
		>
			[ ROUTE ]
		</button>
		{#if warRoomTool === 'ROUTE'}
			<button
				type="button"
				class="{deckBtn} {routeDrawKind === 'curve' ? deckBtnActive : ''}"
				onclick={() => (routeDrawKind = 'curve')}
				aria-pressed={routeDrawKind === 'curve'}
				aria-label="Curved route"
			>
				[ CURVE ]
			</button>
			<button
				type="button"
				class="{deckBtn} {routeDrawKind === 'cut' ? deckBtnActive : ''}"
				onclick={() => (routeDrawKind = 'cut')}
				aria-pressed={routeDrawKind === 'cut'}
				aria-label="Cut route with sharp corners"
			>
				[ CUT ]
			</button>
		{/if}
		<button
			type="button"
			class="{deckBtn} {showLabels ? deckBtnActive : ''}"
			onclick={() => (showLabels = !showLabels)}
			aria-pressed={showLabels}
			aria-label="Toggle pitch zone labels"
		>
			[ LABELS ]
		</button>
	</div>

	<div
		class="tw-flex tw-h-full tw-min-w-0 tw-w-full tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-border-x tw-border-[#00f0ff]/20 tw-bg-gradient-to-t tw-from-[#00f0ff]/5 tw-to-transparent tw-px-8"
		aria-label="Simulator playback"
	>
		<div class="tw-flex tw-w-full tw-flex-wrap tw-items-center tw-justify-center tw-gap-4 md:tw-gap-6">
			<button
				type="button"
				class="{deckBtn} {simulator.isPlaying ? deckBtnActive : ''}"
				onclick={() => simulator.togglePlay()}
				aria-pressed={simulator.isPlaying}
				aria-label={simulator.isPlaying ? 'Pause simulation' : 'Play simulation'}
			>
				{simulator.isPlaying ? '[ || ]' : '[ ▶ ]'}
			</button>
			<button
				type="button"
				class="{deckBtn}"
				onclick={() => simulator.reset()}
				aria-label="Reset timeline to start"
			>
				[ |{'<'} RESET ]
			</button>
			<div class="tw-flex tw-items-center tw-gap-2 tw-border-l tw-border-[#00f0ff]/25 tw-pl-4" aria-label="Ink palette">
				{#each INK_PALETTE as color (color)}
					<button
						type="button"
						style="background-color: {color}; box-shadow: {activeRouteColor === color ?
							`0 0 14px ${color}`
						:	'none'};"
						class="tw-h-3 tw-w-8 tw-skew-x-[-18deg] tw-border tw-transition-all {activeRouteColor === color ?
							'tw-scale-105 tw-border-white'
						:	'tw-border-white/25 hover:tw-border-[#00f0ff]/55 hover:tw-opacity-100 tw-opacity-90'}"
						onclick={() => (activeRouteColor = color)}
						aria-label="Select route color"
					></button>
				{/each}
			</div>
		</div>
		<input
			type="range"
			min="0"
			max="1"
			step="0.001"
			value={scrubNorm}
			class="tg-hud-scrub tw-h-2 tw-w-full tw-min-w-0 tw-max-w-full tw-cursor-pointer"
			aria-valuetext={`Timeline ${Math.round(scrubNorm * 100)} percent`}
			oninput={onScrubInput}
		/>
	</div>

	<div class="tw-flex tw-min-w-0 tw-flex-wrap tw-items-center tw-justify-end tw-gap-4">
		{#if focusedPlayerId}
			{@const target = allTokens.find((t) => t.id === focusedPlayerId)}
			<div
				class="tw-flex tw-items-center tw-gap-6 tw-text-[#00f0ff]"
				in:fade={{ duration: 180 }}
				aria-live="polite"
				aria-label="Locked unit telemetry"
			>
				<div class="tw-flex tw-flex-col tw-items-end">
					<span class="tw-text-[9px] tw-text-white/50 tw-tracking-widest">UNIT IDENT</span>
					<span class="tw-font-bold tw-text-sm">
						{target?.name?.trim() || 'UNKNOWN'}
						[{target?.position || target?.number || '—'}]
					</span>
				</div>
				<div class="tw-flex tw-flex-col tw-gap-1 tw-w-24">
					<div class="tw-flex tw-justify-between tw-text-[8px]"><span>STM</span><span>92%</span></div>
					<div class="tw-w-full tw-h-1 tw-bg-white/10 tw-rounded-full tw-overflow-hidden">
						<div
							class="tw-h-full tw-bg-[#00f0ff] tw-w-[92%] tw-shadow-[0_0_10px_#00f0ff]"
						></div>
					</div>
					<div class="tw-flex tw-justify-between tw-text-[8px]"><span>HR</span><span>145</span></div>
				</div>
			</div>
		{:else}
			<button type="button" class={deckBtn} onclick={recallBench}>[ RECALL ]</button>
			<button
				type="button"
				class="{deckBtn} tw-transition-colors hover:tw-border-[#ff0033]/45 hover:tw-bg-[#ff0033]/10 hover:tw-text-[#ff0033] hover:tw-shadow-[0_0_14px_rgba(255,0,51,0.15)]"
				onclick={clearRoutesOnly}
				aria-label="Clear all routes"
			>
				[ CLEAR ROUTES ]
			</button>
			<button
				type="button"
				class="{deckBtn} {isHolotableMode ? deckBtnActive : ''} tw-text-[#00f0ff]"
				onclick={() => (isHolotableMode = !isHolotableMode)}
				aria-pressed={isHolotableMode}
				aria-label="Toggle 3D holotable perspective"
			>
				[ 3D HOLO ]
			</button>
		{/if}
	</div>
</div>
