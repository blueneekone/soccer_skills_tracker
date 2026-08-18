---
name: microscopic-visual-autofix-v6-unattended
description: REHEALED UNATTENDED MASTER UI STABILIZATION WORKFLOW (v6.0) - Enforces 12-column Bento Grids, cognitive load optimization, and F/Z pattern hierarchies.
---

# 🎨 SSTracker Master Visual Healing & Styling Lock (v6.0 Unattended)

@jules, act as our joint Lead Frontend & UX Architect and Chief Design Officer (CDO). You are instructed to execute a complete visual stabilization across all Svelte 5 layout components. Your goal is to eliminate layout drift, padding leaks, responsive grid collapses, and text clipping across every persona dashboard.

This build is gated by our strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 Svelte Kit hydration warnings, and 100% green Playwright visual checks.

---

### 🛡️ Part 1: Cognitive Load & Hierarchy Regulations (UX-Pilot AA-Standard)

1.  **Cognitive Load Optimization (John Sweller’s Law)**: Minimize extraneous load by carving out ample, clean whitespace divisions (minimum 12px or `clamp(12px, 2vw, 24px)` between Bento cards). Forbid the "data eyeball attack" (dense walls of unstructured text) by grouping related telemetry blocks cleanly.
2.  **F and Z Pattern Information Scopes (Nielsen Norman Group)**: Structure layouts to align with natural eye-scanning paths:
    *   **Top Row**: Primary KPIs and global decision metrics (conversion, churn, seats limit).
    *   **Middle Band**: Trend charts, sparklines, and time-series vectors.
    *   **Bottom Section**: Detailed, granular tables for users who need to drill deeper.
3.  **The Spacing & Margin Law**: All page templates must enforce a minimum of `tw-p-6` or `clamp(16px, 3vw, 24px)` outer boundary padding. Under no circumstances should any card or grid container sit flush against a navigation rail or sidebar.
4.  **The min-width: 0 Law (Anti-Clipping)**: Every parent flex container and grid item containing text metrics, charts, or labels must explicitly apply `tw-min-w-0` (or `min-width: 0`) to reset the browser's default auto-minimum-width calculation and prevent text blowout.
5.  **Fluid Font & Auto-Scaling Buttons**: Giant KPI values must use fluid clamp styles (e.g., `tw-text-[clamp(1.5rem,5vw,2.5rem)]`) to shrink gracefully. Action buttons must reject fixed-pixel widths (such as `tw-w-[120px]`) and use padding (e.g., `tw-px-4 tw-py-2`) with wrapping allowed to accommodate translation lengths.

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

### 📋 Part 3: The Universal Table Standard & Accessible Fallbacks

Every datatable across the Admin, Commissioner, Director, and Recruiter views must be restructured to strictly match this layout blueprint:
1. **Container Wrapper**: Nested cleanly inside a Solid Navy Slate card with a 1px Structural Grey border (`tw-border-[#334155]`) and horizontal scrolling active (`tw-w-full tw-overflow-x-auto`).
2. **Background Opacity**: Set to an opaque Navy Slate background to prevent underlying text halation or background canvas bleeding.
3. **Column Structure**: Apply `tw-font-mono` and `tw-text-sm` to all telemetry and financial columns to ensure column metrics never wrap awkwardly.
4. **Accessible Visual Cues (WCAG 2.2 AA)**: Add text labels and shape indicators alongside any color-coded statuses (such as green/red alerts) so that users with red/green colorblindness can easily interpret the telemetry.
5. **Hydration & Loading Feedbacks**: Integrate structured skeleton screens mimicking the final DOM structure during initial SvelteKit pre-render hydration phases. For unhandled errors, display plain, actionable explanations with immediate retry buttons.

---

### 🚀 Part 4: Verification & Deployment Loop

1. Run Svelte compilation diagnostics: `pnpm run check && pnpm run build`.
2. Boot local emulators and execute visual regression tests: `npx Playwright test`.
3. If layout drift or margin collapses are detected, you must run your internal Critic-Augmented refactoring loop to modify Svelte templates until the snapshots are 100% compliant.
4. Do not commit or open a Pull Request until the test suite is 100% green.
