<script>
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel, deployPhase: string, onDeploy: () => void }} */
	let { model, deployPhase = 'idle', onDeploy } = $props();

	/** @type {'cursor' | 'draw' | 'erase'} */
	let dockMode = $state('cursor');

	const TOOLS = /** @type {const} */ ([
		{ id: 'cursor', label: 'CURSOR', glyph: '◌' },
		{ id: 'draw', label: 'DRAW', glyph: '↗' },
		{ id: 'erase', label: 'ERASE', glyph: '⊗' },
	]);

	/**
	 * Tool-specific active palette per CEO directive.
	 * cursor & draw: Cyan · erase: Ares Red · (curve/cut live in drawer).
	 * @param {'cursor' | 'draw' | 'erase'} id
	 */
	function activePalette(id) {
		if (id === 'erase') {
			return 'tw-text-[#ff2a2a] tw-bg-[#ff2a2a]/15 tw-border-[#ff2a2a]/60 tw-shadow-[0_0_15px_rgba(255,42,42,0.4)]';
		}
		return 'tw-text-[#00f0ff] tw-bg-[#00f0ff]/15 tw-border-[#00f0ff]/60 tw-shadow-[0_0_15px_rgba(0,240,255,0.4)]';
	}

	function pickMode(/** @type {'cursor' | 'draw' | 'erase'} */ mode) {
		dockMode = mode;
		model.setActiveTool(mode === 'draw' || mode === 'erase' ? 'ROUTE' : 'DRAG');
	}

	$effect(() => {
		if (dockMode === 'erase' && model.selectedRouteId) {
			model.deleteRoute(model.selectedRouteId);
		}
	});

	/** @param {PointerEvent} e @param {HTMLElement} el */
	function scrubNorm(e, el) {
		const r = el.getBoundingClientRect();
		return Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1)));
	}
	/** @param {PointerEvent} e */
	function onRailDown(e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		try {
			el.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		model.scrubTimelineNorm(scrubNorm(e, el));
	}
	/** @param {PointerEvent} e */
	function onRailMove(e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		if (!el.hasPointerCapture(e.pointerId)) return;
		model.scrubTimelineNorm(scrubNorm(e, el));
	}
	/** @param {PointerEvent} e */
	function onRailUp(e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		try {
			el.releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}
</script>

<!--
  Outer strip — full width, flex-centered, pointer-events-none so the pitch
  stays clickable outside the pill. Inner pill re-enables events at z-9000.
-->
<div
	class="tw-absolute tw-bottom-8 tw-inset-x-0 tw-flex tw-justify-center tw-pointer-events-none tw-z-[10000]"
	aria-hidden="false"
>
	<!-- Floating glass pill: heavy backdrop-blur, hairline cyan border, rounded-xl. -->
	<div
		class="tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-bg-black/40 tw-backdrop-blur-3xl tw-border tw-border-[#00f0ff]/20 tw-rounded-xl tw-pointer-events-auto"
		role="toolbar"
		aria-label="Tactical dock"
	>
		{#each TOOLS as tool (tool.id)}
			<!--
			  Micro-typography weapon button. Active palette is tool-specific:
			  cursor/draw=cyan, erase=Ares red. Erase also gets a red hover even
			  while inactive, telegraphing destructive intent.
			-->
			<button
				type="button"
				class="tw-relative tw-px-4 tw-py-2 tw-text-[10px] tw-font-mono tw-tracking-[0.25em] tw-uppercase tw-transition-all tw-duration-300 tw-select-none tw-rounded-md tw-border tw-drop-shadow-[0_0_4px_currentColor]
				{dockMode === tool.id
					? activePalette(tool.id)
					: tool.id === 'erase'
						? 'tw-text-gray-400 tw-bg-transparent tw-border-transparent hover:tw-text-[#ff2a2a]'
						: 'tw-text-gray-400 tw-bg-transparent tw-border-transparent hover:tw-text-[#00f0ff]'}"
				onclick={() => pickMode(tool.id)}
				aria-pressed={dockMode === tool.id}
			>
				[ {tool.label} ]
			</button>
		{/each}

		<span class="tw-mx-1 tw-h-5 tw-w-px tw-shrink-0 tw-bg-[#00f0ff]/20" aria-hidden="true"></span>

		<button
			type="button"
			class="tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-[#00f0ff]/35 tw-bg-[#020202]/60 tw-font-mono tw-text-[11px] tw-font-bold tw-text-[#00f0ff] tw-transition-all hover:tw-bg-[#00f0ff]/15 hover:tw-shadow-[0_0_14px_rgba(0,240,255,0.28)] active:tw-scale-95"
			onclick={() => model.resetPositions()}
			aria-label="Rewind timeline and reset token positions"
			title="Rewind / reset"
		>
			<span aria-hidden="true">|&lt;</span>
		</button>

		<!-- ARES LIGHT DISC — circular play/pause weapon button. -->
		<button
			type="button"
			class="tw-relative tw-flex tw-items-center tw-justify-center tw-w-12 tw-h-12 tw-rounded-full tw-bg-[#0a0202]/80 tw-backdrop-blur-md tw-border-2 tw-border-[#ff2a2a]/40 tw-transition-all tw-duration-300 hover:tw-border-[#ff2a2a] hover:tw-shadow-[0_0_20px_rgba(255,42,42,0.6),inset_0_0_10px_rgba(255,42,42,0.4)] tw-group disabled:tw-opacity-30 disabled:tw-cursor-not-allowed"
			onclick={() => model.toggleTimelinePlayback()}
			disabled={!model.canPlay}
			aria-pressed={model.simulator.isPlaying}
			aria-label={model.simulator.isPlaying ? 'Pause simulation' : 'Play simulation'}
		>
			<!-- Concentric inner ring — spins slowly while the simulation is playing. -->
			<div
				class="tw-absolute tw-inset-1 tw-rounded-full tw-border tw-border-[#ff2a2a]/20 group-hover:tw-border-[#ff2a2a]/60 tw-transition-all"
				class:tw-animate-[spin_3s_linear_infinite]={model.simulator.isPlaying}
				aria-hidden="true"
			></div>
			<!-- Minimal SVG play/pause icon centered in the disc. -->
			{#if model.simulator.isPlaying}
				<svg
					class="tw-w-4 tw-h-4 tw-text-[#ff2a2a] group-hover:tw-drop-shadow-[0_0_5px_rgba(255,42,42,1)]"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
				>
					<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
				</svg>
			{:else}
				<svg
					class="tw-w-4 tw-h-4 tw-text-[#ff2a2a] tw-translate-x-[2px] group-hover:tw-drop-shadow-[0_0_5px_rgba(255,42,42,1)]"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
				>
					<path d="M8 5v14l11-7z" />
				</svg>
			{/if}
		</button>

		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			class="tw-relative tw-h-1.5 tw-w-24 tw-cursor-pointer tw-overflow-hidden tw-rounded-full tw-bg-white/10 tw-shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]"
			role="slider"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Math.round(model.timelineNorm * 100)}
			aria-label="Simulation timeline"
			onpointerdown={onRailDown}
			onpointermove={onRailMove}
			onpointerup={onRailUp}
			onpointercancel={onRailUp}
		>
			<div
				class="tw-pointer-events-none tw-absolute tw-left-0 tw-top-0 tw-h-full tw-rounded-full tw-bg-gradient-to-r tw-from-[#00f0ff]/30 tw-to-[#00f0ff] tw-shadow-[0_0_8px_rgba(0,240,255,0.4)]"
				style="width: {model.timelineNorm * 100}%;"
			></div>
		</div>

		<span class="tw-font-mono tw-text-[11px] tw-font-bold tw-tabular-nums tw-text-[#00f0ff]">
			{model.formatTimelineMs(model.simulator.currentTime)}
		</span>

		<span class="tw-mx-1 tw-h-5 tw-w-px tw-shrink-0 tw-bg-[#00f0ff]/20" aria-hidden="true"></span>

		<!--
		  [ SYS.MENU ] — hardwired through the DOM:
		    · z-[10000] sits above every layer including the drawer (9999).
		    · pointer-events-auto guarantees clicks land on this button even if
		      a parent wrapper is pointer-events-none.
		    · preventDefault + stopPropagation stops any background steal.
		-->
		<button
			type="button"
			class="tw-relative tw-z-[10000] tw-pointer-events-auto tw-cursor-pointer tw-px-4 tw-py-2 tw-text-[10px] tw-font-mono tw-tracking-[0.25em] tw-uppercase tw-transition-all tw-duration-300 tw-select-none tw-rounded-md tw-border tw-drop-shadow-[0_0_4px_currentColor]
			{model.isDrawerOpen
				? 'tw-text-[#ffaa00] tw-bg-[#ffaa00]/15 tw-border-[#ffaa00]/60 tw-shadow-[0_0_15px_rgba(255,170,0,0.4)]'
				: 'tw-text-gray-400 tw-bg-transparent tw-border-transparent hover:tw-text-[#ffaa00]'}"
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				model.isDrawerOpen = !model.isDrawerOpen;
			}}
			aria-pressed={model.isDrawerOpen}
			aria-label="Toggle command drawer"
		>
			[ SYS.MENU ]
		</button>

		<span class="tw-mx-1 tw-h-5 tw-w-px tw-shrink-0 tw-bg-[#00f0ff]/20" aria-hidden="true"></span>

		<!-- [ ↑ DEPLOY ] — green confirmation button. -->
		<button
			type="button"
			class="tw-relative tw-px-4 tw-py-2 tw-text-[10px] tw-font-mono tw-tracking-[0.25em] tw-uppercase tw-transition-all tw-duration-300 tw-rounded-md tw-border tw-border-[#00ff00]/50 tw-bg-[#00ff00]/10 tw-text-[#00ff00] tw-drop-shadow-[0_0_4px_currentColor] hover:tw-border-[#00ff00]/80 hover:tw-bg-[#00ff00]/20 hover:tw-shadow-[0_0_18px_rgba(0,255,0,0.45)] active:tw-scale-95 disabled:tw-cursor-not-allowed disabled:tw-opacity-30"
			onclick={onDeploy}
			disabled={deployPhase !== 'idle' || model.routesLive.length === 0}
		>
			{deployPhase !== 'idle' ? '[ ↑ DEPLOYING… ]' : '[ ↑ DEPLOY ]'}
		</button>
	</div>
</div>
