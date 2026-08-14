# JULES PIPELINE: PARENT OS — BLANK PAGE FIX & UI/UX RECOVERY
## Role: Lead UI/UX Architect + Svelte 5 Debugger
## Mission: Fix blank-page rendering in Parent OS and enforce Nuclear Americana design system.

### CRITICAL CONTEXT:
The previous Jules UI/UX sprint produced **blank pages** for the Parent OS verification screenshots.
This means either:
1. A Svelte 5 reactivity crash (`$effect` infinite loop or missing `untrack()`)
2. A missing import or broken component reference
3. A hydration guard (`B815`) blocking rendering when auth state isn't ready
4. A broken `+page.svelte` that throws during SSR/CSR

You MUST diagnose and fix the root cause before doing any cosmetic work.

### MANDATORY DIAGNOSTIC STEPS:
1. Run `pnpm run check` and record ALL Svelte compiler errors/warnings for files under `src/routes/(app)/parent/`.
2. Open every `+page.svelte` under `src/routes/(app)/parent/` (dashboard, compliance, household, log-workout, payments, trust-center, vpc) and verify:
   - No `$effect` contains `goto()` without `untrack()` wrapping.
   - No component import is missing or points to a deleted file.
   - The B815 hydration guard (`if (!db || !authStore.isAuthenticated) return`) is present but does NOT block initial render — it should gate Firestore calls, not the entire template.
3. Check `src/routes/(app)/parent/+layout.svelte` for any auth gate that might redirect or render nothing.
4. COPPA compliance: Verify the 15-minute "Car Ride Home Protocol" lockout timer uses `tw-text-[#f59e0b]` (Atompunk Amber) for the countdown display.

### COMPONENT TARGETS:
- `src/routes/(app)/parent/+layout.svelte`
- `src/routes/(app)/parent/dashboard/+page.svelte`
- `src/routes/(app)/parent/compliance/+page.svelte`
- `src/routes/(app)/parent/household/+page.svelte`
- `src/routes/(app)/parent/log-workout/+page.svelte`
- `src/routes/(app)/parent/payments/+page.svelte`
- `src/routes/(app)/parent/trust-center/+page.svelte`
- `src/routes/(app)/parent/vpc/+page.svelte`
- `src/lib/components/parent/` (all sub-components)

### UI/UX ENFORCEMENT (after blank-page fix):
1. `tw-text-[#daff0a]` (Nuclear Yellow) for telemetry highlights, progress bars, active streak markers.
2. `tw-text-[#14b8a6]` (Data Cyan) for technical readouts with `font-mono`.
3. `tw-text-[#fbbf24]` (Action Gold) for the ONE primary CTA per viewport.
4. `tw-text-[#f59e0b]` (Atompunk Amber) for system warnings, lockout notices, and the Car Ride Home Protocol countdown.
5. All panels: `tw-bg-[#0f172a]` with `tw-border-[#334155]`.
6. 12-column asymmetric Bento Grid (`lg:tw-col-span-8` / `lg:tw-col-span-4`).

### VERIFICATION:
1. `pnpm run check` must return 0 errors.
2. `pnpm run build` must succeed without crashes.
3. Every Parent route must render visible content (not a blank page).

### COMMIT:
Commit with message: `fix(parent-os): resolve blank-page rendering and enforce Nuclear Americana UI`
