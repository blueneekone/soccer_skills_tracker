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
		isHolotableMode = false,
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
		cartridgeSweepEpoch = 0,
	} = $props();

	const holotableStatsTarget = $derived.by(() => {
		if (!isHolotableMode || !focusedPlayerId) return null;
		return allPitchTokens.find((t) => t.id === focusedPlayerId) ?? null;
	});


</script>

<!--
  STARK / FLYNN HOLOTABLE ENVIRONMENT
    · Outer container = 3D camera (perspective 1200px, origin at 50% / 120% so
      we look slightly upward across the table from below the front edge).
    · Tron grid floor = independent rotated plane behind everything else.
    · Greebles, scanlines, vignette = ambient flavor pinned to viewport.
    · The Projector Base is a flex-centered card; its tilt + glass material
      give the field a physical "console" frame instead of a square in a void.
-->
<div
	class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-overflow-hidden tw-bg-[#010308]"
	style="perspective: 1200px; perspective-origin: 50% 120%;"
>
	<!--
	  Infinite Tron grid floor — sits behind the projector base, deeply rotated
	  (rotateX 70deg) so it reads as a true ground plane stretching to the
	  horizon. translateZ pushes it back into space below the table.
	-->
	<div
		class="tw-absolute tw-inset-0 tw-pointer-events-none tw-opacity-30"
		style="background-image: linear-gradient(to right, rgba(0,240,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,240,255,0.05) 1px, transparent 1px); background-size: 60px 60px; transform: rotateX(70deg) translateZ(-200px); transform-origin: center; mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 85%); -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 85%);"
		aria-hidden="true"
	></div>

	<!-- ARCADE GREEBLE: SIEM terminal status bar — amber accent anchors the HUD. -->
	<div
		class="tw-absolute tw-top-4 tw-left-8 tw-z-50 tw-font-mono tw-text-[9px] tw-tracking-[0.3em] tw-text-[#ffaa00] tw-animate-pulse tw-pointer-events-none"
		aria-hidden="true"
	>
		[ UPLINK SECURE // LATENCY 12ms ]
	</div>

	<!-- CRT scanlines — top-layer ambient flavor. -->
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-40 tw-bg-[linear-gradient(rgba(255,0,60,0.02)_50%,transparent_50%)] tw-bg-[length:100%_4px] tw-animate-[scanlines_10s_linear_infinite]"
		aria-hidden="true"
	></div>
	<!-- Vignette — fade viewport edges into the void. -->
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-40 tw-bg-[radial-gradient(circle_at_center,transparent_40%,#010308_100%)]"
		aria-hidden="true"
	></div>

	<!--
	  HOLOTABLE GRID BASE — physical table surface beneath the projection.
	  Rotated steeply (80deg) so it reads as a flat floor receding to the
	  horizon rather than a back-wall. z-0 keeps it behind the projector base.
	  Negative inset ensures the rotated plane fills the viewport at the edges.
	-->
	<div
		class="tw-absolute tw-inset-[-50%] tw-pointer-events-none tw-z-0"
		style="background-image: linear-gradient(to right, rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,240,255,0.03) 1px, transparent 1px); background-size: 100px 100px; transform: rotateX(80deg) translateZ(-150px); mask-image: radial-gradient(circle at center, black 10%, transparent 60%); -webkit-mask-image: radial-gradient(circle at center, black 10%, transparent 60%);"
		aria-hidden="true"
	></div>

	<!--
	  THE STARK PROJECTOR BASE
	    Physical-feeling holotable: glass panel + cyan trim + projection-light
	    haze rising from the back. Holotable mode toggles the dramatic 55deg
	    backward tilt; off = flat traditional view. Routing math untouched.
	-->
	<div
		class="tg-holotable-stage tw-pointer-events-auto tw-relative tw-z-10 tw-w-[90vw] tw-h-[70vh] tw-max-w-[1200px] tw-rounded-xl tw-border tw-border-[#00f0ff]/30 tw-bg-[#020a14]/60 tw-backdrop-blur-md tw-shadow-[0_0_50px_rgba(0,240,255,0.1),inset_0_0_30px_rgba(0,240,255,0.2)]"
		style="transform-style: preserve-3d; transition: transform 0.8s cubic-bezier(0.23, 1, 0.32, 1); transform: {isHolotableMode
			? 'rotateX(55deg) translateY(-50px)'
			: 'rotateX(0deg) translateY(0)'};"
	>
		<!-- Volumetric projection light — vertical cyan haze rising off the base. -->
		<div
			class="tw-absolute tw-inset-0 tw-rounded-xl tw-bg-gradient-to-t tw-from-[#00f0ff]/20 tw-via-transparent tw-to-transparent tw-pointer-events-none"
			aria-hidden="true"
		></div>

		<!--
		  HOLOGRAPHIC DUST — digital light-beam scatter across the projection surface.
		  mix-blend-screen lets the gradient add luminosity to the cyan pitch lines
		  without darkening anything. The bottom-biased radial origin places the
		  brightest beam core at the "near" edge of the tilted table, exactly where
		  a real projector cone would bloom.
		-->
		<div
			class="tw-absolute tw-inset-0 tw-pointer-events-none tw-mix-blend-screen tw-opacity-30"
			style="background-image: radial-gradient(circle at 50% 120%, rgba(0,240,255,0.1) 0%, transparent 70%); filter: contrast(120%) brightness(120%);"
			aria-hidden="true"
		></div>

		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!--
		  Pitch SVG fills the base; preserveAspectRatio="xMidYMid meet" letter-
		  boxes the 16:9 field in the central band of the 2:3 base, so the trim
		  above and below reads as the projector body. No mask-image — the
		  physical base now frames the field on its own.
		-->
		<!--
		  SVG is absolutely positioned to lock corner-to-corner with the projector
		  base so that its 0,0 origin aligns with the top-left of the physical
		  surface. All routes, entities, and anchors are SVG children and therefore
		  inherit the base's rotateX tilt as one flat 3D plane — no floating.
		-->
		<!--
		  tw-isolate removed: isolation:isolate creates a stacking context that
		  flattens CSS preserve-3d on the projector base in some browsers.
		  All routes, entities, and anchors remain SVG children of this element
		  and therefore inherit the base's rotateX tilt as a single flat 3D plane.
		-->
		<svg
			bind:this={pitchSvgEl}
			id="tactical-pitch-svg"
			class="tw-absolute tw-inset-0 tw-z-10 tw-w-full tw-h-full tw-opacity-80 tw-touch-none tw-select-none {warRoomTool === 'ROUTE' ? 'tw-cursor-crosshair' : 'tw-cursor-default'}"
			viewBox="0 0 1600 900"
			preserveAspectRatio="xMidYMid meet"
			role="img"
			aria-label="Tactical pitch"
			onpointerdown={onPitchPointerDown}
			onpointerup={onPitchPointerUpClearLongPress}
			onpointerleave={onPitchMouseLeave}
			oncontextmenu={onPitchContextMenu}
			onclick={handleSvgClick}
		>
			<GridSvgDefs markerColors={allRouteMarkerColors} {cartridgeSweepEpoch} />

			<g class="tg-holotable-plane">
				<GridPitch {showLabels} />


			<g>
			{#each routesLive as route (route.id)}
				<GridRoute
					{route}
					pathD={routePathD(route)}
					renderLayer="stroke"
					isSelected={selectedRouteId === route.id}
					timelineMs={simulatorTime}
				/>
			{/each}
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
		{#each routesLive as route (route.id)}
			{#if route.bindPlayerId}
				{@const boundToken = allPitchTokens.find((t) => t.id === route.bindPlayerId)}
				<GridRoute
					{route}
					renderLayer="ghost"
					timelineMs={simulatorTime}
					playerStamina={boundToken ? Math.max(40, 95 - (Number(boundToken.number) || 5) * 4) : 80}
				/>
			{/if}
		{/each}

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
				onRightClick={onTokenContextMenu ? (e) => onTokenContextMenu(e, player) : undefined}
				onMouseEnter={() => setHoveredDiscId(player.id)}
				onMouseLeave={() => setHoveredDiscId(null)}
			/>
		{/each}

		<!-- Anchor control points rendered LAST — on top of player tokens in SVG z-order so they capture pointer events first -->
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
						<animate attributeName="opacity" values="1;1;0" dur="1.2s" fill="freeze" keyTimes="0;0.8;1" />
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
						<animate attributeName="opacity" values="1;1;0" dur="1.2s" fill="freeze" keyTimes="0;0.8;1" />
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

			<div class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-20">
				{#if isHolotableMode && holotableStatsTarget && typeof holotableStatsTarget.x === 'number' && typeof holotableStatsTarget.y === 'number'}
					{@const pctX = (holotableStatsTarget.x / 1600) * 100}
					{@const pctY = (holotableStatsTarget.y / 900) * 100}
					<div
						class="tw-absolute"
						style="left: {pctX}%; top: {pctY}%; transform-style: preserve-3d;"
					>
						<div
							class="tw-flex tw-flex-col tw-items-center"
							style="transform: translate3d(-50%, -100%, 0) rotateX(-55deg); transform-origin: bottom center; will-change: transform;"
						>
							<div
								class="tw-mb-2 tw-flex tw-flex-col tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-[#00f0ff]/40 tw-bg-[#020202]/85 tw-p-3 tw-backdrop-blur-xl tw-shadow-[0_8px_32px_rgba(0,240,255,0.2)]"
							>
								<span
									class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff]"
									>{holotableStatsTarget.name || 'UNIT_ID'}</span
								>
							</div>

							<div
								class="tw-h-16 tw-w-[2px] tw-bg-gradient-to-t tw-from-[#00f0ff] tw-to-transparent tw-opacity-60"
							></div>
						</div>
					</div>
				{/if}
			</div>
		</div>
</div>

<style>
	@keyframes dash-flow-draft {
		to {
			stroke-dashoffset: -56;
		}
	}

	.route-draft-pulse {
		stroke-dasharray: 8 6;
		animation: dash-flow-draft 1.6s linear infinite;
	}

	.route-draft-pulse--slow {
		animation-duration: 2.2s;
	}
</style>
