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

<!-- Z1 timeline well + Z4 HUD actions -->
<div class="coach-tac-z1-dock" aria-hidden="false">
	<div class="coach-tac-z1-well" role="toolbar" aria-label="Tactical dock">
		{#each TOOLS as tool (tool.id)}
			<button
				type="button"
				class="coach-tac-z4-btn
					{dockMode === tool.id ? 'coach-tac-z4-btn--active' : ''}
					{tool.id === 'erase' ? 'coach-tac-z4-btn--erase' : ''}
					{tool.id === 'erase' && dockMode === tool.id ? 'coach-tac-z4-btn--erase-active' : ''}"
				onclick={() => pickMode(tool.id)}
				aria-pressed={dockMode === tool.id}
			>
				[ {tool.label} ]
			</button>
		{/each}

		<span class="coach-tac-z4-divider" aria-hidden="true"></span>

		<button
			type="button"
			class="coach-tac-z4-icon-btn"
			onclick={() => model.resetPositions()}
			aria-label="Rewind timeline and reset token positions"
			title="Rewind / reset"
		>
			<span aria-hidden="true">|&lt;</span>
		</button>

		<button
			type="button"
			class="coach-tac-z4-icon-btn coach-tac-z4-play"
			onclick={() => model.toggleTimelinePlayback()}
			disabled={!model.canPlay}
			aria-pressed={model.simulator.isPlaying}
			aria-label={model.simulator.isPlaying ? 'Pause simulation' : 'Play simulation'}
		>
			{#if model.simulator.isPlaying}
				<svg class="tw-w-4 tw-h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
				</svg>
			{:else}
				<svg class="tw-w-4 tw-h-4 tw-translate-x-[2px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M8 5v14l11-7z" />
				</svg>
			{/if}
		</button>

		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			class="coach-tac-z4-rail"
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
			<div class="coach-tac-z4-rail-fill" style="width: {model.timelineNorm * 100}%;"></div>
		</div>

		<span class="coach-tac-z4-time">{model.formatTimelineMs(model.simulator.currentTime)}</span>

		<span class="coach-tac-z4-divider" aria-hidden="true"></span>

		<button
			type="button"
			class="coach-tac-z4-btn coach-tac-z4-btn--menu
				{model.isDrawerOpen ? 'coach-tac-z4-btn--menu-active' : ''}"
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

		<span class="coach-tac-z4-divider" aria-hidden="true"></span>

		<button
			type="button"
			class="coach-tac-z4-btn coach-tac-z4-btn--deploy"
			onclick={onDeploy}
			disabled={deployPhase !== 'idle' || model.routesLive.length === 0}
		>
			{deployPhase !== 'idle' ? '[ ↑ DEPLOYING… ]' : '[ ↑ DEPLOY ]'}
		</button>
	</div>
</div>
