---
name: tdd-core-system
description: Complete, unattended cloud VM blueprint to build, audit, and lock down Svelte 5 foundational elements, Bento grids, and universal UI design tokens.
---

# 🛰️ SSTracker Unified Audit & Feature Build: Core UI System & Shared Elements

@jules, act as our joint Lead Frontend & UX Architect and Chief Design Officer. You are instructed to execute the full functional and visual stabilization of the foundational shared UI elements. This file is our master design system contract.

Your build is gated by our strict **Pessimistic Definition of Done**: Svelte 5 compilation must yield 0 warnings, TypeScript must return 0 'any' violations, and all unit/visual tests must pass 100% green.

---

### 🛡️ Part 1: Global Visual Regulations (Non-Negotiable)

1. **The Spacing Law**: The gap between Bento cards and neighboring components must never drop below 12px or `clamp(12px, 2vw, 24px)`.
2. **The Margin Law**: All page templates must enforce a minimum of `tw-p-6` or `clamp(16px, 3vw, 24px)` outer boundary padding.
3. **The min-width: 0 Law (Anti-Clipping)**: Every parent flex container and grid item containing text, stats, or charts must explicitly apply `tw-min-w-0` to force children to remain strictly bounded.
4. **Accessible Visual Cues (WCAG 2.2 AA)**: Any status or alert indicator (e.g. green/red success metrics) must include text labels and shape indicators alongside the color codes to ensure accessibility for red/green colorblind users.
5. **No Fixed Button Widths**: Action buttons must never use hardcoded widths (e.g. `tw-w-[120px]`). They must use auto-scaling horizontal padding (e.g. `tw-px-4 tw-py-2`) and support text wrapping (`tw-whitespace-normal`).

---

### 🎨 Part 2: Shared Component Specifications & Codebases

You must build, refactor, and verify the following foundational components under `src/lib/components/shared/` to ensure absolute platform cohesion:

#### 1. The Anti-Squish 12-Column Asymmetric Bento Grid
*   **Target Component**: `src/lib/components/shared/BentoContainer.svelte`
*   **Logical Specs**: Accepts an array of cards. Must use the approved fluid clamp columns:
    `style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"`
*   **Constraint**: Wrap children inside elements applying the `tw-min-w-0` rule to guarantee clean layout boundaries.

#### 2. The Universal Table Component
*   **Target Component**: `src/lib/components/shared/TelemetryTable.svelte`
*   **Logical Specs**: Restructure to use an opaque Navy Slate (`#0f172a`) background, strict 1px borders in Structural Grey (`#334155`), and a parent container supporting horizontal scroll (`tw-w-full tw-overflow-x-auto`).
*   **Typography**: Row headers and description cells must render in Switzer (`tw-font-sans`), while all numerical entries, timestamps, currency values, and technical IDs must use Geist Mono (`tw-font-mono`) to guarantee vertical alignment.

#### 3. Svelte 5 Reactivity Guardrails (CTO/CSA Mandate)
*   **Target Helper**: `src/lib/utils/stateHelpers.ts`
*   **Logical Specs**: 
    *   All array mutations must be refactored from legacy `.push()` over to immutable spreads: `array = [...array, newItem]`.
    *   Programmatic navigation redirects (`goto()`) occurring inside reactive `$effect` blocks must be wrapped inside `untrack()` closures: `untrack(() => goto('/correct-path'))`.
    *   Before passing reactive datasets or telemetry vectors to third-party graphing libraries (like Chart.js), you must strip Svelte's proxy envelopes using `$state.snapshot()`.
    *   Class methods bound as event handlers must be defined as arrow-function fields (e.g. `toggle = () => { this.active = !this.active; }`) to permanently bind `this`.

---

### 🚦 Part 3: Test & Handover

1. Run Svelte compilation diagnostics: `pnpm run check && pnpm run build`.
2. Run targeted Vitest unit tests: `pnpm test components/core`.
3. Execute the Playwright visual regression loops to confirm no layout overlapping or scrollbar clipping occurs at 1024px, 768px, and 375px viewports. Save visual snapshots under `/audit-artifacts/core/`.
4. Open the Pull Request only when the suite is 100% green with 0 compiler warnings.
