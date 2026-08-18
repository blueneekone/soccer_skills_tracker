---
name: jules-visual-stabilization-v2
description: Headless multi-persona visual healing and design system lock for all 8 platform operating environments.
---

# 🎨 SSTracker Enterprise Visual Alignment & Layout Healing (CRO/CDO)

@jules, act as our Lead Frontend & UX Architect and Chief Design Officer. You are instructed to execute a complete visual stabilization across all Svelte 5 layout components. Your goal is to eliminate all padding inconsistencies, layout overlaps, text clipping, and responsive grid squishing across every persona interface. 

This build is gated by our strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 Svelte Kit hydration warnings, and 100% green visual regression checks.

---

### 🛡️ Part 1: Global Visual Regulations (Non-Negotiable)

1. **The Spacing Law**: The gap between Bento cards and neighboring layout components must never drop below 12px or `clamp(12px, 2vw, 24px)` [cite: 636].
2. **The Margin Law**: All page templates must enforce a minimum of `tw-p-6` or `clamp(16px, 3vw, 24px)` outer boundary padding [cite: 636]. Components must never sit directly flush against a navigation rail or sidebar [cite: 636].
3. **The min-width: 0 Law (Anti-Clipping)**: Every grid item or flex container rendering charts, telemetry metrics, or truncated descriptions must explicitly apply `tw-min-w-0` (or `min-width: 0`) to reset the DOM's default auto-minimum-width calculation and prevent element blowout [cite: 635].
4. **Fluid Font Scaling**: High-density numerical readouts and KPI values must use fluid clamp styling (e.g., `tw-text-[clamp(1.5rem,5vw,2.5rem)]`) to prevent text overlapping on tablet and mobile viewports [cite: 635].
5. **No Fixed Button Widths**: Action buttons must never use hardcoded widths (e.g., `tw-w-[120px]`). They must use horizontal padding constraints (e.g., `tw-px-4 tw-py-2`) and support text wrapping (`tw-whitespace-normal`) to accommodate varying text densities [cite: 637].

---

### 🎨 Part 2: Design Token & Visual Taxonomy Lock (Persona-Specific)

You must sweep the repository and synchronize all visual markers to match the official **Nuclear Americana Tech Noir** design system, scoped strictly to individual personas:

#### 1. Global Admin OS (Command Plane)
*   **Aesthetics**: Sharp, flat 90-degree corners [cite: 637]. Solid Navy Slate (`#0f172a`) layouts, pure Void Black (`#000000`) canvas backdrops, and 1px Structural Grey (`#334155`) borders [cite: 637]. Gamification chamfers, decorative clip-paths, and Action Gold accents are strictly prohibited [cite: 611, 637].
*   **Typography**: Statistical values, timestamps, and table listings must render in **Geist Mono** (`tw-font-mono`) to guarantee clean vertical tabular alignment [cite: 637].
*   **Modal Alignment**: Centered on the viewport. The `PurgeAccountModal.svelte` component must implement a full-viewport locked fixed container with an opaque black/90 backdrop blur (`tw-fixed tw-inset-0 tw-z-50 tw-bg-black/90 tw-backdrop-blur-md`) [cite: apply_ceo_launch_hotfixes-v2.py].

#### 2. Commissioner OS (State Federation Command)
*   **Aesthetics**: Flat, tactical SIEM panels, sharp 90-degree corners, and Navy Slate canvas [cite: 669]. Absolutely no gamification assets or Action Gold highlights are permitted [cite: 669].
*   **Typography**: Geist Mono (`tw-font-mono`) for all scores, bracket numbers, and federation compliance indicators [cite: 669].

#### 3. Director OS (B2B Revenue Engine)
*   **Aesthetics**: 12-column asymmetric Bento Grid (8-col Primary, 4-col Sidecar) [cite: 528]. Implement color-coded compliance status dots (Green for nominal, Amber for caution, Red for warning) on the organization lists [cite: 670]. Sharp 90-degree corners, Navy Slate panels, and 1px Structural Grey borders [cite: 670].
*   **Typography**: Geist Mono (`tw-font-mono`) for all subscription billing seats, price tags, and seat telemetry counters [cite: 670].

#### 4. Coach OS (The Sideline SIEM)
*   **Aesthetics**: Flat 90-degree panels, Navy Slate backgrounds, and 1px Structural Grey borders [cite: 668]. SVG Tactical Arena canvas scaled dynamically via `matrixTransform(getScreenCTM().inverse())` to prevent offset cursor drift [cite: 613]. No gamification chamfers or Action Gold highlights permitted [cite: 668].
*   **Typography**: Geist Mono (`tw-font-mono`) for physical player metrics and workout logs [cite: 668].

#### 5. Player OS (The Dopamine Engine)
*   **Aesthetics**: Aggressive 40% Void Black (`#000000`) canvas, chamfered outer visual clip-paths, and SVG Vanguard Prism radar charts [cite: 614, 672]. Enforce the official Vanguard chamfered clip-path on the outer boundaries of all specialty cards [cite: 643]:
    `style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);"` [cite: 643]
    and strip out standard rounded corner classes [cite: 643]. Restrict the viewport to exactly **one** Action Gold (`#fbbf24`) primary CTA button [cite: 614, 672].
*   **Typography**: Geist Mono for all raw level numbers and XP progression stats [cite: 614].

#### 6. Parent OS (Compliance Shield)
*   **Aesthetics**: Calm, flat trust aesthetic utilizing standard 24px border radii (`tw-rounded-[24px]`) for the outer card panels [cite: 615, 671]. Lockout alerts, countdown clocks, and "Car Ride Home Protocol" countdowns must be styled exclusively in Atompunk Amber (`#f59e0b` / `tw-text-[#f59e0b]`) [cite: 615, 671].
*   **Typography**: Geist Mono for numerical timer countdowns, Switzer for standard copy [cite: 615, 671].

#### 7. Fan & Recruiter OS (Broadcast & Recruitment Gateways)
*   **Aesthetics**: High-contrast broadcast overlays supporting transparent SVG particle streams for live fan interaction emojis [cite: 616].
*   **Typography**: Geist Mono for the recruiter’s paginated search results [cite: 616].

#### 8. Tutoring Marketplace (Direct-to-Parent Network)
*   **Aesthetics**: Responsive 12-column Bento-grid directory cards styled in Void Black and Navy Slate with 1px Structural Grey borders [cite: 690, 694].
*   **Typography**: Geist Mono for booking price tags, dates, and times [cite: 690].

---

### 📋 Part 3: The Universal Table Standard

Every datatable across the Admin, Commissioner, Director, and Recruiter views must be restructured to strictly match this layout blueprint:
1. **Container Wrapper**: Nested cleanly inside a Solid Navy Slate card with a 1px Structural Grey border (`tw-border-[#334155]`) and horizontal scrolling active (`tw-w-full tw-overflow-x-auto`).
2. **Background Opacity**: Set to an opaque Navy Slate background to prevent underlying text halation or background canvas bleeding.
3. **Column Structure**: Apply `tw-font-mono` and `tw-text-sm` to all telemetry and financial columns to ensure column metrics never wrap awkwardly.

---

### 🚀 Part 4: Verification & Autonomous Compilation

1. Run Svelte compilation diagnostics: `pnpm run check && pnpm run build`.
2. Boot local emulators and execute visual regression tests: `npx Playwright test`.
3. If layout drift or margin collapses are detected, you must autonomously modify Svelte templates until the snapshots are 100% compliant.
4. Do not commit or open a Pull Request until the test suite is 100% green.
