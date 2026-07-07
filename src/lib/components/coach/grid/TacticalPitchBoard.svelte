<!--
  TacticalPitchBoard.svelte
  ─────────────────────────
  Pure 2D top-down tactical board (post-Holotable excision).

  Layout
  ──────
  • An outer flex wrapper centres the board inside whatever the parent
    (TacticalArena) gives us.
  • The board itself enforces a 16:9 aspect ratio (`aspect-ratio: 16/9`)
    with `max-width: 100%; max-height: 100%` so it always fits the parent's
    smaller dimension while preserving the SVG viewBox without distortion.
  • The SVG fills the board and uses `preserveAspectRatio="xMidYMid meet"`
    so the 1600×900 design space scales perfectly inside it.

  Rendering
  ─────────
  • GridSvgDefs   – marker / filter defs (chevrons, neon glow, sweep gradient)
  • GridPitch     – static pitch lines (touchlines, halfway, boxes, spots)
  • GridRoute     – per-route stroke + hit + ghost + anchor layers
  • GridEntity    – player tokens (drag, hover, focus, charging)
  • GridRadialHub – right-click radial deploy / edit menu

  Interactivity hooks are all owned by TacticalEngine.svelte.ts; this file
  is purely presentation and event delegation.
-->
<script>
	import GridPitch from './GridPitch.svelte';
	import GridEntity from './GridEntity.svelte';
	import GridRoute from './GridRoute.svelte';
	import GridSvgDefs from './GridSvgDefs.svelte';
	import TacticalRouteDelayHud from './TacticalRouteDelayHud.svelte';
	import GridRadialHub from './GridRadialHub.svelte';

	/** @typedef {import('$lib/states/war-room/types').TacticalToken} TacticalToken */
	/** @typedef {import('$lib/states/war-room/types').TacticalRoute} TacticalRoute */

	let {
		pitchSvgEl = $bindable(),
		warRoomTool,
		showLabels,
		draggingPlayer,
		activeDragTrail,
		trailString,
		dragTrailBloomColor,
		routesLive,
		routePathD,
		selectedRouteId,
		simulatorTime,
		simulatorIsPlaying,
		onRouteStrokePointerDown,
		onAnchorDown,
		routingActive,
		routeDraft,
		allPitchTokens,
		hoveredDiscId,
		focusedPlayerId,
		ringColor,
		simChargePlayerIds,
		startDrag,
		bumpRouteDelay,
		allRouteMarkerColors,
		onPitchPointerDown,
		onPitchPointerUpClearLongPress,
		onPitchMouseLeave,
		onPitchContextMenu,
		/** @type {(ev: MouseEvent, player: TacticalToken) => void} */
		onTokenContextMenu = undefined,
		handleSvgClick,
		setHoveredRouteId,
		setHoveredDiscId,
		setFocusedPlayerId,
		showAnchorsFor,
		radialOpen,
		radialCx,
		radialCy,
		hubPop,
		radialAllSlots,
		hubHoveredKey,
		hubCenterLabel,
		isLoadingCartridge = false,
		cartridgeSweepEpoch = 0
	} = $props();
</script>

<!--
  Outer absolute fill: TacticalArena gives us its content area; we centre
  the aspect-locked board inside it with flex.
