<script>
	import TacticalPitchBoard from './grid/TacticalPitchBoard.svelte';
	/** @typedef {import('./TacticalEngine.svelte.ts').TacticalWarRoomModel} TacticalWarRoomModel */

	/** @type {{ model: TacticalWarRoomModel; warRoomTool: 'DRAG' | 'ROUTE' }} */
	let { model, warRoomTool } = $props();
</script>

<!-- Window-level pointer stream: drag/route gestures survive leaving the SVG viewport. -->
<svelte:window
	onpointermove={model.handlePointerMove}
	onpointerup={model.handlePointerUp}
	onpointercancel={model.handlePointerCancel}
/>

<!--
  Pure SVG presentation layer — fills the fixed viewport.
  overflow-visible on the inner wrappers so the radial hub and route anchors
  can paint outside the board boundary without being clipped.
-->
<div class="tw-absolute tw-inset-0 tw-overflow-hidden">
	<div
		class="tw-absolute tw-inset-4 tw-flex tw-min-h-0 tw-min-w-0 tw-items-center tw-justify-center tw-overflow-visible md:tw-inset-8"
	>
		<div
			class="tw-relative tw-h-full tw-w-full tw-min-h-0 tw-min-w-0 tw-overflow-visible"
			style="perspective: 2000px;"
		>
			<TacticalPitchBoard
				bind:pitchSvgEl={model.pitchSvgEl}
				isHolotableMode={model.isHolotableMode}
				{warRoomTool}
				showLabels={model.showLabels}
				draggingPlayer={model.draggingPlayer}
				activeDragTrail={model.activeDragTrail}
				trailString={model.trailString}
				dragTrailBloomColor={model.dragTrailBloomColor}
				routesLive={model.routesLive}
				routePathD={model.routePathD}
				selectedRouteId={model.selectedRouteId}
				simulatorTime={model.simulator.currentTime}
				simulatorIsPlaying={model.simulator.isPlaying}
				onRouteStrokePointerDown={model.input.onRouteStrokePointerDown}
				onAnchorDown={model.input.onAnchorDown}
				routingActive={model.routingActive}
				routeDraft={model.routeDraft}
				allPitchTokens={model.kineticPitchTokens}
				hoveredDiscId={model.hoveredDiscId}
				focusedPlayerId={model.focusedPlayerId}
				ringColor={model.ringColor}
				simChargePlayerIds={model.simChargePlayerIds}
				startDrag={model.input.startDrag}
				bumpRouteDelay={model.bumpRouteDelay}
				allRouteMarkerColors={model.allRouteMarkerColors}
				onPitchPointerDown={model.handlePointerDown}
				onPitchPointerUpClearLongPress={model.onPitchPointerUpClearLongPress}
				onPitchMouseLeave={model.input.onPitchMouseLeave}
				onPitchContextMenu={model.onPitchContextMenu}
				onTokenContextMenu={model.onTokenContextMenu}
				handleSvgClick={model.handleSvgClick}
				setHoveredRouteId={model.setHoveredRouteId}
				setHoveredDiscId={model.setHoveredDiscId}
				setFocusedPlayerId={model.setFocusedPlayerId}
				showAnchorsFor={model.showAnchorsFor}
				radialOpen={model.radial.radialOpen}
				radialCx={model.radial.radialCx}
				radialCy={model.radial.radialCy}
				hubPop={model.radial.hubPop}
				radialAllSlots={model.radial.radialAllSlots}
				hubHoveredKey={model.radial.hubHoveredKey}
				hubCenterLabel={model.radial.hubCenterLabel}
				isLoadingCartridge={model.simulator.isLoadingCartridge}
				cartridgeSweepEpoch={model.simulator.cartridgeSweepEpoch}
			/>
		</div>
	</div>
</div>
