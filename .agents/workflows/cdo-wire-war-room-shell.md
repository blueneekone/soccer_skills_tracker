# Workflow: CDO — Wire Coach OS Tron War Room Shell

**Owner**: Antigravity (Frontend)
**Priority**: P1 — HIGH / FEATURE GAP
**Persona Context**: Chief Design Officer (CDO)

## Objective
The Coach OS War Room (`src/routes/(app)/coach/war-room/+page.svelte`) is a near-empty 1,633-byte shell. The `CoachTacticalEngine.svelte.ts` Brain exists (6.5KB) but the full "Tron War Room" HTML5 spatial drill designer is not wired to the shell. This is a ROADMAP-checked Epic 3 feature.

## Current State
- `+page.svelte`: ~1,600 bytes — blank shell
- `CoachTacticalEngine.svelte.ts`: exists, has drag state and element tracking
- `src/lib/components/coach/tactical/`: contains `TacticalArena.svelte`, `TacticalGrid.svelte`, `TacticalHUD.svelte`, `TacticalContextMenu.svelte`

## Step 1: Audit Existing Tactical Components
- Read `TacticalArena.svelte`, `TacticalGrid.svelte`, `TacticalHUD.svelte`, `CoachTacticalEngine.svelte.ts` to understand what props/state they expect.
- Identify what's missing: does the SVG canvas implement `getScreenCTM().inverse()` CTM coordinate math per the `html5-spatial-svg-math` skill?

## Step 2: Wire the Shell
- **File**: `src/routes/(app)/coach/war-room/+page.svelte`
- **Task**: Rewrite the shell to properly import and mount:
  - `CoachTacticalEngine` (Brain) — instantiated at module level
  - `TacticalArena` (Glass) — the SVG canvas with the Tron aesthetic
  - `TacticalHUD` (HUD) — controls, player discs, context menus
- Apply `tw-h-[100dvh]` viewport lock with `tw-flex tw-flex-col tw-overflow-hidden`

## Step 3: Enforce Tron War Room Aesthetic (html5-spatial-svg-math skill)
Per the `html5-spatial-svg-math` skill, the SVG canvas MUST have:
- **Vantablack Identity Discs**: `fill="#000000"` with `stroke="#14b8a6"` for player tokens
- **neonBloom SVG Filter**: inject this exact filter inside `<defs>`:
  ```xml
  <filter id="neonBloom" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
    <feMerge>
      <feMergeNode in="blur2" />
      <feMergeNode in="blur1" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
  ```
- **CTM Coordinate Math**: All drag events must use `svgElement.createSVGPoint()` + `matrixTransform(svgElement.getScreenCTM().inverse())` — NOT raw `clientX/clientY`
- **viewBox**: `"0 0 1200 800"` with `preserveAspectRatio="xMidYMid slice"`
- **Bounding Math**: Clamp all dragged element positions to `[0, 1200]` x `[0, 800]` before updating `$state`

## Step 4: Verification
- Run `npm run check` — 0 errors
- Visual confirmation that dragging a player disc on the SVG field uses correct coordinates and doesn't "jump" to wrong positions
- Confirm `neonBloom` glow filter renders on player disc strokes
