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

<div
	class="tw-relative tw-flex tw-h-full tw-w-full tw-min-h-0 tw-min-w-0 tw-items-center tw-justify-center tw-overflow-visible"
>
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-40 tw-bg-[linear-gradient(rgba(255,0,60,0.02)_50%,transparent_50%)] tw-bg-[length:100%_4px] tw-animate-[scanlines_10s_linear_infinite]"
	></div>
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-40 tw-bg-[radial-gradient(circle_at_center,transparent_40%,#020202_100%)]"
	></div>

	<div
		class="tw-relative tw-flex tw-h-full tw-min-h-0 tw-w-full tw-flex-1 tw-items-center tw-justify-center"
	>
		<div
			class="tg-holotable-stage tw-pointer-events-auto tw-relative tw-z-10 tw-mx-auto tw-aspect-[1600/900] tw-w-full tw-max-w-full tw-min-h-0 tw-overflow-visible"
			style="max-height: 100%; transition: transform 0.8s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.8s ease; transform-origin: center center; transform-style: preserve-3d; transform: {isHolotableMode
				? 'rotateX(55deg) scale(0.9) translateY(10%)'
				: 'rotateX(0deg) scale(1) translateY(0)'};{isHolotableMode
				? ' box-shadow: 0 100px 200px -50px rgba(0,240,255,0.15);'
				: ''}"
		>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<svg
				bind:this={pitchSvgEl}
				id="tactical-pitch"
				class="tw-absolute tw-inset-0 tw-z-[100] tw-h-full tw-w-full tw-touch-none tw-select-none tw-isolate {warRoomTool === 'ROUTE' ? 'tw-cursor-crosshair' : 'tw-cursor-default'}"
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

			{#if draggingPlayer && activeDragTrail.length >= 2 && trailString}
				<polyline
					points={trailString}
					fill="none"
					stroke={dragTrailBloomColor}
					stroke-width="6"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity="0.9"
					filter="url(#premium-neon)"
					pointer-events="none"
				/>
				<polyline
					points={trailString}
					fill="none"
					stroke="#ffffff"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity="1"
					pointer-events="none"
				/>
			{/if}

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

			{#each routesLive as route (route.id)}
				{#if route.bindPlayerId}
					<GridRoute {route} renderLayer="ghost" timelineMs={simulatorTime} />
				{/if}
			{/each}

			{#each allPitchTokens as player (player.id)}
				<GridEntity
					{player}
					isHovered={hoveredDiscId === player.id}
					isSelected={focusedPlayerId === player.id}
					ringStroke={ringColor(player)}
					charging={simulatorIsPlaying && simChargePlayerIds.includes(player.id)}
					timelineMs={simulatorTime}
					{warRoomTool}
					onSelect={() => setFocusedPlayerId(player.id)}
					onPointerDown={(e) => {
						e.stopPropagation();
						startDrag(e, player);
					}}
					onMouseEnter={() => setHoveredDiscId(player.id)}
					onMouseLeave={() => setHoveredDiscId(null)}
				/>
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

			{#if !draggingPlayer && activeDragTrail.length >= 2 && trailString}
				<polyline
					points={trailString}
					fill="none"
					stroke={dragTrailBloomColor}
					stroke-width="6"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity="0.9"
					filter="url(#premium-neon)"
					pointer-events="none"
				/>
				<polyline
					points={trailString}
					fill="none"
					stroke="#ffffff"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity="1"
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

			<div class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-50">
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
</div>