-->
<div class="coach-tac-z3-stage tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center">
	<div
		class="coach-tac-z3-pitch tw-relative tw-overflow-visible"
		style="aspect-ratio: 16 / 9; max-width: 100%; max-height: 100%; width: 100%; height: 100%;"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<svg
			bind:this={pitchSvgEl}
			id="tactical-pitch-svg"
			class="tw-absolute tw-inset-0 tw-w-full tw-h-full tw-opacity-90 tw-touch-none tw-select-none {warRoomTool ===
			'ROUTE'
				? 'tw-cursor-crosshair'
				: 'tw-cursor-default'}"
			viewBox="0 0 1600 900"
			preserveAspectRatio="xMidYMid slice"
			role="img"
			aria-label="Tactical pitch"
			onpointerdown={onPitchPointerDown}
			onpointerup={onPitchPointerUpClearLongPress}
			onpointerleave={onPitchMouseLeave}
			oncontextmenu={onPitchContextMenu}
			onclick={handleSvgClick}
		>
			<GridSvgDefs markerColors={allRouteMarkerColors} {cartridgeSweepEpoch} />

			<g>
				<GridPitch {showLabels} />

				<g>
					<!-- Route stroke layer (visual) -->
					{#each routesLive as route (route.id)}
						<GridRoute
							{route}
							pathD={routePathD(route)}
							renderLayer="stroke"
							isSelected={selectedRouteId === route.id}
							timelineMs={simulatorTime}
						/>
					{/each}

					<!-- Route hit layer (transparent, captures clicks) -->
					{#each routesLive as route (route.id)}
						<GridRoute
							{route}
							pathD={routePathD(route)}
							renderLayer="hit"
							timelineMs={simulatorTime}
							{warRoomTool}
							onPathClick={(e) => {
								e.stopPropagation();
								onRouteStrokePointerDown(e, route);
							}}
							onRouteHoverEnter={() => setHoveredRouteId(route.id)}
							onRouteHoverLeave={() => setHoveredRouteId(null)}
						/>
					{/each}

					<!-- Route ghost markers (success-probability rings) -->
					{#each routesLive as route (route.id)}
						{#if route.bindPlayerId}
							{@const boundToken = allPitchTokens.find((t) => t.id === route.bindPlayerId)}
							<GridRoute
								{route}
								renderLayer="ghost"
								timelineMs={simulatorTime}
								playerStamina={boundToken
									? Math.max(40, 95 - (Number(boundToken.number) || 5) * 4)
									: 80}
							/>
						{/if}
					{/each}

					<!-- Player tokens -->
					{#each allPitchTokens as player (player.id)}
						<GridEntity
							{player}
							isHovered={hoveredDiscId === player.id}
							isSelected={focusedPlayerId === player.id}
							isDragging={draggingPlayer?.id === player.id}
							ringStroke={ringColor(player)}
							charging={simulatorIsPlaying && simChargePlayerIds.includes(player.id)}
							timelineMs={simulatorTime}
							{warRoomTool}
							onSelect={() => setFocusedPlayerId(player.id)}
							onPointerDown={(e) => {
								e.stopPropagation();
								startDrag(e, player);
							}}
							onRightClick={onTokenContextMenu
								? (e) => onTokenContextMenu(e, player)
								: undefined}
							onMouseEnter={() => setHoveredDiscId(player.id)}
							onMouseLeave={() => setHoveredDiscId(null)}
						/>
					{/each}

					<!-- Anchor control points rendered LAST so they're on top in SVG z-order -->
					{#each routesLive as route (route.id)}
						{#if warRoomTool === 'ROUTE' && showAnchorsFor(route.id)}
							<GridRoute
								{route}
								renderLayer="anchors"
								isSelected={selectedRouteId === route.id}
								timelineMs={simulatorTime}
								onControlPointDrag={(e, kind) => {
									e.stopPropagation();
									onAnchorDown(e, route.id, kind);
								}}
							/>
						{/if}
					{/each}

					{#if warRoomTool === 'ROUTE' && selectedRouteId}
						{@const hudRoute = routesLive.find((x) => x.id === selectedRouteId)}
						{#if hudRoute}
							<TacticalRouteDelayHud {hudRoute} bumpDelay={bumpRouteDelay} />
						{/if}
					{/if}
				</g>

				<!-- Active route draft (drawing in progress) -->
				{#if routingActive && routeDraft}
					<path
						class="route-draft-pulse"
						d={routePathD(routeDraft)}
						fill="none"
						stroke={routeDraft.color}
						stroke-width="14"
						stroke-linecap="round"
						stroke-linejoin="round"
						opacity="0.15"
						pointer-events="none"
					/>
					<path
						class="route-draft-pulse route-draft-pulse--slow"
						d={routePathD(routeDraft)}
						fill="none"
						stroke={routeDraft.color}
						stroke-width="6"
						stroke-linecap="round"
						stroke-linejoin="round"
						opacity="0.4"
						filter="url(#premium-neon)"
						pointer-events="none"
					/>
					<path
						class="route-draft-pulse route-draft-pulse--slow"
						d={routePathD(routeDraft)}
						fill="none"
						stroke="#ffffff"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						marker-end="url(#tech-chevron)"
						pointer-events="none"
					/>
				{/if}

				<!-- Cartridge load sweep -->
				{#if isLoadingCartridge}
					{#key cartridgeSweepEpoch}
						<line
							x1="0"
							y1="0"
							x2="0"
							y2="100%"
							stroke="#ff003c"
							stroke-width="12"
							opacity="0.25"
							stroke-linecap="round"
							pointer-events="none"
						>
							<animate
								attributeName="x1"
								values="-50;1650"
								dur="1.2s"
								fill="freeze"
								calcMode="spline"
								keyTimes="0;1"
								keySplines="0.25 0.1 0.25 1"
							/>
							<animate
								attributeName="x2"
								values="-50;1650"
								dur="1.2s"
								fill="freeze"
								calcMode="spline"
								keyTimes="0;1"
								keySplines="0.25 0.1 0.25 1"
							/>
							<animate
								attributeName="opacity"
								values="1;1;0"
								dur="1.2s"
								fill="freeze"
								keyTimes="0;0.8;1"
							/>
						</line>
						<line
							x1="0"
							y1="0"
							x2="0"
							y2="100%"
							stroke="#ff003c"
							stroke-width="2.5"
							opacity="0.9"
							stroke-linecap="round"
							pointer-events="none"
						>
							<animate
								attributeName="x1"
								values="-50;1650"
								dur="1.2s"
								fill="freeze"
								calcMode="spline"
								keyTimes="0;1"
								keySplines="0.25 0.1 0.25 1"
							/>
							<animate
								attributeName="x2"
								values="-50;1650"
								dur="1.2s"
								fill="freeze"
								calcMode="spline"
								keyTimes="0;1"
								keySplines="0.25 0.1 0.25 1"
							/>
							<animate
								attributeName="opacity"
								values="1;1;0"
								dur="1.2s"
								fill="freeze"
								keyTimes="0;0.8;1"
							/>
						</line>
					{/key}
				{/if}
			</g>

			<GridRadialHub
				{radialOpen}
				{radialCx}
				{radialCy}
				{hubPop}
				{radialAllSlots}
				{hubHoveredKey}
				{hubCenterLabel}
			/>
		</svg>
	</div>
</div>

<style>
	@keyframes dash-flow-draft {
		to {
			stroke-dashoffset: -56;
		}
	}

	:global(.route-draft-pulse) {
		stroke-dasharray: 8 6;
		animation: dash-flow-draft 1.6s linear infinite;
	}

	:global(.route-draft-pulse--slow) {
		animation-duration: 2.2s;
	}
</style>
