# Workflow: CDO — Fix Skill Tree Viewport Lock

**Owner**: Antigravity (Frontend)
**Priority**: P2 — MEDIUM
**Persona Context**: Chief Design Officer (CDO)

## Objective
The Player Skill Tree page (`src/routes/(app)/player/skill-tree/+page.svelte`) uses `tw-min-h-screen` on its root element instead of the mandated `tw-h-[100dvh]` App-like Viewport Flow. This violates the Nexus Command UI layout rules and can cause double-scrollbar issues on certain mobile devices.

## Step 1: Fix Root Container
- **File**: `src/routes/(app)/player/skill-tree/+page.svelte`
- **Target**: Line 94 — `class="pd-page-root player-dossier-root st-page tw-min-h-screen ..."`
- **Fix**: Replace `tw-min-h-screen` with `tw-h-[100dvh]`. Add `tw-overflow-hidden` to the root, and ensure the inner `pd-content-wrap` div uses `tw-overflow-y-auto tw-flex-1 tw-min-h-0` to enable internal scrolling without the browser's outer scrollbar.

## Step 2: Verify CSS Grid Flow
- The `.st-bento` grid uses `align-items: start` — verify this still works correctly inside the new `100dvh` constraint. The secondary sidecar column (`clamp(14rem, 22vw, 22rem)`) should continue to function correctly.

## Step 3: Verification
- Run `npm run check` — 0 errors.
- Visual browser check to confirm:
  - No double scrollbar on desktop
  - Skill Tree Arena and HUD remain properly positioned
  - Mobile responsive collapse (`@media (max-width: 640px)`) still works
