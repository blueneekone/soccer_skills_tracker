<script>
	import { fade } from 'svelte/transition';

	const ARES = '#ff003c';
	const CYAN = '#00f0ff';

	const INK_PALETTE = /** @type {const} */ (['#00f0ff', '#ff00ff', '#ffff00', '#ffffff']);

	const glassPanel =
		'tw-rounded-2xl tw-border tw-border-white/10 tw-bg-[#020202]/80 tw-backdrop-blur-3xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_20px_40px_rgba(0,0,0,0.5)]';

	const segBtn =
		'tw-pointer-events-auto tw-rounded-full tw-border tw-border-white/12 tw-bg-black/40 tw-px-3 tw-py-2 tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-[0.14em] tw-text-white/75 tw-transition-colors hover:tw-border-[#00f0ff]/40 hover:tw-text-[#00f0ff]';

	const segBtnOn =
		'tw-border-[#00f0ff]/50 tw-bg-[#00f0ff]/10 tw-text-[#00f0ff] tw-shadow-[inset_0_0_10px_rgba(0,240,255,0.12)]';

	let {
		warRoomTool = $bindable(),
		/** @type {(t: 'DRAG' | 'ROUTE') => void} */
		pickTool = undefined,
		simulator,
		showLabels = $bindable(),
		activeRouteColor = $bindable(),
		routeDrawKind = $bindable(),
		focusedPlayerId = null,
		allTokens = [],
		recallBench,
		clearRoutesOnly,
	} = $props();

	const lockAccent = $derived(focusedPlayerId ? ARES : CYAN);
</script>

<div
	class="tw-pointer-events-auto tw-box-border tw-grid tw-h-full tw-w-full tw-grid-cols-[300px_1fr_300px] tw-gap-2 tw-bg-transparent tw-p-2 tw-font-mono tw-text-[10px] tw-uppercase tw-tracking-widest"
	aria-label="War room instrument cluster"
