<!-- TacticalArena.svelte -->
<!-- ============================================================================= -->
<!-- SSTRACKER TACTICAL COGNITIVE ARENA (Svelte 5 UI) -->
<!-- High-fidelity interactive SVG tactical simulator implementing the custom -->
<!-- route editing cursor, right-click context menu, and position-tagged hostiles. -->
<!-- Guaranteed 90-degree Atompunk corners and modular layouts. -->
<!-- ============================================================================= -->

<script lang="ts">
  import TacticalPitchBoard from './grid/TacticalPitchBoard.svelte';
  import MistakeResetOverlay from '../tactical/MistakeResetOverlay.svelte';

  let { model, warRoomTool, isHalfField = false } = $props<{
    model?: any;
    warRoomTool?: any;
    isHalfField?: boolean;
  }>();
</script>

<svelte:window
  onpointermove={(e) => model?.handlePointerMove?.(e)}
  onpointerup={(e) => model?.handlePointerUp?.(e)}
  onpointercancel={(e) => model?.handlePointerCancel?.(e)}
/>

<div class="tw-relative tw-w-full tw-h-full tw-bg-[#0a0a0a] tw-overflow-hidden">
  {#if model}
    <TacticalPitchBoard
      bind:pitchSvgEl={model.pitchSvgEl}
      warRoomTool={model.activeTool || warRoomTool}
      {isHalfField}
      showLabels={model.showLabels}
      draggingPlayer={model.draggingPlayer}
      activeDragTrail={model.activeDragTrail}
      trailString={model.trailString}
      dragTrailBloomColor={model.dragTrailBloomColor}
      routesLive={model.routesLive}
      routePathD={model.routePathD}
      selectedRouteId={model.selectedRouteId}
      simulatorTime={model.simulator?.currentTime ?? 0}
      simulatorIsPlaying={model.simulator?.isPlaying ?? false}
      onRouteStrokePointerDown={model.input?.onRouteStrokePointerDown}
      onAnchorDown={model.input?.onAnchorDown}
      routingActive={model.routingActive}
      routeDraft={model.routeDraft}
      allPitchTokens={model.allPitchTokens}
      hoveredDiscId={model.hoveredDiscId}
      focusedPlayerId={model.focusedPlayerId}
      ringColor={model.ringColor}
      simChargePlayerIds={model.simChargePlayerIds}
      startDrag={model.input?.startDrag}
      bumpRouteDelay={model.bumpRouteDelay}
      allRouteMarkerColors={model.allRouteMarkerColors}
      onPitchPointerDown={model.input?.onPitchPointerDown}
      onPitchPointerUpClearLongPress={model.onPitchPointerUpClearLongPress}
      onPitchMouseLeave={model.input?.onPitchMouseLeave}
      onPitchContextMenu={model.onPitchContextMenu}
      onTokenContextMenu={model.onTokenContextMenu}
      handleSvgClick={model.handleSvgClick}
      setHoveredRouteId={model.setHoveredRouteId}
      setHoveredDiscId={model.setHoveredDiscId}
      setFocusedPlayerId={model.setFocusedPlayerId}
      showAnchorsFor={model.showAnchorsFor}
      radialOpen={model.radial?.radialOpen}
      radialCx={model.radial?.radialCx}
      radialCy={model.radial?.radialCy}
      hubPop={model.radial?.hubPop}
      radialAllSlots={model.radial?.radialAllSlots}
      hubHoveredKey={model.radial?.hubHoveredKey}
      hubCenterLabel={model.radial?.hubCenterLabel}
      routeContextMenuOpen={model.routeContextMenuOpen}
      routeContextMenuPos={model.routeContextMenuPos}
      routeContextMenuTargetId={model.routeContextMenuTargetId}
      onRouteContextMenu={model.onRouteContextMenu}
      onDeleteRoute={(id: string) => model.deleteRoute(id)}
    />

    <MistakeResetOverlay
      bind:isMistakeActive={model.isMistakeActive}
      onReset={() => model.executeResetRitual()}
    />
  {/if}
</div>
