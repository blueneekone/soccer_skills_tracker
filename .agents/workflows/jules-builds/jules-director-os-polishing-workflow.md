# =============================================================================
# SSTRACKER ENTERPRISE: DIRECTOR OS PREMIUM POLISHING JULES WORKFLOW
# =============================================================================
# This master-level workflow file directs Google Jules to overhaul, refine,
# and visually standardize the Director OS dashboard to match the ultra-premium,
# multi-billion-dollar "Tactical SIEM" design standard.
# =============================================================================

# 🏛️ 1. THE DIRECTOR OS ARCHITECTURAL GAPS
The Director OS is the commercial crown jewel of sstracker.app. Currently, it exhibits visual clutter and structural inconsistencies that break our premium aesthetic:
1.  **Missing Navigation Core:** The "Daily Intel" / "Dashboard Overview" button is missing from the absolute top of the sidebar navigation tree. It must be restored as the master starting view.
2.  **Layout Squishing & Spacing Scale Violations:** Multi-column panels, roster counters, and billing metrics are using standard unconstrained flex layouts, causing elements to squish or bleed across columns on smaller laptops.
3.  **Border Radius Violations (Director OS):** Some sections are improperly rendering rounded buttons and cards. Under our design protocol, the Director OS (Tactical SIEM) must enforce strict 90-degree corners on all layout panels, tables, and buttons to look like clinical-grade cockpit instrumentation.
4.  **Laggy Kinetic Transitions:** Component switching lacks instant tactile response. State transitions must be locked to a rapid 150ms-250ms window with subtle click dimming.

---

# 🤖 2. JULES STEP-BY-STEP EXECUTION ROADMAP
@jules, you must execute the following automated steps within your isolated cloud container to refine the Director OS:

## Step 1: Scan & Identify Navigation & Layout Targets
Locate and analyze the following target files:
*   `src/lib/components/navigation/DirectorSidebar.svelte` (or equivalent navigation sidebar)
*   `src/routes/(app)/director/dashboard/+page.svelte` (Master Director Dashboard)
*   `src/routes/(app)/director/billing/+page.svelte` (Billing & Stripe Panel)
*   `src/routes/(app)/director/roster/+page.svelte` (Roster/Importer View)

## Step 2: Implement the Premium Tactical SIEM Interface
Ensure your code changes comply with our strict platform rules:
1.  **The Master Navigation Node:** Place the **"Daily Intel"** button at the absolute top of the `DirectorSidebar.svelte` file. It must render in crisp Data Cyan (`#14b8a6`) with a subtle `#06b6d4` neon-bloom outline upon hover.
2.  **Enforce Anti-Squish Math:** Replace legacy flex layouts with a strict **12-column asymmetric Bento Grid**. Apply our fluid clamp math to the grid containers to absolutely prevent squishing:
    `style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"`
3.  **Strict 90-Degree Corners:** Locate and purge any rounded utility classes (`tw-rounded-lg`, `tw-rounded-xl`, `tw-rounded-24px`) from buttons, inputs, and panel cards. Enforce perfectly square `tw-rounded-none` borders.
4.  **100dvh Viewport Flow:** Force the root wrapper of the dashboard to transition to an App-like 100dvh Viewport Flow using CSS Grid `flex: 1 1 auto; min-height: 0` to prevent ugly double scrollbars on high-density displays.
5.  **Micro-Interactions:** Lock all hover, focus, and modal transition states to exactly `150ms`. Apply a subtle tactile scale click effect: `active:tw-scale-[0.98]`.
6.  **Typography Engine:** Enforce `Geist Mono` explicitly for all numerical metrics, subscription tiers, fee calculations, and transaction histories. Use `Switzer` for body descriptions and `Geist Sans` for headers.
7.  **The 80-Line Limit:** Ensure that any layout, routing, or event-handling functions you modify do not exceed the **80-line limit** per function.

## Step 3: Run Compilation and Local Visual Verification
Verify the visual cohesion of the refined dashboards:
```bash
pnpm run check
npx eslint --fix
pnpm playwright test tests/director-intel-perfection.spec.ts --project=chromium
```

---

# 🛡️ 3. PESSIMISTIC DEFINITION OF DONE & CIRCUIT BREAKERS
*   **Circuit Breaker:** You are capped at a maximum of **3 test-and-repair iterations**. If any visual regression or reactivity loop remains red on your 3rd run, revert all modified files back to their last known stable state, output the compile log, and exit immediately to protect our AI credits.
*   **Delivery Standard:** Your code must compile with exactly **0 errors and 0 warnings** before you open a Pull Request straight to `dev`.
