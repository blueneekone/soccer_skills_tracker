---
name: jules-visual-stabilization
description: Headless visual healing and design system lock for all 8 platform personas.
---

# 🎨 SSTracker Enterprise Visual Standardization & Layout Healing (CRO/CDO)

@jules, act as our Lead Frontend & UX Architect and Chief Design Officer. You are instructed to execute a complete visual stabilization across all Svelte 5 layout components. Your goal is to eliminate all padding inconsistencies, layout overlaps, text clipping, and responsive grid squishing across every persona interface.

This build is gated by our strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 Svelte Kit hydration warnings, and 100% green visual regression checks.

---

### 🛡️ Part 1: Global Visual Regulations (Non-Negotiable)

1. **The Spacing Law**: The gap between Bento cards and neighboring layout components must never drop below 12px or `clamp(12px, 2vw, 24px)`.
2. **The Margin Law**: All page templates must enforce a minimum of `tw-p-6` or `clamp(16px, 3vw, 24px)` outer boundary padding. Components must never sit directly flush against a navigation rail or sidebar.
3. **The min-width: 0 Law (Anti-Clipping)**: Every grid item or flex container rendering charts, telemetry metrics, or truncated descriptions must explicitly apply `tw-min-w-0` (or `min-width: 0`) to reset the DOM's default auto-minimum-width calculation and prevent element blowout.
4. **Fluid Font Scaling**: High-density numerical readouts and KPI values must use fluid clamp styling (e.g., `tw-text-[clamp(1.5rem,5vw,2.5rem)]`) to prevent text overlapping on tablet and mobile viewports.
5. **No Fixed Button Widths**: Action buttons must never use hardcoded widths (e.g., `tw-w-[120px]`). They must use horizontal padding constraints (e.g., `tw-px-4 tw-py-2`) and support text wrapping (`tw-whitespace-normal`) to accommodate varying text densities.

---

### 🎨 Part 2: Design Token & Visual Taxonomy Lock

You must sweep the repository and synchronize all visual markers to match the official **Nuclear Americana Tech Noir** design system:

*   **Void Canvas Density**: Ensure the main application background maintains a "Void Density" of >= 40% using pure Void Black (`#000000`). All layout panels must be styled with Navy Slate (`#0f172a`) and 1px Structural Grey (`#334155`) borders.
*   **The Accent Color Palette**:
    *   **Telemetry Highlights & Streak Meters**: Strictly styled using official Amber (`#fbbf24`). Replace any legacy "radioactive yellow" (`#daff0a`) or default Tailwind colors.
    *   **Technical Identifiers & CLI Logs**: Enforced using Data Cyan (`#14b8a6`) with `tw-font-mono`.
    *   **Primary Action CTAs**: Gated to exactly **one** Action Gold (`#fbbf24`) button per viewport. Secondary buttons must use outline layouts.
*   **Typography**: All technical data, timestamps, coordinates, scoreboards, and numerical counts must render in **Geist Mono** (`tw-font-mono`) to guarantee clean vertical tabular alignment. Switzer (`tw-font-sans`) governs all narrative copywriting.
*   **The Corner Split Rule**:
    *   **Admin, Commissioner, Coach, and Director Dashboards (Tactical SIEM)**: Gamification chamfers and decorative clip-paths are strictly prohibited. Every widget card and button must enforce sharp, flat 90-degree corners.
    *   **Player and Parent Portals (Gamified HUD)**: Enforce the official Vanguard chamfered clip-path on the outer boundary of all specialty panels:
        `style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);"` and remove standard rounded corner classes.

---

### 📋 Part 3: The Universal Table Standard

Every datatable across the Admin, Commissioner, Director, and Recruiter views must be restructured to strictly match this layout blueprint:
1. **Container Wrapper**: Nested cleanly inside a Solid Navy Slate card with a 1px Structural Grey border (`tw-border-[#334155]`) and horizontal scrolling active (`tw-w-full tw-overflow-x-auto`).
2. **Background Opacity**: Set to an opaque Navy Slate background to prevent underlying text halation or background canvas bleeding.
3. **Column Structure**: Apply `tw-font-mono` and `tw-text-sm` to all telemetry and financial columns to ensure column metrics never wrap awkwardly.

---

### 🚀 Part 4: Verification & Deployment Loop

1. Run Svelte compilation diagnostics: `pnpm run check && pnpm run build`.
2. Boot local emulators and execute visual regression tests: `npx Playwright test`.
3. If layout drift or margin collapses are detected, you must run your internal Critic-Augmented refactoring loop to modify Svelte templates until the snapshots are 100% compliant.
4. Do not commit or open a Pull Request until the test suite is 100% green.
