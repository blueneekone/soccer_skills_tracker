<script>
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel, deployPhase: string, onDeploy: () => void, isHalfField?: boolean, onToggleHalfField?: () => void, onToggleToolbar?: () => void, isTacticsHubOpen?: boolean, onToggleTacticsHub?: () => void, onExit?: () => void }} */
	let {
		model,
		deployPhase = 'idle',
		onDeploy,
		isHalfField = false,
		onToggleHalfField,
		onToggleToolbar,
		isTacticsHubOpen = false,
		onToggleTacticsHub,
		onExit,
	} = $props();

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

	function handleExitClick() {
		if (onExit) {
			onExit();
		} else {
			untrack(() => {
				goto('/coach/dashboard');
			});
		}
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
		<!-- Tactics Hub Toggle -->
		<button
			type="button"
			class="coach-tac-z4-btn {isTacticsHubOpen ? 'coach-tac-z4-btn--active' : ''}"
			onclick={onToggleTacticsHub}
			aria-pressed={isTacticsHubOpen}
			aria-label="Toggle Tactics Hub"
			title="Tactics Hub"
		>
			[ ⚡ TACTICS HUB ]
		</button>

		<span class="coach-tac-z4-divider" aria-hidden="true"></span>

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

		<button
			type="button"
			class="coach-tac-z4-btn {dockMode === 'draw' && model.routeDrawKind === 'cut' ? 'coach-tac-z4-btn--active' : ''}"
			onclick={() => {
				dockMode = 'draw';
				model.setActiveTool('ROUTE');
				model.routeDrawKind = 'cut';
			}}
		>
			PLAYER RUN
		</button>

		<button
			type="button"
			class="coach-tac-z4-btn {dockMode === 'draw' && model.routeDrawKind === 'pass' ? 'coach-tac-z4-btn--active' : ''}"
			onclick={() => {
				dockMode = 'draw';
				model.setActiveTool('ROUTE');
				model.routeDrawKind = 'pass';
			}}
		>
			BALL PASS
		</button>

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
			class="coach-tac-z4-icon-btn {isHalfField ? 'coach-tac-z4-btn--active' : ''}"
			onclick={onToggleHalfField}
			title={isHalfField ? 'Full Field View' : 'Half Field View'}
			aria-label={isHalfField ? 'Full Field View' : 'Half Field View'}
		>
			<span aria-hidden="true" class="tw-font-mono tw-font-black">1/2</span>
		</button>

		<button
			type="button"
			class="coach-tac-z4-icon-btn"
			style="color: var(--pd-data-cyan);"
			onclick={onToggleToolbar}
			title="Hide Tools"
			aria-label="Hide Tools"
		>
			<span aria-hidden="true">✕</span>
		</button>

		<span class="coach-tac-z4-divider" aria-hidden="true"></span>

		<button
			type="button"
			class="coach-tac-z4-btn coach-tac-z4-btn--deploy tw-truncate"
			style="max-width: 140px;"
			onclick={onDeploy}
			disabled={deployPhase !== 'idle' || model.routesLive.length === 0}
		>
			{deployPhase !== 'idle' ? '[ ↑ DEPLOYING… ]' : '[ OPS DEPLOY ]'}
		</button>

		<span class="coach-tac-z4-divider" aria-hidden="true"></span>

		<!-- EXIT WAR ROOM Button on Bottom Tray -->
		<button
			type="button"
			class="coach-tac-z4-btn coach-tac-z4-btn--exit tw-bg-red-950/50 tw-border tw-border-red-600/60 tw-text-red-300 hover:tw-bg-red-600 hover:tw-text-white tw-font-bold tw-transition-colors"
			onclick={handleExitClick}
			title="Exit War Room to Coach Dashboard"
			aria-label="Exit War Room"
		>
			✕ EXIT WAR ROOM
		</button>
	</div>
</div>
