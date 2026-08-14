# JULES PIPELINE: PLAYER OS — BLANK PAGE FIX & UI/UX RECOVERY
## Role: Lead UI/UX Architect + Svelte 5 Debugger
## Mission: Fix blank-page rendering in Player OS and enforce Nuclear Americana design system.

### CRITICAL CONTEXT:
The previous Jules UI/UX sprint produced **blank pages** or unverified states for Player OS.
This means either:
1. A Svelte 5 reactivity crash (`$effect` infinite loop or missing `untrack()`)
2. A missing import or broken component reference
3. A hydration guard (`B815`) blocking rendering when auth state isn't ready
4. A broken `+page.svelte` or gamification component (Vanguard Prism, Dopamine Engine) that throws during SSR/CSR

You MUST diagnose and fix the root cause before doing any cosmetic work.

### MANDATORY DIAGNOSTIC STEPS:
1. Run `pnpm run check` and record ALL Svelte compiler errors/warnings for files under `src/routes/(app)/player/`.
2. Open every `+page.svelte` under `src/routes/(app)/player/` (dashboard, armory, intake, media, proving-grounds, settings, skill-tree, tracker, waivers, workout) and verify:
   - No `$effect` contains `goto()` without `untrack()` wrapping.
   - No component import is missing or points to a deleted file.
   - The B815 hydration guard (`if (!db || !authStore.isAuthenticated) return`) is present but does NOT block initial render — it should gate Firestore calls, not the entire template.
   - Dynamic canvas / Chart.js / SVG radar components clean up gracefully on unmount.
3. Check `src/lib/components/player/` for any missing runes or syntax errors.

### COMPONENT TARGETS:
- `src/routes/(app)/player/dashboard/+page.svelte`
- `src/routes/(app)/player/armory/+page.svelte`
- `src/routes/(app)/player/intake/+page.svelte`
- `src/routes/(app)/player/media/+page.svelte`
- `src/routes/(app)/player/proving-grounds/+page.svelte`
- `src/routes/(app)/player/settings/+page.svelte`
- `src/routes/(app)/player/skill-tree/+page.svelte`
- `src/routes/(app)/player/tracker/+page.svelte`
- `src/routes/(app)/player/waivers/+page.svelte`
- `src/routes/(app)/player/workout/+page.svelte`
- `src/lib/components/player/` (all sub-components including VanguardCard, VanguardPrism, ProvingGrounds, ArmoryDashboard, MediaVault)

### UI/UX ENFORCEMENT (after blank-page fix):
1. `tw-text-[#daff0a]` (Nuclear Yellow) for XP meters, streak rings, active skill tree nodes, radar polygon strokes, and biometric gauges.
2. `tw-text-[#14b8a6]` (Data Cyan) for technical readouts, trial scores, and stat counters with `font-mono`.
3. `tw-text-[#fbbf24]` (Action Gold) for the ONE primary CTA per viewport.
4. All panels: `tw-bg-[#0f172a]` with `tw-border-[#334155]`.
5. 12-column asymmetric Bento Grid (`lg:tw-col-span-8` / `lg:tw-col-span-4`).

### VERIFICATION:
1. `pnpm run check` must return 0 errors.
2. `pnpm run build` must succeed without crashes.
3. Every Player route must render visible content (not a blank page).

### COMMIT:
Commit with message: `fix(player-os): resolve blank-page rendering and enforce Nuclear Americana UI`
