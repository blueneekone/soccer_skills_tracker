<script>
	import GridHUD from './grid/GridHUD.svelte';

	/** @type {{ model: import('./TacticalEngine.svelte.ts').TacticalWarRoomModel }} */
	let { model, warRoomTool = $bindable('DRAG') } = $props();

	/**
	 * @param {PointerEvent} ev
	 * @param {HTMLElement} el
	 */
	function scrubNormFromPointer(ev, el) {
		const rect = el.getBoundingClientRect();
		const w = rect.width || 1;
		return Math.max(0, Math.min(1, (ev.clientX - rect.left) / w));
	}

	/**
	 * @param {PointerEvent} e
	 */
	function onRailPointerDown(e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		if (e.pointerId != null) {
			try {
				el.setPointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
		model.scrubTimelineNorm(scrubNormFromPointer(e, el));
	}

	/**
	 * @param {PointerEvent} e
	 */
	function onRailPointerMove(e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		if (e.pointerId != null && !el.hasPointerCapture(e.pointerId)) return;
		model.scrubTimelineNorm(scrubNormFromPointer(e, el));
	}

	/**
	 * @param {PointerEvent} e
	 */
	function onRailPointerUp(e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		if (e.pointerId != null) {
			try {
				el.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
	}
</script>

<div
	class="tw-pointer-events-auto tw-relative tw-z-50 tw-min-h-28 tw-shrink-0 tw-overflow-visible tw-border-t tw-border-white/10 tw-bg-[#020202]/85 tw-py-2 tw-pb-20 tw-backdrop-blur-2xl tw-transition-[box-shadow] tw-duration-300 tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),_0_-12px_40px_rgba(0,0,0,0.45)] {model.focusedPlayerId ?
		'tw-shadow-[inset_0_1px_0_rgba(255,0,60,0.35)]'
	:	''}"
>
	<GridHUD
		bind:warRoomTool
		pickTool={(t) => model.setActiveTool(t)}
		bind:isHolotableMode={model.isHolotableMode}
		simulator={model.simulator}
		bind:showLabels={model.showLabels}
		bind:activeRouteColor={model.activeRouteColor}
		bind:routeDrawKind={model.routeDrawKind}
		focusedPlayerId={model.focusedPlayerId}
		allTokens={model.allPitchTokens}
		recallBench={model.recallBench}
		clearRoutesOnly={model.clearRoutesOnly}
	/>

	<!-- Playback reactor: physical scrub + clock (no native range) -->
	<div
		class="tw-pointer-events-none tw-absolute tw-left-1/2 tw-top-full tw-z-[60] tw-flex tw--translate-x-1/2 tw-justify-center tw-pt-2"
		aria-hidden="false"
	>
		<div class="tw-pointer-events-auto tw-flex tw-flex-col tw-items-center tw-gap-2">
			<div
				class="tw-pointer-events-auto tw-bg-[#020202]/90 tw-backdrop-blur-xl tw-border tw-border-white/10 tw-rounded-full tw-px-6 tw-py-2 tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
			>
				<span
					class="tw-font-mono tw-text-lg tw-font-bold tw-text-[#00f0ff] tw-tracking-widest tw-tabular-nums"
				>
					{model.formatTimelineMs(model.simulator.currentTime)}
				</span>
			</div>

			<div
				class="tw-relative tw-h-2 tw-w-[min(24rem,92vw)] tw-cursor-pointer tw-rounded-full tw-bg-white/10 tw-overflow-hidden tw-shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]"
				role="slider"
				tabindex="0"
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuenow={Math.round(model.timelineNorm * 100)}
				aria-label="Simulation timeline"
				onpointerdown={onRailPointerDown}
				onpointermove={onRailPointerMove}
				onpointerup={onRailPointerUp}
				onpointercancel={onRailPointerUp}
			>
				<div
					class="tw-pointer-events-none tw-absolute tw-top-0 tw-left-0 tw-h-full tw-bg-gradient-to-r tw-from-[#00f0ff]/25 tw-to-[#00f0ff] tw-shadow-[0_0_12px_rgba(0,240,255,0.45)]"
					style="width: {model.timelineNorm * 100}%;"
				></div>
			</div>

			<button
				type="button"
				class="tw-pointer-events-auto tw-mt-1 tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-[#00f0ff]/50 tw-bg-[#020202]/80 tw-text-[#00f0ff] tw-backdrop-blur-xl tw-transition-transform hover:tw-scale-110 hover:tw-bg-[#00f0ff]/15 hover:tw-shadow-[0_0_20px_rgba(0,240,255,0.35)]"
				aria-pressed={model.simulator.isPlaying}
				aria-label={model.simulator.isPlaying ? 'Pause simulation' : 'Play simulation'}
				onclick={() => model.toggleTimelinePlayback()}
			>
				{#if model.simulator.isPlaying}
					<span class="tw-flex tw-items-center tw-gap-1 tw-text-current" aria-hidden="true">
						<span class="tw-block tw-h-3 tw-w-1 tw-rounded-sm tw-bg-current"></span>
						<span class="tw-block tw-h-3 tw-w-1 tw-rounded-sm tw-bg-current"></span>
					</span>
				{:else}
					<span
						class="tw-ml-0.5 tw-block tw-h-0 tw-w-0 tw-border-y-[6px] tw-border-y-transparent tw-border-l-[10px] tw-border-l-current"
						aria-hidden="true"
					></span>
				{/if}
			</button>
		</div>
	</div>
</div>
