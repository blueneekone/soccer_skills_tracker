<script>
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel, deployPhase: string, onDeploy: () => void }} */
	let { model, deployPhase = 'idle', onDeploy } = $props();

	/** @type {'cursor' | 'draw' | 'erase'} */
	let dockMode = $state('cursor');

	const TOOLS = /** @type {const} */ ([
		{ id: 'cursor', label: 'CURSOR', glyph: '◌' },
		{ id: 'draw',   label: 'DRAW',   glyph: '↗' },
		{ id: 'erase',  label: 'ERASE',  glyph: '⊗' },
	]);

	function pickMode(/** @type {'cursor' | 'draw' | 'erase'} */ mode) {
		dockMode = mode;
		// erase needs ROUTE mode so route hit-areas have pointer-events enabled
		model.setActiveTool(mode === 'draw' || mode === 'erase' ? 'ROUTE' : 'DRAG');
	}

	// When a route becomes selected in erase mode, delete it immediately.
	$effect(() => {
		if (dockMode === 'erase' && model.selectedRouteId) {
			model.deleteRoute(model.selectedRouteId);
		}
	});

	// Timeline scrubber helpers
	/** @param {PointerEvent} e @param {HTMLElement} el */
	function scrubNorm(e, el) {
		const r = el.getBoundingClientRect();
		return Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1)));
	}
	/** @param {PointerEvent} e */
	function onRailDown(e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
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
		try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
	}
</script>

<!--
  Tactical Dock — floating neon pill, bottom-center of the arena.
  pointer-events-auto so every button is interactive even though the HUD
  root wrapper is pointer-events-none.
-->
<div
	class="tw-pointer-events-auto tw-absolute tw-bottom-5 tw-left-1/2 -tw-translate-x-1/2 tw-z-20 tw-flex tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-[#00f0ff]/30 tw-bg-[#020202]/88 tw-px-5 tw-py-2.5 tw-shadow-[0_0_20px_rgba(0,240,255,0.18),inset_0_1px_1px_rgba(255,255,255,0.06)] tw-backdrop-blur-3xl"
	role="toolbar"
	aria-label="Tactical dock"
>
	<!-- Tool selector buttons -->
	{#each TOOLS as tool (tool.id)}
		<button
			type="button"
			class="tw-flex tw-flex-col tw-items-center tw-gap-0.5 tw-rounded-full tw-border tw-px-3 tw-py-1.5 tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-[0.14em] tw-transition-all tw-duration-150 tw-select-none
				{dockMode === tool.id
					? 'tw-border-[#00f0ff]/55 tw-bg-[#00f0ff]/12 tw-text-[#00f0ff] tw-shadow-[0_0_10px_rgba(0,240,255,0.25),inset_0_0_6px_rgba(0,240,255,0.07)]'
					: 'tw-border-white/10 tw-bg-transparent tw-text-white/35 hover:tw-border-[#00f0ff]/30 hover:tw-text-[#00f0ff]/70 active:tw-scale-95'}"
			onclick={() => pickMode(tool.id)}
			aria-pressed={dockMode === tool.id}
		>
			<span class="tw-text-[13px] tw-leading-none" aria-hidden="true">{tool.glyph}</span>
			{tool.label}
		</button>
	{/each}

	<!-- Divider -->
	<span class="tw-mx-1 tw-h-5 tw-w-px tw-shrink-0 tw-bg-[#00f0ff]/20" aria-hidden="true"></span>

	<!-- Play / Pause -->
	<button
		type="button"
		class="tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-[#00f0ff]/35 tw-bg-[#020202]/60 tw-text-[#00f0ff] tw-transition-all hover:tw-bg-[#00f0ff]/15 hover:tw-shadow-[0_0_14px_rgba(0,240,255,0.28)] active:tw-scale-95"
		onclick={() => model.toggleTimelinePlayback()}
		aria-pressed={model.simulator.isPlaying}
		aria-label={model.simulator.isPlaying ? 'Pause simulation' : 'Play simulation'}
	>
		{#if model.simulator.isPlaying}
			<span class="tw-flex tw-items-center tw-gap-0.5" aria-hidden="true">
				<span class="tw-block tw-h-2.5 tw-w-0.5 tw-rounded-sm tw-bg-current"></span>
				<span class="tw-block tw-h-2.5 tw-w-0.5 tw-rounded-sm tw-bg-current"></span>
			</span>
		{:else}
			<span
				class="tw-ml-0.5 tw-block tw-h-0 tw-w-0 tw-border-y-[5px] tw-border-y-transparent tw-border-l-[8px] tw-border-l-current"
				aria-hidden="true"
			></span>
		{/if}
	</button>

	<!-- Timeline rail -->
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

	<!-- Scrub clock -->
	<span class="tw-font-mono tw-text-[11px] tw-font-bold tw-tabular-nums tw-text-[#00f0ff]">
		{model.formatTimelineMs(model.simulator.currentTime)}
	</span>

	<!-- Divider -->
	<span class="tw-mx-1 tw-h-5 tw-w-px tw-shrink-0 tw-bg-[#00f0ff]/20" aria-hidden="true"></span>

	<!-- Deploy button -->
	<button
		type="button"
		class="tw-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#00f0ff]/40 tw-bg-[#00f0ff]/8 tw-px-4 tw-py-1.5 tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.14em] tw-text-[#00f0ff] tw-transition-all hover:tw-border-[#00f0ff]/70 hover:tw-bg-[#00f0ff]/15 hover:tw-shadow-[0_0_14px_rgba(0,240,255,0.28)] active:tw-scale-95 disabled:tw-cursor-not-allowed disabled:tw-opacity-30"
		onclick={onDeploy}
		disabled={deployPhase !== 'idle' || model.routesLive.length === 0}
	>
		<span
			class="tw-h-1.5 tw-w-1.5 tw-animate-pulse tw-rounded-full tw-bg-[#00f0ff] tw-shadow-[0_0_6px_rgba(0,240,255,0.9)]"
			aria-hidden="true"
		></span>
		{deployPhase !== 'idle' ? 'DEPLOYING…' : 'DEPLOY'}
	</button>
</div>
