# 🎨 SSTRACKER PLATFORM DESIGN, VIEWPORT KINETICS, AND ROUTING SPECIFICATION
**Target Audience:** Google Jules (asynchronous cloud vm agent)
**Scope:** Standalone page routing, layout geometry, micro-animations, and visual tokens.
**Goal:** Mathematically verify and lock down 100% of our frontend presentation layer.

---

### 🚀 PROMPT 19: SvelteKit Layout Routing Interceptor & Auth Gating (Epic 1)

```text
Task: Standalone TDD: SvelteKit Layout Routing & Hydration Gating

@jules, please implement and verify the global routing guards and layout hydration rules:

1. THE AUTHENTICATION WALL (src/routes/(app)/+layout.svelte)
- Edit the primary root layout. Ensure SvelteKit's routing logic strictly evaluates authenticated Firebase Custom JWT Claims.
- If the active session profile's custom claims are missing elevated roles (admin, global_admin, super_admin, commissioner, director, coach, parent), prevent page load and redirect unauthenticated visits immediately to the onboarding flow (/onboarding).

2. INFINITE LOOP PREVENTION
- Any programmatic redirects or routing commands (e.g., SvelteKit's goto) triggered inside Svelte 5 $effect blocks MUST be wrapped inside strict untrack() closures:
  $effect(() => {
    untrack(() => {
      if (!authStore.isAuthenticated) goto('/onboarding');
    });
  });

3. B815 DEFINITIVE HYDRATION
- Inject strict B815 early-return guards into the layout's root subscription logic to prevent catastrophic Quota Exceeded loops during client/server render cycles:
  if (!db || !authStore.isAuthenticated) return;

4. TDD SPECIFICATION
- Write 'src/routes/(app)/__tests__/layoutRoutingGuards.test.ts'.
- Mock an unauthenticated user session and assert SvelteKit is forced to route to /onboarding.
- Mock an authenticated session containing custom JWT claims and assert that routing resolves cleanly.

Run 'pnpm run check' and 'npx vitest run layoutRoutingGuards'. Once green, commit as 'feat: enforce zero-trust SvelteKit layout routing interceptors'.
```

---

### 🚀 PROMPT 20: Asymmetric Bento Grid & Typography Alignment (Epic 2)

```text
Task: Standalone TDD: Asymmetric Bento Grid & Typography Engine

@jules, please implement the fluid layout grids and micro-typography token rules across all dashboards:

1. ANTI-SQUISH BENTO GRIDS
- Locate the main container wrappers for all dashboard layouts (Admin, Director, Coach, Player, Parent, Fan, Commissioner).
- Remove all traditional, legacy flex layouts and static margin utilities.
- Enforce the strict 12-column asymmetric Bento Grid topology locked with fluid clamp math:
  style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"
- Ensure all flex children utilize 'tw-min-w-0' to forbid layout truncation or text bleeding on narrow viewports.

2. COLOR & CONTRAST TOKENS
- Enforce the 60-30-10 palette rules: 60% Void Black (#000000) and Navy Slate (#0f172a); 30% Structural Grey (#334155); 10% Data Cyan (#14b8a6) and Action Gold (#fbbf24).
- You are strictly forbidden from using any rgba() text opacities or Tailwind opacity modifiers (e.g., text-white/50) on dark backgrounds to prevent visual halation. All text must use exact hex codes:
  - Primary Text: #FAFAFA
  - Secondary Text: #D4D4D8
  - Tertiary/Icon: #A1A1AA

3. MICRO-TYPOGRAPHY
- Force Geist Mono for all telemetry data and numerical tables.
- Force Switzer for body copy (enforcing its x-height parameters).
- Force Geist Sans for primary section headers.

4. TDD SPECIFICATION
- Create 'src/lib/components/shell/__tests__/bentoGridCohesion.test.ts'.
- Assert that components render cleanly with zero CSS compilation errors and that no forbidden styling classes (such as text-white/50) exist on active elements.

Run 'pnpm run check' and 'npx vitest run bentoGridCohesion'. Once green, commit as 'style: enforce asymmetric Bento Grid and micro-typography tokens'.
```

---

### 🚀 PROMPT 21: Svelte 5 Kinetic Micro-Interactions & Viewport Locks (Epic 3)

```text
Task: Standalone TDD: Kinetic Micro-Interactions & Viewport Locks

@jules, please implement the viewport boundary controls and kinetic interaction states:

1. VIEWPORT MOUNT & LOCK
- Enforce a strict, app-like viewport constraint on the root shell element (.app-shell) using Svelte's global layouts.
- It must utilize 'tw-h-[100dvh]' and 'tw-flex-col'.
- Enforce 'tw-overflow-hidden' on parent wrappers of bento grids. All scrolling must be restricted to internal panelwells using 'tw-overflow-y-auto tw-flex-1 tw-min-h-0' to permanently eliminate double scrollbars.

2. KINETIC MICRO-INTERACTIONS
- Standardize all state transition kinetic velocities to a lightning-fast duration range of 150-250ms.
- All interactive button elements must feature tactile click feedback by applying a 1% active scale shrink (active:tw-scale-[0.98]).

3. Z4 FLOATING CHROME SECURITY
- Locate all dropdown menus, context popovers, and mobile navigation overlays.
- Enforce the strict Z4 Floating Chrome protocol: they must use a solid, opaque background (tw-bg-[#0B0F19]), a 1px structural border (tw-border-slate-800), and a high Z-index (tw-z-50).
- Transparent, translucent, or semi-transparent backgrounds on context elements are strictly forbidden. They must completely obscure any underlying data wells.

4. TDD SPECIFICATION
- Write 'src/lib/components/navigation/__tests__/viewportKineticCohesion.test.ts'.
- Assert that the root shell height maps exactly to the 100dvh bounding block.
- Assert that all dropdown overlays utilize absolute background opacity.

Run 'pnpm run check' and 'npx vitest run viewportKineticCohesion'. Once green, commit as 'feat: secure kinetic interactions and viewport locks'.
```
