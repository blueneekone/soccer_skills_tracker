---
name: svelte5-deep-proxy-unboxing
description: Repair Svelte 5 deep proxy leakage and prevent infinite reactivity loops in data-dense analytics charting components.
---

# ⚙️ SSTracker Svelte 5 Deep Proxy Unboxing & Chart.js Integration

@jules, act as our joint Lead Frontend & UX Architect and Chief Software Architect (CSA). Your objective is to audit, patch, and stabilize all client-side data visualization and charting components across the SSTracker workspace to ensure that raw Svelte 5 reactive proxies never leak across third-party library boundaries.

### 🛡️ Critical Architectural Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No single component lifecycle hook or update method may exceed 80 lines. Extract data transformation or series calculation methods into localized pure JavaScript helper utilities.
2. **Defensive Hydration (B815 Rule)**: All data-binding effects and Firestore listeners must verify authentication state before execution: `if (!db || !authStore.isAuthenticated) return;`.
3. **Pessimistic Definition of Done**: The build must compile with exactly 0 Svelte compiler warnings and 0 TypeScript "any" type violations. All tests must pass with 100% green status; skipped assertions are strictly banned.

### 🛠️ Execution Sequence & Targets

- **Task 1: Isolate Deep Proxy Boundaries via `$state.snapshot`**
  * Targets: `src/lib/components/hud/VanguardPrismChart.svelte`, `src/routes/(app)/director/dashboard/DirectorAnalyticsCharts.svelte`, and `src/routes/(app)/coach/dashboard/CoachTeamXpVelocityChart.svelte`
  * Action: Locate the dataset injections passed to Chart.js. Before passing any stateful array, team metrics, or player telemetry, unbox the Svelte 5 state proxy completely using `$state.snapshot()` to extract a clean, static, non-reactive JSON structure:
    ```typescript
    const unboxedDataset = $state.snapshot(reactiveTelemetryArray);
    ```

- **Task 2: Implement the Immutable Handoff & Cleanup Lifecycle**
  * Action: Inside the Svelte 5 `$effect` or `onMount` block representing the chart instance:
    1. Ensure the canvas context is validated.
    2. Explicitly call `.destroy()` on any existing stale `Chart` instance before initializing a new one to prevent rendering overlaps and memory leaks.
    3. Return a clean destructor function from the `$effect` closure to dispose of the chart and clear event listeners upon component unmount:
       ```typescript
       return () => {
         if (chartInstance) {
           chartInstance.destroy();
           chartInstance = null;
         }
       };
       ```

- **Task 3: Optimize Static Series with `$state.raw`**
  * Action: Scan files handling bulky, immutable historical telemetry grids or static weather thresholds. Convert them from standard `$state` to Svelte’s performance-optimized `$state.raw()` to prevent unnecessary proxy wrappers and speed up rendering.

### 🚦 Test & Handover

1. Create a unit test inside `src/routes/(app)/__tests__/dashboardVisuals.test.ts` using Vitest and Svelte Testing Library to assert that changing the reactive metrics prop successfully triggers a chart re-instantiation with the unboxed plain object without throwing proxy exceptions.
2. Run `pnpm run check && pnpm run build` to verify Svelte 5 compilation and static SSR output.
3. Commit with message: `fix(frontend): unbox svelte 5 deep proxies via state.snapshot before charting` and push to 'dev'.
