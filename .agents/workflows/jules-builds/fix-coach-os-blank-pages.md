# JULES PIPELINE: COACH OS — BLANK PAGE FIX & UI/UX RECOVERY
## Role: Lead UI/UX Architect + Svelte 5 Debugger
## Mission: Fix blank-page rendering in Coach OS and enforce Nuclear Americana design system.

### CRITICAL CONTEXT:
The previous Jules UI/UX sprint produced **blank pages** for the Coach OS verification screenshots.
This means either:
1. A Svelte 5 reactivity crash (`$effect` infinite loop or missing `untrack()`)
2. A missing import or broken component reference
3. A hydration guard (`B815`) blocking rendering when auth state isn't ready
4. A broken `+page.svelte` that throws during SSR/CSR

You MUST diagnose and fix the root cause before doing any cosmetic work.

### MANDATORY DIAGNOSTIC STEPS:
1. Run `pnpm run check` and record ALL Svelte compiler errors/warnings for files under `src/routes/(app)/coach/`.
2. Open every `+page.svelte` under `src/routes/(app)/coach/` (dashboard, assignments, daily-intel, drills, forge, logistics, match-day, scouting, tactical, tactics-board, trial-builder, war-room) and verify:
   - No `$effect` contains `goto()` without `untrack()` wrapping.
   - No component import is missing or points to a deleted file.
   - The B815 hydration guard (`if (!db || !authStore.isAuthenticated) return`) is present but does NOT block initial render — it should gate Firestore calls, not the entire template.
3. Check `src/routes/(app)/coach/+layout.svelte` for any auth gate that might redirect or render nothing.

### COMPONENT TARGETS:
- `src/routes/(app)/coach/+layout.svelte`
- `src/routes/(app)/coach/dashboard/+page.svelte`
- `src/routes/(app)/coach/assignments/+page.svelte`
- `src/routes/(app)/coach/daily-intel/+page.svelte`
- `src/routes/(app)/coach/drills/+page.svelte`
- `src/routes/(app)/coach/forge/+page.svelte`
- `src/routes/(app)/coach/logistics/+page.svelte`
- `src/routes/(app)/coach/match-day/+page.svelte`
- `src/routes/(app)/coach/scouting/+page.svelte`
- `src/routes/(app)/coach/tactical/+page.svelte`
- `src/routes/(app)/coach/tactics-board/+page.svelte`
- `src/routes/(app)/coach/trial-builder/+page.svelte`
- `src/routes/(app)/coach/war-room/+page.svelte`
- `src/lib/components/coach/` (all sub-components)
- `src/lib/coach/` (all Svelte files)

### UI/UX ENFORCEMENT (after blank-page fix):
1. `tw-text-[#daff0a]` (Nuclear Yellow) for telemetry highlights, progress bars, active streak markers.
2. `tw-text-[#14b8a6]` (Data Cyan) for technical readouts with `font-mono`.
3. `tw-text-[#fbbf24]` (Action Gold) for the ONE primary CTA per viewport.
4. All panels: `tw-bg-[#0f172a]` with `tw-border-[#334155]`.
5. 12-column asymmetric Bento Grid (`lg:tw-col-span-8` / `lg:tw-col-span-4`).

### VERIFICATION:
1. `pnpm run check` must return 0 errors.
2. `pnpm run build` must succeed without crashes.
3. Every Coach route must render visible content (not a blank page).

### COMMIT:
Commit with message: `fix(coach-os): resolve blank-page rendering and enforce Nuclear Americana UI`
