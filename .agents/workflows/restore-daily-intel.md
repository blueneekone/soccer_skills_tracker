---
description: P1 — Restore the Coach OS Daily Intel page using the 12-column asymmetric Bento Grid and strict Vanguard Trinity Pattern.
---

# Workflow: Restore Coach Daily Intel

**Priority:** P1 ??
**Rule Enforced:** GEMINI.md §3 — "All UI elements must strictly adhere to the Nuclear Americana Tech Noir design system. You must utilize the 60-30-10 palette... and rigid asymmetric Bento Grid layouts."

---

## Context
The \daily-intel\ page for the Coach persona was inadvertently deleted during the previous refactoring cycle. It needs to be restored to maintain the Coach OS architectural requirements and gamification metrics layout.

## Execution Steps

### 1. Create the Shell (+page.svelte)
- **Location:** \src/routes/(app)/coach/daily-intel/+page.svelte\
- **Action:** Create file.
- **Details:** The Shell file should serve as a strict Z0 wrapper rendering the Daily Intel Engine, HUD, and Arena. Do not put inline logic here.

### 2. Create the Brain (DailyIntelEngine.svelte.ts)
- **Location:** \src/routes/(app)/coach/daily-intel/DailyIntelEngine.svelte.ts\
- **Action:** Create file.
- **Details:** Manage hydration of team telemetry and metrics. Ensure it leverages \isFirestoreReady()\ from \irestoreGuard.ts\ if fetching any data.

### 3. Create the HUD (DailyIntelHUD.svelte)
- **Location:** \src/routes/(app)/coach/daily-intel/DailyIntelHUD.svelte\
- **Action:** Create file.
- **Details:** Render the top rail navigation and persona-specific actions. Ensure NO gamification chamfers or Action Gold CTAs are used, adhering to the Coach UI guidelines.

### 4. Create the Arena (DailyIntelArena.svelte)
- **Location:** \src/routes/(app)/coach/daily-intel/DailyIntelArena.svelte\
- **Action:** Create file.
- **Details:** Construct the data presentation using the 12-column asymmetric Bento Grid (e.g., 8-col Primary, 4-col Sidecar) and fluid clamp math for anti-squish. Utilize Geist Mono for numerical data and apply strict 90-degree corners on core layout panels.

### 5. Update Navigation Routes
- **Location:** \src/lib/coach/logistics/CoachTeamRosterPanel.svelte\ (or similar navigation hubs)
- **Action:** Verify/Modify file.
- **Details:** Ensure links point back to \/coach/daily-intel\ appropriately.

### 6. Verification
- Run \
pm run check\ to ensure zero Svelte 5 compilation or TypeScript typing errors.
- Ensure all created files are below the 80-line limit per function/block constraint.