>
	<!-- Left console -->
	<div class="tw-flex tw-min-h-0 tw-min-w-0 tw-flex-col tw-overflow-visible tw-p-3 {glassPanel}">
		<span class="tw-mb-2 tw-text-[9px] tw-font-mono tw-font-bold tw-tracking-widest tw-text-white/40"
			>TACTICAL_SYS</span
		>
		<div class="tw-flex tw-min-h-0 tw-flex-wrap tw-gap-1.5">
			<button
				type="button"
				class="{segBtn} {warRoomTool === 'DRAG' ? segBtnOn : ''}"
				onclick={() => (pickTool ? pickTool('DRAG') : (warRoomTool = 'DRAG'))}
				aria-pressed={warRoomTool === 'DRAG'}
			>
				DRAG
			</button>
		<button
			type="button"
			class="{segBtn} {warRoomTool === 'ROUTE' ? segBtnOn : ''}"
			onclick={() => (pickTool ? pickTool('ROUTE') : (warRoomTool = 'ROUTE'))}
			aria-pressed={warRoomTool === 'ROUTE'}
		>
			ROUTE
		</button>
			{#if warRoomTool === 'ROUTE'}
				<button
					type="button"
					class="{segBtn} {routeDrawKind === 'curve' ? segBtnOn : ''}"
					onclick={() => (routeDrawKind = 'curve')}
					aria-pressed={routeDrawKind === 'curve'}
				>
					CURVE
				</button>
				<button
					type="button"
					class="{segBtn} {routeDrawKind === 'cut' ? segBtnOn : ''}"
					onclick={() => (routeDrawKind = 'cut')}
					aria-pressed={routeDrawKind === 'cut'}
				>
					CUT
				</button>
			{/if}
			<button
				type="button"
				class="{segBtn} {showLabels ? segBtnOn : ''}"
				onclick={() => (showLabels = !showLabels)}
				aria-pressed={showLabels}
			>
				LABELS
			</button>
		</div>
	</div>

	<!-- Center flight deck -->
	<div
		class="tw-relative tw-flex tw-min-h-0 tw-min-w-0 tw-flex-col tw-items-center tw-justify-center tw-overflow-visible tw-rounded-2xl tw-border tw-border-[#00f0ff]/25 tw-bg-[#020202]/75 tw-bg-gradient-to-b tw-from-[#00f0ff]/12 tw-to-transparent tw-px-4 tw-py-3 tw-backdrop-blur-3xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_16px_36px_rgba(0,0,0,0.45)]"
		aria-label="Simulator playback"
	>
		<div class="tw-mb-1 tw-flex tw-w-full tw-flex-wrap tw-items-center tw-justify-center tw-gap-2">
			<button type="button" class="{segBtn} tw-px-3" onclick={() => simulator.reset()}>|&lt; RST</button>
			<div class="tw-flex tw-items-center tw-gap-1.5 tw-border-l tw-border-[#00f0ff]/25 tw-pl-3" aria-label="Ink">
				{#each INK_PALETTE as color (color)}
					<button
						type="button"
						style="background-color: {color}; box-shadow: {activeRouteColor === color ?
							`0 0 12px ${color}`
						:	'none'};"
						class="tw-pointer-events-auto tw-h-3 tw-w-7 tw-shrink-0 tw-skew-x-[-14deg] tw-border tw-transition-all {activeRouteColor === color ?
							'tw-scale-105 tw-border-white'
						:	'tw-border-white/30 hover:tw-border-[#00f0ff]/45'}"
						onclick={() => (activeRouteColor = color)}
						aria-label="Select route color"
					></button>
				{/each}
			</div>
		</div>
		<p class="tw-m-0 tw-text-center tw-text-[8px] tw-font-mono tw-tracking-widest tw-text-white/35">
			TIMELINE · DECK REACTOR
		</p>
	</div>

	<!-- Right telemetry bay -->
	<div class="tw-flex tw-min-h-0 tw-min-w-0 tw-flex-col tw-overflow-visible tw-p-3 {glassPanel}">
		<span class="tw-mb-2 tw-text-[9px] tw-font-mono tw-font-bold tw-tracking-widest tw-text-[#ff003c]/90">
			{focusedPlayerId ? 'UNIT_TELEMETRY' : 'SYS_CONSOLE'}
		</span>
		{#if focusedPlayerId}
			{@const target = allTokens.find((t) => t.id === focusedPlayerId)}
			<div
				class="tw-flex tw-min-h-0 tw-min-w-0 tw-flex-1 tw-flex-col tw-justify-center tw-gap-2"
				style="color: {lockAccent};"
				in:fade={{ duration: 160 }}
				aria-live="polite"
			>
				<div class="tw-min-w-0 tw-text-[10px] tw-leading-tight">
					<span class="tw-block tw-text-[8px] tw-text-white/40">LOCK</span>
					<span class="tw-block tw-truncate tw-font-bold tw-tracking-normal">
						{target?.name?.trim() || 'UNKNOWN'}
						<span class="tw-text-white/50">[{target?.position || target?.number || '—'}]</span>
					</span>
				</div>
				<div class="tw-space-y-2 tw-text-[8px]">
					<div>
						<div class="tw-mb-0.5 tw-flex tw-justify-between tw-text-white/50">
							<span>STM</span><span class="tw-font-mono tw-tabular-nums">92%</span>
						</div>
						<div class="tw-h-1 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-white/10">
							<div
								class="tw-h-full tw-w-[92%] tw-rounded-full"
								style="background-color: {ARES}; box-shadow: 0 0 8px {ARES};"
							></div>
						</div>
					</div>
					<div>
						<div class="tw-mb-0.5 tw-flex tw-justify-between tw-text-white/50">
							<span>HR</span><span class="tw-font-mono tw-tabular-nums">145</span>
						</div>
						<div class="tw-h-1 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-white/10">
							<div
								class="tw-h-full tw-w-[72%] tw-rounded-full"
								style="background-color: {CYAN}; box-shadow: 0 0 8px {CYAN};"
							></div>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div
				class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-wrap tw-content-center tw-items-center tw-justify-end tw-gap-1.5"
			>
				<button type="button" class="{segBtn}" onclick={recallBench}>RECALL</button>
				<button
					type="button"
					class="{segBtn} hover:tw-border-[#ff0033]/45 hover:tw-text-[#ff0033]"
					onclick={clearRoutesOnly}
				>
					CLR_RT
				</button>
			</div>
		{/if}
	</div>
</div>
