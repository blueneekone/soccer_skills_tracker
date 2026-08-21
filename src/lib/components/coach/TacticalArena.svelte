<!-- TacticalArena.svelte -->
<!-- ============================================================================= -->
<!-- SSTRACKER TACTICAL COGNITIVE ARENA (Svelte 5 UI) -->
<!-- High-fidelity interactive SVG tactical simulator implementing the custom -->
<!-- route editing cursor, right-click context menu, and position-tagged hostiles. -->
<!-- Guaranteed 90-degree Atompunk corners and modular layouts. -->
<!-- ============================================================================= -->

<script lang="ts">
  import { CoachTacticalEngine, type TacticalRoute, type TacticalHostile } from '../../services/coach/CoachTacticalEngine.svelte.js';
  import MistakeResetOverlay from '../tactical/MistakeResetOverlay.svelte';

  // Instantiate our reactive tactical engine
  let engine = new CoachTacticalEngine();
  let svgElement: SVGSVGElement;

  // Component local UI state variables
  let cursorMode = $state<'select' | 'player' | 'ball' | 'hostile'>('select');
  let selectedHostilePos = $state<'CB' | 'CDM' | 'LWB' | 'ST' | 'GK'>('CB');
  
  // Right-click context menu position and state
  let contextMenu = $state<{ x: number; y: number; routeId: string } | null>(null);

  // Define props that consumers pass in
  let { model, warRoomTool, isHalfField } = $props<{
    model?: any;
    warRoomTool?: any;
    isHalfField?: boolean;
  }>();

  // Dragging states for Bézier control points
  let activeDragPoint = $state<{ routeId: string } | null>(null);

  // SVG coordinate transformation handler (Guaranteed under 80 lines)
  function getSVGCoords(e: MouseEvent, svgElement: SVGSVGElement) {
    const rect = svgElement.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // Handle click on canvas (Guaranteed under 80 lines)
  function handleCanvasClick(e: MouseEvent, svgElement: SVGSVGElement) {
    // If right-clicked or context menu active, dismiss context menu
    if (contextMenu) {
      contextMenu = null;
      return;
    }

    const coords = getSVGCoords(e, svgElement);

    if (cursorMode === 'hostile') {
      engine.addHostile({
        id: `hostile-${Date.now()}`,
        position: selectedHostilePos,
        x: coords.x,
        y: coords.y
      });
    } else if (cursorMode === 'player' || cursorMode === 'ball') {
      // Create a direct path (start and end point)
      const newRoute: TacticalRoute = {
        id: `route-${Date.now()}`,
        type: cursorMode,
        points: [
          { x: coords.x - 50, y: coords.y },
          { x: coords.x + 50, y: coords.y }
        ],
        controlPoint: { x: coords.x, y: coords.y - 30 }, // Midpoint curve
        duration: 3.5
      };
      engine.addRoute(newRoute);
      cursorMode = 'select';
    }
  }

  // Handle right-click context menu on individual route path (Guaranteed under 80 lines)
  function handleRouteRightClick(e: MouseEvent, routeId: string) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      routeId
    };
  }

  // Delete individual route and clear context menu
  function performRouteDeletion() {
    if (contextMenu) {
      engine.deleteRoute(contextMenu.routeId);
      contextMenu = null;
    }
  }

  // Dragging Bézier curves (Guaranteed under 80 lines)
  function handleControlDrag(e: MouseEvent, svgElement: SVGSVGElement) {
    if (!activeDragPoint) return;
    const coords = getSVGCoords(e, svgElement);
    engine.updateRouteControlPoint(activeDragPoint.routeId, coords.x, coords.y);
  }

  function handleControlMouseUp() {
    activeDragPoint = null;
  }
</script>

