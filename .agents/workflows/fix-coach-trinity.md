---
description: P1 — Extract the Coach OS Dashboard monolith into the Vanguard Trinity Pattern (Shell, Brain, Glass, HUD).
---

# Workflow: Fix Coach OS Dashboard Trinity Pattern

**Priority:** P1 ??
**Rule Enforced:** GEMINI.md §2 — "Monolithic files are forbidden. Every interactive screen must fracture into four cooperating files: The Shell (+page.svelte), The Brain (*Engine.svelte.ts), The Glass (*Arena.svelte), and The HUD (*HUD.svelte)."

---

## Context
The current Coach Dashboard src/routes/(app)/coach/dashboard/+page.svelte has ballooned to 368 lines. This violates the 80-line maximum rule and the required architecture pattern.

## Execution Steps

### 1. Create the Brain (CoachDashboardEngine.svelte.ts)
- **Location:** src/routes/(app)/coach/dashboard/CoachDashboardEngine.svelte.ts
- **Action:** Create file.
- **Details:** Extract all the state logic, derived runes (role, isCleared, userEmail, clearanceStep), and context definitions out of +page.svelte. Ensure no function exceeds 80 lines.

### 2. Create the HUD (CoachDashboardHUD.svelte)
- **Location:** src/routes/(app)/coach/dashboard/CoachDashboardHUD.svelte
- **Action:** Create file.
- **Details:** Move the header, navigation, and top-level user indicators (like WeatherHub and CheckrEmbed) into this module.

### 3. Create the Glass (CoachDashboardArena.svelte)
- **Location:** src/routes/(app)/coach/dashboard/CoachDashboardArena.svelte
- **Action:** Create file.
- **Details:** Move the core visualization and operational components (SquadMatrix, WarRoomGrid) into this file. Ensure the grid uses the 12-column asymmetric Bento Grid (grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));).

### 4. Refactor the Shell (+page.svelte)
- **Location:** src/routes/(app)/coach/dashboard/+page.svelte
- **Action:** Modify file.
- **Details:** Strip all inline logic. Import CoachDashboardEngine.svelte.ts, CoachDashboardHUD.svelte, and CoachDashboardArena.svelte. The +page.svelte should act solely as the Z0 wrapper orchestrating the Trinity.

### 5. Verification
- Run \
pm run check\ to ensure zero Svelte 5 compilation or TypeScript typing errors.
- Ensure all created files are below the 80-line limit per function/block constraint.