<div class="tw-relative tw-w-full tw-h-full tw-bg-[#0a0a0a] tw-text-[#06b6d4] tw-p-6 tw-flex tw-flex-col tw-font-mono tw-border tw-border-slate-800">
  
  <!-- Controller Header (90-degree Atompunk HUD Grid) -->
  <header class="tw-flex tw-justify-between tw-items-center tw-border-b tw-border-slate-800 tw-pb-4 tw-mb-6">
    <div class="tw-flex tw-items-center tw-gap-3">
      <div class="tw-w-2.5 tw-h-2.5 tw-bg-[#06b6d4] tw-animate-pulse"></div>
      <span class="tw-text-xs tw-tracking-widest tw-font-bold tw-uppercase">COACH OS // TRON WAR ROOM CAD</span>
    </div>
    
    <!-- Mode Controls -->
    <div class="tw-flex tw-gap-2">
      <button 
        onclick={() => cursorMode = 'select'} 
        class="tw-px-3 tw-py-1.5 tw-text-xs tw-border tw-rounded-none tw-transition-colors {cursorMode === 'select' ? 'tw-bg-[#06b6d4] tw-text-[#0a0a0a] tw-border-[#06b6d4]' : 'tw-border-slate-700 tw-text-[#94a3b8]'}"
      >
        SELECT
      </button>
      <button 
        onclick={() => cursorMode = 'player'} 
        class="tw-px-3 tw-py-1.5 tw-text-xs tw-border tw-rounded-none tw-transition-colors {cursorMode === 'player' ? 'tw-bg-[#06b6d4] tw-text-[#0a0a0a] tw-border-[#06b6d4]' : 'tw-border-slate-700 tw-text-[#94a3b8]'}"
      >
        + PLAYER RUN
      </button>
      <button 
        onclick={() => cursorMode = 'ball'} 
        class="tw-px-3 tw-py-1.5 tw-text-xs tw-border tw-rounded-none tw-transition-colors {cursorMode === 'ball' ? 'tw-bg-[#06b6d4] tw-text-[#0a0a0a] tw-border-[#06b6d4]' : 'tw-border-slate-700 tw-text-[#94a3b8]'}"
      >
        + BALL PASS (DASHED)
      </button>
      <div class="tw-flex tw-items-center tw-border tw-border-slate-700 tw-px-2 tw-gap-1">
        <button 
          onclick={() => cursorMode = 'hostile'} 
          class="tw-text-xs tw-transition-colors {cursorMode === 'hostile' ? 'tw-text-[#fbbf24]' : 'tw-text-[#94a3b8]'}"
        >
          + OP DEPLOY:
        </button>
        <select 
          bind:value={selectedHostilePos} 
          class="tw-bg-[#0a0a0a] tw-text-[#fbbf24] tw-text-xs tw-outline-none tw-border-none"
        >
          <option value="CB">CB</option>
          <option value="CDM">CDM</option>
          <option value="LWB">LWB</option>
          <option value="ST">ST</option>
          <option value="GK">GK</option>
        </select>
      </div>
      <button 
        onclick={() => engine.triggerMistakeState()} 
        class="tw-border tw-border-[#ef4444] tw-text-[#ef4444] tw-px-3 tw-py-1.5 tw-text-xs hover:tw-bg-[#ef4444] hover:tw-text-[#0a0a0a] tw-transition-colors tw-rounded-none"
      >
        TEST MISTAKE
      </button>
      <button 
        onclick={() => engine.clearAll()} 
        class="tw-border tw-border-slate-700 tw-text-[#94a3b8] tw-px-3 tw-py-1.5 tw-text-xs hover:tw-bg-slate-800 tw-transition-colors tw-rounded-none"
      >
        CLEAR ALL
      </button>
    </div>
  </header>

  <!-- Interactive SVG Workspace -->
  <div class="tw-relative tw-w-full tw-h-[500px] tw-border tw-border-slate-800 tw-bg-[#050505]">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <svg
      bind:this={svgElement}
      class="tw-w-full tw-h-full tw-cursor-crosshair"
      onclick={(e) => handleCanvasClick(e, svgElement)}
      onmousemove={(e) => handleControlDrag(e, svgElement)}
      onmouseup={handleControlMouseUp}
    >
      <!-- Tactical Field Guideline Overlays (SIEM Spacing Grid) -->
      <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#1e293b" stroke-width="1" stroke-dasharray="4,4" />
      <circle cx="50%" cy="50%" r="70" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="4,4" />

      <!-- Render Vector Routes -->
      {#each engine.routes as route}
        <!-- Compute Quadratic Bézier curve using starting point, control point, and end point -->
        {@const start = route.points[0]}
        {@const end = route.points[1]}
        {@const ctrl = route.controlPoint || { x: (start.x + end.x)/2, y: (start.y + end.y)/2 }}
        {@const dPath = `M ${start.x} ${start.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`}

        <!-- Active Routing Path -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <path
          d={dPath}
          fill="none"
          stroke={route.type === 'ball' ? '#06b6d4' : '#10b981'}
          stroke-width="3.5"
          stroke-dasharray={route.type === 'ball' ? '8,8' : 'none'}
          class="tw-cursor-pointer hover:tw-stroke-[#fbbf24] tw-transition-colors"
          onclick={(e) => { e.stopPropagation(); engine.selectedRouteId = route.id; }}
          oncontextmenu={(e) => handleRouteRightClick(e, route.id)}
        />

        <!-- Render interactive drag anchors if the route is clicked and cursor is in select mode -->
        {#if engine.selectedRouteId === route.id && cursorMode === 'select'}
          <!-- Start point -->
          <circle cx={start.x} cy={start.y} r="5" fill="#10b981" />
          
          <!-- End point -->
          <circle cx={end.x} cy={end.y} r="5" fill="#ef4444" />

          <!-- Dynamic Curve Control Drag Anchor -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <circle
            cx={ctrl.x}
            cy={ctrl.y}
            r="8"
            fill="#fbbf24"
            class="tw-cursor-grab active:tw-cursor-grabbing"
            onmousedown={(e) => { e.stopPropagation(); activeDragPoint = { routeId: route.id }; }}
          />
          <line x1={start.x} y1={start.y} x2={ctrl.x} y2={ctrl.y} stroke="#fbbf24" stroke-width="1" stroke-dasharray="2,2" />
          <line x1={end.x} y1={end.y} x2={ctrl.x} y2={ctrl.y} stroke="#fbbf24" stroke-width="1" stroke-dasharray="2,2" />
        {/if}
      {/each}

      <!-- Render Hostiles with specialized position-acronym badges (Replacing generic numbers) -->
      {#each engine.hostiles as hostile}
        <g class="tw-cursor-pointer">
          <circle cx={hostile.x} cy={hostile.y} r="18" fill="#1e1e1e" stroke="#fbbf24" stroke-width="2" />
          <text
            x={hostile.x}
            y={hostile.y + 4}
            text-anchor="middle"
            fill="#fbbf24"
            class="tw-text-[10px] tw-font-bold tw-font-mono"
          >
            {hostile.position}
          </text>
        </g>
      {/each}
    </svg>

    <!-- HTML Right-Click Custom Context Menu -->
    {#if contextMenu}
      <div
        class="tw-absolute tw-bg-[#0a0a0a] tw-border tw-border-[#fbbf24] tw-p-1 tw-z-50 tw-flex tw-flex-col tw-shadow-lg"
        style="left: {contextMenu.x - 20}px; top: {contextMenu.y - 120}px;"
      >
        <button
          onclick={performRouteDeletion}
          class="tw-px-4 tw-py-2 tw-text-[10px] tw-font-bold tw-text-[#ef4444] hover:tw-bg-[#ef4444] hover:tw-text-black tw-transition-colors tw-rounded-none tw-text-left"
        >
          [ DELETE ROUTE ]
        </button>
      </div>
    {/if}

    <!-- Svelte 5 Custom Timing HUD Card (Bottom Right inside Canvas) -->
    {#if engine.selectedRouteId && cursorMode === 'select'}
      {@const selectedRoute = engine.routes.find(r => r.id === engine.selectedRouteId)}
      {#if selectedRoute}
        <div class="tw-absolute tw-bottom-4 tw-right-4 tw-bg-[#0a0a0a]/90 tw-border tw-border-slate-800 tw-p-4 tw-w-64 tw-z-40">
          <span class="tw-text-[10px] tw-text-[#94a3b8] tw-block tw-mb-1">VECTOR TIME CONTROLLER</span>
          <div class="tw-flex tw-justify-between tw-text-xs tw-text-[#06b6d4] tw-mb-2">
            <span>Route ID: {selectedRoute.id.slice(0, 8)}</span>
            <span>Duration: {selectedRoute.duration}s</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="10.0"
            step="0.5"
            value={selectedRoute.duration}
            oninput={(e) => engine.updateRouteTiming(selectedRoute.id, parseFloat((e.target as HTMLInputElement).value))}
            class="tw-w-full tw-accent-[#06b6d4] tw-cursor-pointer"
          />
        </div>
      {/if}
    {/if}

    <!-- Nest our custom mistake recovery and encouragement banner -->
    <MistakeResetOverlay
      bind:isMistakeActive={engine.isMistakeActive}
      onReset={() => engine.executeResetRitual()}
    />
  </div>
</div>
